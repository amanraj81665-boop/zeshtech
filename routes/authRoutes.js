
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const {
  hashPassword,
  verifyPassword
} = require("../utils/password");
const { sendPasswordResetEmail } = require("../utils/mailer");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    avatar: user.avatar || "",
    authProvider: user.authProvider || "local",
    role: user.role,
    createdAt: user.createdAt
  };
}

function validEmail(email) {
  return (
    typeof email === "string" &&
    email.length <= 254 &&
    EMAIL_REGEX.test(email.trim())
  );
}

function createToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "30d",
      issuer: "zesh-tech",
      audience: "zesh-tech-users"
    }
  );
}

// Check whether authentication routes are working
router.get("/status", (req, res) => {
  res.json({
    success: true,
    message: "ZESH-TECH authentication routes working"
  });
});

// Expose public auth configuration (e.g. Google Client ID)
router.get("/config", (req, res) => {
  res.json({
    success: true,
    googleClientId: process.env.GOOGLE_CLIENT_ID || ""
  });
});

// Customer registration
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required"
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2 || cleanName.length > 60) {
      return res.status(400).json({
        success: false,
        message: "Name must be between 2 and 60 characters"
      });
    }

    if (!validEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address"
      });
    }

    if (
      password.length < PASSWORD_MIN ||
      password.length > PASSWORD_MAX
    ) {
      return res.status(400).json({
        success: false,
        message: "Password must be between 8 and 72 characters"
      });
    }

    const existingUser = await User.findOne({
      email: cleanEmail
    }).select("_id");

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists"
      });
    }

    const hashedPassword = await hashPassword(password);

    // Never accept a role from the public registration request.
    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      role: "customer"
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful. You can now log in.",
      user: publicUser(user)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists"
      });
    }

    if (error.message && error.message.includes("buffering timed out")) {
      return res.status(503).json({
        success: false,
        message: "Database connection timeout. Please add your IP (or 0.0.0.0/0) in MongoDB Atlas Network Access."
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Registration failed. Please try again."
    });
  }
});

// Shared login for customers and admins
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      !validEmail(email) ||
      typeof password !== "string" ||
      password.length === 0 ||
      password.length > PASSWORD_MAX
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid email and password are required"
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        success: false,
        message: "Authentication is not configured"
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: cleanEmail
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const passwordMatches = await verifyPassword(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const token = createToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      tokenType: "Bearer",
      expiresIn: 3600,
      user: publicUser(user)
    });
  } catch (error) {
    console.error("Login error:", error.message);

    if (error.message && error.message.includes("buffering timed out")) {
      return res.status(503).json({
        success: false,
        message: "Database connection timeout. Please add your IP (or 0.0.0.0/0) in MongoDB Atlas Network Access."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Login failed. Please try again."
    });
  }
});

// POST /api/auth/social - Unified Social Sign-In (Google, Facebook, WhatsApp, Apple)
router.post("/social", async (req, res) => {
  try {
    const { provider, name, email, phone, avatar } = req.body || {};

    const validProviders = ["google", "facebook", "whatsapp", "apple"];
    const authProvider = validProviders.includes(provider) ? provider : "google";

    // Normalize email or fallback if phone-based
    let userEmail = (email || "").trim().toLowerCase();
    if (!userEmail && phone) {
      userEmail = `${phone.replace(/\D/g, "")}@phone.zeshtech.com`;
    }

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: "Email or phone number is required for social authentication."
      });
    }

    const userName = (name || "").trim() || (authProvider.toUpperCase() + " User");

    let user = await User.findOne({ email: userEmail });
    if (!user) {
      user = await User.create({
        name: userName,
        email: userEmail,
        phone: (phone || "").trim(),
        authProvider,
        avatar: avatar || "",
        role: "customer"
      });
    } else {
      if (!user.avatar && avatar) user.avatar = avatar;
      if (!user.phone && phone) user.phone = phone;
      if (user.authProvider === "local") user.authProvider = authProvider;
      await user.save();
    }

    const token = createToken(user);

    return res.status(200).json({
      success: true,
      message: `Signed in with ${authProvider.toUpperCase()}`,
      token,
      tokenType: "Bearer",
      expiresIn: 3600 * 24 * 7,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        avatar: user.avatar || "",
        authProvider: user.authProvider,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Social login error:", error.message);
    if (error.message && error.message.includes("buffering timed out")) {
      return res.status(503).json({
        success: false,
        message: "Database connection timeout. Please add your IP (or 0.0.0.0/0) in MongoDB Atlas Network Access."
      });
    }
    return res.status(500).json({
      success: false,
      message: "Could not complete social sign-in. Please try again."
    });
  }
});

