
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const {
  hashPassword,
  verifyPassword
} = require("../utils/password");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
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
      expiresIn: "1h",
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
      "name email role createdAt"
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

    const { name, currentPassword, newPassword } = req.body || {};

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
