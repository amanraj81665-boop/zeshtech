
const express = require("express");
const router = express.Router();
const TestRecord = require("../models/TestRecord");

// Save a dummy test record
router.post("/save", async (req, res) => {
  try {
    const record = await TestRecord.create({
      message: "ZESH-TECH database connection test"
    });

    res.status(201).json({
      success: true,
      message: "Test record saved successfully",
      record
    });
  } catch (error) {
    console.error("Test record save failed:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not save test record"
    });
  }
});

// Read test records
router.get("/records", async (req, res) => {
  try {
    const records = await TestRecord.find().sort({ createdAt: -1 }).limit(10);
    res.json({ success: true, records });
  } catch (error) {
    console.error("Test record read failed:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not read test records"
    });
  }
});

module.exports = router;
