"use strict";
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization;
    const token = header && header.startsWith("Bearer ") ? header.slice(7).trim() : (req.headers["x-access-token"] ? String(req.headers["x-access-token"]).trim() : "");
    if (!token) return res.status(401).json({ success: false, message: "Authentication token is required. Please log in." });
    if (!process.env.JWT_SECRET) return res.status(500).json({ success: false, message: "Authentication is not configured" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { issuer: "zesh-tech", audience: "zesh-tech-users" });
    if (typeof decoded.userId !== "string" || !mongoose.isValidObjectId(decoded.userId)) return res.status(401).json({ success: false, message: "Invalid authentication token" });
    const user = await User.findById(decoded.userId).select("_id role").lean();
    if (!user) return res.status(401).json({ success: false, message: "Account no longer exists. Please log in again." });
    req.user = { userId: user._id.toString(), role: user.role };
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired authentication token. Please log in again." });
  }
}
module.exports = authMiddleware;