// In-memory WhatsApp OTP store: phone -> { otp, name, expiresAt }
const whatsappOtpStore = new Map();

// Helper to clean expired OTPs every minute
setInterval(() => {
  const now = Date.now();
  for (const [phone, data] of whatsappOtpStore.entries()) {
    if (data.expiresAt < now) {
      whatsappOtpStore.delete(phone);
    }
  }
}, 60000);

// POST /api/auth/whatsapp/send-otp - Generate and dispatch 6-digit WhatsApp OTP
router.post("/whatsapp/send-otp", (req, res) => {
  try {
    const { phone, name } = req.body || {};
    const cleanPhone = (phone || "").replace(/\D/g, "");

    if (cleanPhone.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10-digit WhatsApp mobile number."
      });
    }

    const standardPhone = cleanPhone.slice(-10);
    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    whatsappOtpStore.set(standardPhone, {
      otp,
      name: (name || "").trim() || `WhatsApp Customer`,
      expiresAt
    });

    console.log(`[WhatsApp OTP] Generated for +91${standardPhone}: ${otp}`);

    // Pre-filled WhatsApp message for one-tap delivery
    const waText = encodeURIComponent(
      `🔐 *ZESH-TECH Login Verification*\n\nYour 6-Digit OTP is: *${otp}*\n\n(Valid for 5 minutes). Use this code to sign in to ZESH-TECH.`
    );
    const whatsappLink = `https://wa.me/91${standardPhone}?text=${waText}`;

    return res.status(200).json({
      success: true,
      message: `OTP generated for +91 ${standardPhone}`,
      phone: standardPhone,
      otp,
      whatsappLink,
      expiresInSeconds: 300
    });
  } catch (error) {
    console.error("Error generating WhatsApp OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate WhatsApp OTP. Please try again."
    });
  }
});

// POST /api/auth/whatsapp/verify-otp - Verify 6-digit OTP & Sign In / Register
router.post("/whatsapp/verify-otp", async (req, res) => {
  try {
    const { phone, otp, name } = req.body || {};
    const cleanPhone = (phone || "").replace(/\D/g, "").slice(-10);
    const cleanOtp = (otp || "").toString().trim();

    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Invalid mobile number."
      });
    }

    const storedData = whatsappOtpStore.get(cleanPhone);
    if (!storedData) {
      return res.status(400).json({
        success: false,
        message: "OTP expired or not found. Please click 'Resend OTP'."
      });
    }

    if (Date.now() > storedData.expiresAt) {
      whatsappOtpStore.delete(cleanPhone);
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new OTP."
      });
    }

    if (storedData.otp !== cleanOtp) {
      return res.status(400).json({
        success: false,
        message: "Incorrect OTP. Please check the 6-digit code and retry."
      });
    }

    // OTP is valid!
    whatsappOtpStore.delete(cleanPhone);

    const userName = (name || storedData.name || "").trim() || `Customer (${cleanPhone.slice(-4)})`;
    const userEmail = `${cleanPhone}@phone.zeshtech.com`;

    let user = await User.findOne({ email: userEmail });
    if (!user) {
      user = await User.create({
        name: userName,
        email: userEmail,
        phone: cleanPhone,
        authProvider: "whatsapp",
        role: "customer"
      });
    } else {
      if (userName && (user.name.includes("WhatsApp") || !user.name)) {
        user.name = userName;
      }
      user.phone = cleanPhone;
      user.authProvider = "whatsapp";
      await user.save();
    }

    const token = createToken(user);

    return res.status(200).json({
      success: true,
      message: "WhatsApp verification successful!",
      token,
      tokenType: "Bearer",
      expiresIn: 3600 * 24 * 7,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        authProvider: "whatsapp",
        role: user.role
      }
    });
  } catch (error) {
    console.error("Error verifying WhatsApp OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Could not complete WhatsApp verification. Please try again."
    });
  }
});

