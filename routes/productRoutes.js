
"use strict";

const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const StockNotification = require("../models/StockNotification");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Prevent stale HTTP caching for all product endpoints (ensures real-time price & stock updates)
router.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// Only authenticated admins can manage inventory.
function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin permission required"
    });
  }

  next();
}

// Escape special regex characters in search queries.
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function validObjectId(id) {
  return mongoose.isValidObjectId(id);
}

function handleError(res, error, operation) {
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0];

    return res.status(409).json({
      success: false,
      message: `${field || "Product field"} already exists`
    });
  }

  if (
    error.name === "ValidationError" ||
    error.name === "CastError"
  ) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  if (
    error.name === "MongooseError" &&
    error.message &&
    error.message.includes("buffering timed out")
  ) {
    return res.status(503).json({
      success: false,
      message: "Database connection timed out. Please ensure your IP (223.228.146.160) or 0.0.0.0/0 is whitelisted in MongoDB Atlas Network Access."
    });
  }

  console.error(`${operation}:`, error.message);

  return res.status(500).json({
    success: false,
    message: error.message || "An internal server error occurred"
  });
}

const editableFields = [
  "name",
  "sku",
  "barcode",
  "serialNumber",
  "imei1",
  "imei2",
  "imeiRecords",
  "category",
  "brand",
  "model",
  "ram",
  "storage",
  "color",
  "variants",
  "purchasePrice",
  "sellingPrice",
  "stockQuantity",
  "lowStockThreshold",
  "description",
  "imageUrl",
  "images",
  "isActive"
];


// Collect every IMEI submitted through the admin product form.
function collectImeis(data) {
  const values = [];
  const add = value => {
    const normalized = String(value || "").trim().toUpperCase();
    if (normalized) values.push(normalized);
  };

  add(data.imei1);
  add(data.imei2);
  if (Array.isArray(data.imeiRecords)) {
    for (const record of data.imeiRecords) {
      add(record?.imei1);
      add(record?.imei2);
    }
  }
  return values;
}

// Reject duplicate IMEIs within this payload and against every other product.
// The database query checks legacy top-level fields and per-unit IMEI records.
async function findImeiConflict(data, excludeProductId = null) {
  const imeis = collectImeis(data);
  if (!imeis.length) return null;

  const seen = new Set();
  const duplicateInPayload = imeis.find(value => {
    if (seen.has(value)) return true;
    seen.add(value);
    return false;
  });

  if (duplicateInPayload) {
    return { imei: duplicateInPayload, reason: "repeated in this product" };
  }

  const patterns = imeis.map(value =>
    new RegExp("^\\\\s*" + value.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\function pickFields(body, fields) {") + "\\\\s*$", "i")
  );
  const filter = {
    $or: [
      { imei1: { $in: patterns } },
      { imei2: { $in: patterns } },
      { "imeiRecords.imei1": { $in: patterns } },
      { "imeiRecords.imei2": { $in: patterns } }
    ]
  };
  if (excludeProductId) filter._id = { $ne: excludeProductId };

  const conflict = await Product.findOne(filter)
    .select("name sku imei1 imei2 imeiRecords.imei1 imeiRecords.imei2")
    .lean();

  if (!conflict) return null;

  const allExisting = [
    conflict.imei1,
    conflict.imei2,
    ...(conflict.imeiRecords || []).flatMap(record => [record.imei1, record.imei2])
  ].map(value => String(value || "").trim().toUpperCase());

  return {
    imei: imeis.find(value => allExisting.includes(value)) || imeis[0],
    productName: conflict.name,
    sku: conflict.sku
  };
}

function pickFields(body, fields) {
  const result = {};

  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      result[field] = body[field];
    }
  }

  return result;
}

// GET /api/products
// Public product listing. Never expose purchase prices or internal codes.
router.get("/", async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);

    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "page must be >= 1 and limit must be between 1 and 100"
      });
    }

    const filter = { isActive: true };

    if (req.query.category) {
      filter.category = String(req.query.category);
    }

    if (req.query.brand) {
      filter.brand = String(req.query.brand);
    }

    if (req.query.search !== undefined) {
      const search = String(req.query.search).trim();

      if (!search || search.length > 100) {
        return res.status(400).json({
          success: false,
          message: "Search query must be between 1 and 100 characters"
        });
      }

      const pattern = new RegExp(escapeRegex(search), "i");

      filter.$or = [
        { name: pattern },
        { brand: pattern },
        { model: pattern },
        { category: pattern },
        { description: pattern }
      ];
    }

    const sortOptions = {
      name: { name: 1 },
      priceLow: { sellingPrice: 1 },
      priceHigh: { sellingPrice: -1 },
      newest: { createdAt: -1 }
    };

    const sort = sortOptions[req.query.sort] || sortOptions.newest;
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .select("-purchasePrice -sku -barcode -imei1 -imei2 -imeiRecords -serialNumber")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),

      Product.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    return handleError(res, error, "List products failed");
  }
});

