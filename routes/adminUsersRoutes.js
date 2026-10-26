
const express = require("express");
const mongoose = require("mongoose");

const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Verify that the logged-in user is currently an admin.
async function requireAdmin(req, res, next) {
  try {
    const admin = await User.findById(req.user?.userId).select("role");

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin permission required"
      });
    }

    req.currentAdminId = admin._id.toString();
    return next();
  } catch (error) {
    console.error("Admin verification error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not verify admin permission"
    });
  }
}

// All routes below require authentication AND admin permission.
router.use(authMiddleware, requireAdmin);

// GET /api/admin/users
// List customers and admins without exposing password hashes.
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({})
      .select("name email role createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      users: users.map((user) => ({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }))
    });
  } catch (error) {
    console.error("Load users error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not load accounts"
    });
  }
});

// PATCH /api/admin/users/:id/role
// Change a user's role.
router.patch("/users/:id/role", async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    if (!["customer", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be customer or admin"
      });
    }

    if (id === req.currentAdminId) {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own role"
      });
    }

    const target = await User.findById(id).select(
      "name email role createdAt"
    );

    if (!target) {
      return res.status(404).json({
        success: false,
        message: "Account not found"
      });
    }

    // Never allow the last admin to lose admin access.
    if (target.role === "admin" && role === "customer") {
      const adminCount = await User.countDocuments({ role: "admin" });

      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: "The last admin cannot be demoted"
        });
      }
    }

    target.role = role;
    await target.save();

    return res.json({
      success: true,
      message: "User role updated successfully",
      user: {
        id: target._id.toString(),
        name: target.name,
        email: target.email,
        role: target.role,
        createdAt: target.createdAt
      }
    });
  } catch (error) {
    console.error("Update role error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not update user role"
    });
  }
});

// DELETE /api/admin/users/:id
// Only customer accounts can be deleted from this route.
router.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    const customer = await User.findById(id).select("role");

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Account not found"
      });
    }

    if (customer.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Only customer accounts can be deleted"
      });
    }

    await customer.deleteOne();

    return res.json({
      success: true,
      message: "Customer deleted successfully"
    });
  } catch (error) {
    console.error("Delete customer error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not delete customer"
    });
  }
});

module.exports = router;