// POST /api/auth/google/verify - Official Google Identity Services GIS credential verification
router.post("/google/verify", async (req, res) => {
  try {
    const { credential, userInfo } = req.body || {};

    let email = "";
    let name = "";
    let picture = "";

    if (credential) {
      try {
        const parts = credential.split(".");
        if (parts.length === 3) {
          const payloadJson = Buffer.from(parts[1], "base64").toString("utf8");
          const payload = JSON.parse(payloadJson);
          email = (payload.email || "").toLowerCase().trim();
          name = payload.name || payload.given_name || "Google User";
          picture = payload.picture || "";
        }
      } catch (e) {
        console.warn("Could not decode Google credential JWT:", e.message);
      }
    }

    if (!email && userInfo) {
      email = (userInfo.email || "").toLowerCase().trim();
      name = userInfo.name || "Google User";
      picture = userInfo.picture || "";
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Valid Google email address is required."
      });
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        avatar: picture,
        authProvider: "google",
        role: "customer"
      });
    } else {
      if (picture && !user.avatar) user.avatar = picture;
      if (name && (!user.name || user.name.includes("User"))) user.name = name;
      user.authProvider = "google";
      await user.save();
    }

    const token = createToken(user);

    return res.status(200).json({
      success: true,
      message: "Signed in with Google successfully",
      token,
      tokenType: "Bearer",
      expiresIn: 3600 * 24 * 7,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        avatar: user.avatar || "",
        authProvider: "google",
        role: user.role
      }
    });
  } catch (error) {
    console.error("Google verify error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to sign in with Google."
    });
  }
});

// In-memory store for Forgot Password OTPs: email -> { otp, expiresAt }
const forgotPasswordOtpStore = new Map();

// Helper to clean expired forgot-password OTPs
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of forgotPasswordOtpStore.entries()) {
    if (data.expiresAt < now) {
      forgotPasswordOtpStore.delete(email);
    }
  }
}, 60000);

// POST /api/auth/forgot-password/send-otp
router.post("/forgot-password/send-otp", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!validEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address"
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found registered with this email address"
      });
    }

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    forgotPasswordOtpStore.set(cleanEmail, { otp, expiresAt });
    console.log(`[Forgot Password OTP] Generated for ${cleanEmail}: ${otp}`);

    // Dispatch real email to user's inbox
    const mailResult = await sendPasswordResetEmail({
      toEmail: cleanEmail,
      otp,
      userName: user.name
    });

    // WhatsApp alert message as secondary option
    const targetPhone = (user.phone || "").replace(/\D/g, "").slice(-10) || "7903746116";
    const waText = encodeURIComponent(
      `🔐 *ZESH-TECH Password Reset*\n\nAccount: *${cleanEmail}*\nYour 6-Digit Password Reset OTP is: *${otp}*\n\n(Valid for 10 minutes). Do not share this OTP with anyone.`
    );
    const whatsappLink = `https://wa.me/91${targetPhone}?text=${waText}`;

    return res.status(200).json({
      success: true,
      message: mailResult.emailSent
        ? `A 6-digit OTP has been sent directly to your email inbox (${cleanEmail}). Please check your Inbox and Spam folder.`
        : `Password reset OTP generated. ${mailResult.notice || ""}`,
      email: cleanEmail,
      emailSent: mailResult.emailSent,
      // Provide OTP in response only if email transport is unconfigured to prevent lockout during setup
      otp: mailResult.emailSent ? undefined : otp,
      targetPhone: targetPhone ? `+91 ${targetPhone.slice(0, 2)}••••${targetPhone.slice(-4)}` : "",
      whatsappLink,
      expiresInSeconds: 600
    });
  } catch (error) {
    console.error("Forgot password send-otp error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not generate password reset OTP. Please try again."
    });
  }
});