// GET /api/products/low-stock
// Admin only.
router.get("/low-stock", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const products = await Product.find({
      isActive: true,
      $expr: {
        $lte: ["$stockQuantity", "$lowStockThreshold"]
      }
    })
      .sort({ stockQuantity: 1, name: 1 })
      .limit(200);

    return res.json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    return handleError(res, error, "Low-stock report failed");
  }
});

// GET /api/products/inventory-stats
// Admin only: comprehensive valuation & stock health
router.get("/inventory-stats", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const [aggregateResult, categoryBreakdown] = await Promise.all([
      Product.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalItems: { $sum: 1 },
            totalStockUnits: { $sum: "$stockQuantity" },
            costValuation: { $sum: { $multiply: ["$purchasePrice", "$stockQuantity"] } },
            retailValuation: { $sum: { $multiply: ["$sellingPrice", "$stockQuantity"] } },
            outOfStockCount: {
              $sum: { $cond: [{ $lte: ["$stockQuantity", 0] }, 1, 0] }
            },
            lowStockCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gt: ["$stockQuantity", 0] },
                      { $lte: ["$stockQuantity", "$lowStockThreshold"] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),

      Product.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
            stockUnits: { $sum: "$stockQuantity" },
            valuation: { $sum: { $multiply: ["$sellingPrice", "$stockQuantity"] } }
          }
        },
        { $sort: { valuation: -1 } }
      ])
    ]);

    const stats = aggregateResult[0] || {
      totalItems: 0,
      totalStockUnits: 0,
      costValuation: 0,
      retailValuation: 0,
      outOfStockCount: 0,
      lowStockCount: 0
    };

    const potentialProfit = Math.max(0, stats.retailValuation - stats.costValuation);

    return res.json({
      success: true,
      stats: {
        ...stats,
        potentialProfit,
        categoryBreakdown
      }
    });
  } catch (error) {
    return handleError(res, error, "Inventory stats failed");
  }
});

// GET /api/products/lookup/:code
// Internal SKU/barcode lookup. Admin only.
router.get("/lookup/:code", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const code = String(req.params.code).trim();

    if (!code || code.length > 100) {
      return res.status(400).json({
        success: false,
        message: "A valid SKU or barcode is required"
      });
    }

    const product = await Product.findOne({
      isActive: true,
      $or: [
        { sku: code.toUpperCase() },
        { barcode: code },
        { serialNumber: code },
        { imei1: code },
        { imei2: code },
        { "imeiRecords.imei1": code },
        { "imeiRecords.imei2": code },
        { "imeiRecords.serialNumber": code }
      ]
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.json({ success: true, product });
  } catch (error) {
    return handleError(res, error, "Product lookup failed");
  }
});

// GET /api/products/:id
// Public product details; hide purchase price and internal codes.
router.get("/:id", async (req, res) => {
  try {
    if (!validObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    const product = await Product.findOne({
      _id: req.params.id,
      isActive: true
    })
      .select("-purchasePrice -sku -barcode -imei1 -imei2 -imeiRecords -serialNumber")
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.json({ success: true, product });
  } catch (error) {
    return handleError(res, error, "Get product failed");
  }
});

// POST /api/products
// Admin only: create a product.
router.post("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const data = pickFields(req.body, editableFields);

    if (
      !data.name ||
      !data.sku ||
      !data.category ||
      data.sellingPrice === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, SKU, category and selling price are required"
      });
    }

    const imeiConflict = await findImeiConflict(data);
    if (imeiConflict) {
      return res.status(409).json({
        success: false,
        message: `IMEI ${imeiConflict.imei} is already assigned to another product or repeated in this product.`,
        conflict: imeiConflict
      });
    }

    const product = await Product.create(data);

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product
    });
  } catch (error) {
    return handleError(res, error, "Create product failed");
  }
});

