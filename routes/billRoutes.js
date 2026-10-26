"use strict";

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const billController = require("../controllers/billController");

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin permission required for POS billing operations"
    });
  }
  next();
}

// All bill routes require authentication and admin permission
router.use(authMiddleware, requireAdmin);

router.post("/", billController.createBill);
router.get("/stats", billController.getBillStats);
router.get("/recent-customers", billController.getRecentCustomers);
router.get("/", billController.getBills);
router.get("/:id", billController.getBillById);
router.patch("/:id/cancel", billController.cancelBill);

module.exports = router;