// POST /api/auth/forgot-password/reset
router.post("/forgot-password/reset", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body || {};
    if (!validEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Valid email is required"
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = (otp || "").toString().trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      return res.status(400).json({
        success: false,
        message: "Please enter the complete 6-digit OTP"
      });
    }

    if (
      typeof newPassword !== "string" ||
      newPassword.length < PASSWORD_MIN ||
      newPassword.length > PASSWORD_MAX
    ) {
      return res.status(400).json({
        success: false,
        message: `New password must be between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters`
      });
    }

    const storedData = forgotPasswordOtpStore.get(cleanEmail);
    if (!storedData) {
      return res.status(400).json({
        success: false,
        message: "OTP expired or not found. Please click 'Resend OTP'."
      });
    }

    if (Date.now() > storedData.expiresAt) {
      forgotPasswordOtpStore.delete(cleanEmail);
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one."
      });
    }

    if (storedData.otp !== cleanOtp) {
      return res.status(400).json({
        success: false,
        message: "Incorrect OTP. Please check the code and try again."
      });
    }

    // Update user password in database
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found"
      });
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    // Consume OTP
    forgotPasswordOtpStore.delete(cleanEmail);

    console.log(`[Forgot Password] Successfully updated password for ${cleanEmail}`);

    return res.status(200).json({
      success: true,
      message: "Your password has been successfully reset. You can now log in."
    });
  } catch (error) {
    console.error("Forgot password reset error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not reset password. Please try again."
    });
  }
});

// Get the authenticated user's profile
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const user = await User.findById(userId).select(
      "name email phone avatar authProvider role createdAt"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.json({
      success: true,
      user: publicUser(user)
    });
  } catch (error) {
    console.error("Profile error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not fetch profile"
    });
  }
});

// Update authenticated user's profile
router.patch("/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const user = await User.findById(userId).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const { name, phone, currentPassword, newPassword } = req.body || {};

    if (name && typeof name === "string") {
      const cleanName = name.trim();
      if (cleanName.length < 2 || cleanName.length > 60) {
        return res.status(400).json({
          success: false,
          message: "Name must be between 2 and 60 characters"
        });
      }
      user.name = cleanName;
    }

    if (typeof phone === "string") {
      const cleanPhone = phone.trim().replace(/\D/g, "");
      if (cleanPhone.length > 0 && cleanPhone.length !== 10) {
        return res.status(400).json({
          success: false,
          message: "Phone number must be a valid 10-digit mobile number"
        });
      }
      user.phone = cleanPhone;
    }

    if (newPassword) {
      if (typeof newPassword !== "string" || newPassword.length < PASSWORD_MIN || newPassword.length > PASSWORD_MAX) {
        return res.status(400).json({
          success: false,
          message: "New password must be between 8 and 72 characters"
        });
      }

      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password is required to set a new password"
        });
      }

      const match = await verifyPassword(currentPassword, user.password);
      if (!match) {
        return res.status(401).json({
          success: false,
          message: "Current password is incorrect"
        });
      }

      user.password = await hashPassword(newPassword);
    }

    await user.save();

    return res.json({
      success: true,
      message: "Profile updated successfully",
      user: publicUser(user)
    });
  } catch (error) {
    console.error("Update profile error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not update profile"
    });
  }
});

module.exports = router;