// PATCH /api/products/:id
// Admin only: update product details, not stock quantity.
router.patch("/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    if (!validObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    const updates = pickFields(req.body, editableFields);

    // Stock changes must use the dedicated stock endpoint.
    delete updates.stockQuantity;

    if (Array.isArray(updates.imeiRecords) && updates.imeiRecords.length > 0) {
      const avail = updates.imeiRecords.find(r => r.status === "In Stock");
      if (avail) {
        updates.imei1 = avail.imei1 || "";
        updates.imei2 = avail.imei2 || "";
        if (avail.serialNumber) updates.serialNumber = avail.serialNumber;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No editable product fields supplied"
      });
    }

    const imeiConflict = await findImeiConflict(updates, req.params.id);
    if (imeiConflict) {
      return res.status(409).json({
        success: false,
        message: `IMEI ${imeiConflict.imei} is already assigned to another product or repeated in this product.`,
        conflict: imeiConflict
      });
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      { $set: updates },
      { returnDocument: "after", runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.json({
      success: true,
      message: "Product updated successfully",
      product
    });
  } catch (error) {
    return handleError(res, error, "Update product failed");
  }
});

// PATCH /api/products/:id/stock
// Admin only. Body: { "change": 5 } or { "change": -2 }.
router.patch("/:id/stock", authMiddleware, requireAdmin, async (req, res) => {
  try {
    if (!validObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    const rawChange = req.body.change;
    const change = typeof rawChange === "number" ? rawChange : parseInt(rawChange, 10);

    if (
      !Number.isSafeInteger(change) ||
      change === 0 ||
      Math.abs(change) > 1000000
    ) {
      return res.status(400).json({
        success: false,
        message: "change must be a non-zero whole number"
      });
    }

    const filter = {
      _id: req.params.id
    };

    if (change < 0) {
      filter.stockQuantity = { $gte: Math.abs(change) };
    } else {
      filter.stockQuantity = {
        $lte: Number.MAX_SAFE_INTEGER - change
      };
    }

    const product = await Product.findOneAndUpdate(
      filter,
      { $inc: { stockQuantity: change } },
      { new: true, returnDocument: "after", runValidators: true }
    );

    if (!product) {
      const existingProduct = await Product.findById(req.params.id).lean();

      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: "Product not found"
        });
      }

      if (change < 0 && (Number(existingProduct.stockQuantity) || 0) < Math.abs(change)) {
        return res.status(409).json({
          success: false,
          message: `Cannot reduce stock below 0. Current stock is ${Number(existingProduct.stockQuantity) || 0}.`
        });
      }

      return res.status(409).json({
        success: false,
        message: "Stock adjustment could not be applied"
      });
    }

      if (product.stockQuantity > 0) {
        StockNotification.updateMany(
          { product: product._id, notified: false },
          { $set: { notified: true, notifiedAt: new Date() } }
        ).exec().catch(err => console.warn("Stock notification update warning:", err.message));
      }

      return res.json({
        success: true,
        message: "Stock updated successfully",
        product,
        newStock: product.stockQuantity
      });
  } catch (error) {
    return handleError(res, error, "Update stock failed");
  }
});

// DELETE /api/products/:id
// Admin only: soft-delete the product.
router.delete("/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    if (!validObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      { $set: { isActive: false } },
      { returnDocument: "after", runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.json({
      success: true,
      message: "Product deactivated successfully",
      product
    });
  } catch (error) {
    return handleError(res, error, "Deactivate product failed");
  }
});

// POST /api/products/:id/notify-stock
// Public: Customer registers to be notified when sold out product comes back in stock
router.post("/:id/notify-stock", async (req, res) => {
  try {
    if (!validObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const rawPhone = String(req.body.phone || "").trim().replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(rawPhone)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10-digit Indian phone number (e.g. 9876543210)"
      });
    }

    const product = await Product.findById(req.params.id);
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const email = String(req.body.email || "").trim().toLowerCase();

    const record = await StockNotification.findOneAndUpdate(
      { product: product._id, phone: rawPhone, notified: false },
      {
        $set: {
          product: product._id,
          productName: product.name,
          productSku: product.sku || "",
          phone: rawPhone,
          email,
          notified: false
        }
      },
      { upsert: true, returnDocument: "after" }
    );

    return res.status(201).json({
      success: true,
      message: `Aapka alert register ho gaya! "${product.name}" ka stock aate hi aapko WhatsApp / SMS alert bhej diya jayega.`,
      notificationId: record._id
    });
  } catch (error) {
    return handleError(res, error, "Stock notification failed");
  }
});

// GET /api/products/stock-notifications/summary
// Admin only: view pending restock subscribers count & list
router.get("/stock-notifications/summary", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const list = await StockNotification.find({ notified: false })
      .populate("product", "name sku stockQuantity imageUrl")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: list.length,
      notifications: list
    });
  } catch (error) {
    return handleError(res, error, "Failed to fetch stock notifications");
  }
});

module.exports = router;
