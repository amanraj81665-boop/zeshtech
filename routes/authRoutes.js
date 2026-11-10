
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");

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
      expiresIn: "7d",
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
    const { name, email, password, phone } = req.body || {};

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
    const cleanPhone = (phone || "").toString().replace(/\D/g, "").slice(-10);

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

    if (cleanPhone && cleanPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10-digit mobile number"
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
      $or: [
        { email: cleanEmail },
        ...(cleanPhone ? [{ phone: cleanPhone }] : [])
      ]
    }).select("_id email phone");

    if (existingUser) {
      if (existingUser.email === cleanEmail) {
        return res.status(409).json({
          success: false,
          message: "An account with this email already exists"
        });
      }
      if (cleanPhone && existingUser.phone === cleanPhone) {
        return res.status(409).json({
          success: false,
          message: "An account with this mobile number already exists"
        });
      }
      return res.status(409).json({
        success: false,
        message: "An account with these details already exists"
      });
    }

    const hashedPassword = await hashPassword(password);

    // Never accept a role from the public registration request.
    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone || "",
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
        message: "An account with this email or mobile number already exists"
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

// Shared login for customers and admins (Supports Email OR 10-Digit Mobile Number)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const identifier = typeof email === "string" ? email.trim() : "";
    const cleanDigits = identifier.replace(/\D/g, "");
    const isPhoneLogin = cleanDigits.length === 10;
    const isEmailLogin = validEmail(identifier);

    if (
      (!isPhoneLogin && !isEmailLogin) ||
      typeof password !== "string" ||
      password.length === 0 ||
      password.length > PASSWORD_MAX
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid email or 10-digit mobile number and password are required"
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        success: false,
        message: "Authentication is not configured"
      });
    }

    let user;
    if (isPhoneLogin) {
      const cleanPhone = cleanDigits.slice(-10);
      user = await User.findOne({
        $or: [
          { phone: cleanPhone },
          { email: `${cleanPhone}@phone.zeshtech.com` }
        ]
      }).select("+password");
    } else {
      const cleanEmail = identifier.toLowerCase();
      user = await User.findOne({
        $or: [
          { email: cleanEmail },
          { phone: cleanEmail }
        ]
      }).select("+password");
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email/mobile number or password"
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
      expiresIn: 7 * 24 * 60 * 60,
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

// Social sign-in is disabled until provider tokens are verified server-side.
router.post("/social", (req, res) => res.status(501).json({ success: false, message: "This sign-in method is temporarily unavailable. Use email/password or verified Google sign-in." }));

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

// WhatsApp OTP delivery is not configured with a trusted Business API.
router.post("/whatsapp/send-otp", (req, res) => res.status(503).json({ success: false, message: "WhatsApp verification is temporarily unavailable. Please use email/password or Google sign-in." }));

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

    const cleanSocialPhone = (phone || "").replace(/\D/g, "").slice(-10);
    let user = await User.findOne({
      $or: [
        ...(cleanSocialPhone ? [{ phone: cleanSocialPhone }] : []),
        { email: userEmail }
      ]
    });
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

// Verify Google-signed ID tokens on the server; never decode untrusted JWT payloads.
router.post("/google/verify", async (req, res) => {
  try {
    const { credential } = req.body || {};
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId || typeof credential !== "string" || !credential) return res.status(503).json({ success: false, message: "Google sign-in is not configured." });
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload?.email || payload.email_verified !== true) return res.status(401).json({ success: false, message: "Google account email is not verified." });
    const email = payload.email.toLowerCase().trim();
    let user = await User.findOne({ email });
    if (!user) user = await User.create({ name: payload.name || payload.given_name || "Google User", email, avatar: payload.picture || "", authProvider: "google", role: "customer" });
    else { if (payload.picture && !user.avatar) user.avatar = payload.picture; if (user.authProvider === "local") user.authProvider = "google"; await user.save(); }
    const token = createToken(user);
    return res.status(200).json({ success: true, message: "Signed in with Google successfully", token, tokenType: "Bearer", expiresIn: 7 * 24 * 60 * 60, user: publicUser(user) });
  } catch (error) {
    console.error("Google verify error:", error.message);
    return res.status(401).json({ success: false, message: "Google sign-in verification failed." });
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
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    forgotPasswordOtpStore.set(cleanEmail, { otp, expiresAt });
    // Never log OTP values or return them to the browser.

    // Dispatch real email to user's inbox
    const mailResult = await sendPasswordResetEmail({
      toEmail: cleanEmail,
      otp,
      userName: user.name
    });

    if (!mailResult.emailSent) {
      forgotPasswordOtpStore.delete(cleanEmail);
      return res.status(503).json({ success: false, message: "Password reset email could not be sent. Please try again later." });
    }
    return res.status(200).json({ success: true, message: "A password reset code has been sent to your registered email address.", email: cleanEmail, emailSent: true, expiresInSeconds: 600 });
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
