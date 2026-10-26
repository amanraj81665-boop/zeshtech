const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required"
      });
    }

    const token = authHeader.slice(7);

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing from .env");

      return res.status(500).json({
        success: false,
        message: "Authentication is not configured"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "zesh-tech"
    });

    if (
      typeof decoded.userId !== "string" ||
      !mongoose.isValidObjectId(decoded.userId)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token"
      });
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token"
    });
  }
}

module.exports = authMiddleware;