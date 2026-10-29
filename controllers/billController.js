"use strict";

const mongoose = require("mongoose");
const Bill = require("../models/Bill");
const Product = require("../models/Product");

// Generate unique invoice number
function generateInvoiceNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  const time = String(Date.now()).slice(-4);
  return `ZT-INV-${year}${month}-${random}${time}`;
}

// POST /api/bills - Create a new POS retail bill
async function createBill(req, res) {
  try {
    const {
      customerName,
      customerPhone,
      customerAddress,
      paymentMode,
      financier,
      loanReference,
      imei1,
      imei2,
      modelNumber,
      serialNumber,
      bankName,
      cardRefNo,
      transactionId,
      items,
      discount = 0,
      taxRate = 0 // percent (e.g. 0 or 18)
    } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Bill must contain at least one product line item"
      });
    }

    const cleanCustomer = (customerName || "").trim() || "Walk-in Customer";
    const cleanPhone = (customerPhone || "").trim();
    const cleanAddress = (customerAddress || "").trim();
    const validModes = [
      "Cash", "UPI", "Card", "Bajaj Finance", "TVS Credit",
      "DMI Finance", "HDB Financial", "IDFC FIRST Bank", "Other Finance"
    ];
    const cleanMode = validModes.includes(paymentMode) ? paymentMode : "Cash";

    // Validate quantities and products
    const processedItems = [];
    let calculatedSubtotal = 0;
    let totalCost = 0;

    for (const item of items) {
      const quantity = parseInt(item.quantity, 10);
      if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for item ${item.name || "selected"}`
        });
      }

      let productDoc = null;
      if (item.productId && mongoose.isValidObjectId(item.productId)) {
        productDoc = await Product.findById(item.productId);
      }

      if (productDoc) {
        if (productDoc.stockQuantity < quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for "${productDoc.name}". Available: ${productDoc.stockQuantity}, Requested: ${quantity}`
          });
        }

        const unitPrice = typeof item.price === "number" && item.price >= 0
          ? item.price
          : productDoc.sellingPrice;

        const lineTaxable = Math.round(unitPrice * quantity * 100) / 100;
        const cgst = taxRate > 0 ? Math.round(lineTaxable * (taxRate / 2) / 100 * 100) / 100 : 0;
        const sgst = taxRate > 0 ? Math.round(lineTaxable * (taxRate / 2) / 100 * 100) / 100 : 0;
        const lineTotal = Math.round((lineTaxable + cgst + sgst) * 100) / 100;

        processedItems.push({
          productId: productDoc._id,
          name: productDoc.name,
          sku: productDoc.sku || "",
          hsn: item.hsn || "8517",
          modelNumber: productDoc.model || "",
          quantity,
          price: unitPrice,
          taxableValue: lineTaxable,
          cgst,
          sgst,
          total: lineTotal,
          purchasePrice: productDoc.purchasePrice || 0
        });

        calculatedSubtotal += lineTaxable;
        totalCost += (productDoc.purchasePrice || 0) * quantity;
      } else {
        // Custom or manual line item
        const unitPrice = parseFloat(item.price) || 0;
        const lineTaxable = Math.round(unitPrice * quantity * 100) / 100;
        const cgst = taxRate > 0 ? Math.round(lineTaxable * (taxRate / 2) / 100 * 100) / 100 : 0;
        const sgst = taxRate > 0 ? Math.round(lineTaxable * (taxRate / 2) / 100 * 100) / 100 : 0;
        const lineTotal = Math.round((lineTaxable + cgst + sgst) * 100) / 100;

        processedItems.push({
          productId: null,
          name: (item.name || "Custom Item").trim(),
          sku: (item.sku || "").trim(),
          hsn: (item.hsn || "8517").trim(),
          modelNumber: "",
          quantity,
          price: unitPrice,
          taxableValue: lineTaxable,
          cgst,
          sgst,
          total: lineTotal,
          purchasePrice: 0
        });

        calculatedSubtotal += lineTaxable;
      }
    }

    const totalCgst = processedItems.reduce((acc, it) => acc + (it.cgst || 0), 0);
    const totalSgst = processedItems.reduce((acc, it) => acc + (it.sgst || 0), 0);
    const cleanDiscount = Math.max(0, Math.min(parseFloat(discount) || 0, calculatedSubtotal));
    const grandTotal = Math.max(0, Math.round((calculatedSubtotal + totalCgst + totalSgst - cleanDiscount) * 100) / 100);
    const totalProfit = Math.round((calculatedSubtotal - cleanDiscount - totalCost) * 100) / 100;

    // Deduct stock atomically
    const deductedProducts = [];
    try {
      for (const it of processedItems) {
        if (it.productId) {
          const updated = await Product.findOneAndUpdate(
            { _id: it.productId, stockQuantity: { $gte: it.quantity } },
            { $inc: { stockQuantity: -it.quantity } },
            { returnDocument: "after" }
          );

          if (!updated) {
            throw new Error(`Failed to deduct stock for ${it.name}. Stock may have changed.`);
          }
          deductedProducts.push({ id: it.productId, qty: it.quantity });
        }
      }
    } catch (stockErr) {
      // Rollback any deducted stock
      for (const roll of deductedProducts) {
        await Product.findByIdAndUpdate(roll.id, { $inc: { stockQuantity: roll.qty } }).catch(() => {});
      }
      return res.status(409).json({
        success: false,
        message: stockErr.message || "Failed to reserve inventory for billing"
      });
    }

    const bill = await Bill.create({
      invoiceNumber: generateInvoiceNumber(),
      customerName: cleanCustomer,
      customerPhone: cleanPhone,
      customerAddress: cleanAddress,
      items: processedItems,
      paymentMode: cleanMode,
      financier: (financier || "").trim(),
      loanReference: (loanReference || "").trim(),
      imei1: (imei1 || "").trim(),
      imei2: (imei2 || "").trim(),
      modelNumber: (modelNumber || "").trim(),
      serialNumber: (serialNumber || "").trim(),
      bankName: (bankName || "").trim(),
      cardRefNo: (cardRefNo || "").trim(),
      transactionId: (transactionId || "").trim(),
      taxableValue: Math.round(calculatedSubtotal * 100) / 100,
      cgst: Math.round(totalCgst * 100) / 100,
      sgst: Math.round(totalSgst * 100) / 100,
      discount: Math.round(cleanDiscount * 100) / 100,
      grandTotal,
      totalCost: Math.round(totalCost * 100) / 100,
      totalProfit,
      status: "completed",
      createdBy: req.user?.userId || null
    });

    // Automatically mark the billed handset IMEI as "Sold" in product imeiRecords
    const cleanImei1 = (imei1 || "").trim();
    const cleanImei2 = (imei2 || "").trim();
    if (bill && (cleanImei1 || cleanImei2)) {
      for (const it of processedItems) {
        if (it.productId) {
          try {
            const pDoc = await Product.findById(it.productId);
            if (pDoc && Array.isArray(pDoc.imeiRecords) && pDoc.imeiRecords.length > 0) {
              const record = pDoc.imeiRecords.find(r => 
                (cleanImei1 && r.imei1 === cleanImei1) || 
                (cleanImei2 && r.imei2 === cleanImei2) ||
                (r.status === "In Stock")
              );
              if (record) {
                record.status = "Sold";
                record.soldBillNumber = bill.invoiceNumber;
                record.soldDate = new Date();
                
                const nextAvail = pDoc.imeiRecords.find(r => r.status === "In Stock");
                if (nextAvail) {
                  pDoc.imei1 = nextAvail.imei1 || "";
                  pDoc.imei2 = nextAvail.imei2 || "";
                  pDoc.serialNumber = nextAvail.serialNumber || "";
                } else {
                  pDoc.imei1 = "";
                  pDoc.imei2 = "";
                }
                await pDoc.save();
              }
            }
          } catch (imeiErr) {
            console.warn("IMEI status update warning:", imeiErr);
          }
        }
      }
    }

    return res.status(201).json({
      success: true,
      message: "Bill created successfully",
      bill
    });
  } catch (error) {
    console.error("Create bill error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create bill"
    });
  }
}

// GET /api/bills - List bills with filters and pagination
async function getBills(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.search) {
      const search = String(req.query.search).trim();
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
        { customerPhone: { $regex: search, $options: "i" } }
      ];
    }

    if (req.query.paymentMode && req.query.paymentMode !== "All") {
      filter.paymentMode = req.query.paymentMode;
    }

    if (req.query.status && req.query.status !== "All") {
      filter.status = req.query.status;
    }

    // Date range filter
    if (req.query.period === "today") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      filter.createdAt = { $gte: start };
    } else if (req.query.period === "week") {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      filter.createdAt = { $gte: start };
    } else if (req.query.period === "month") {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      filter.createdAt = { $gte: start };
    } else if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        filter.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        const end = new Date(req.query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const [bills, total] = await Promise.all([
      Bill.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Bill.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      bills,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Get bills error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not retrieve bills"
    });
  }
}

// GET /api/bills/stats - Real-time sales and revenue statistics
async function getBillStats(req, res) {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const [
      allTimeStats,
      todayStats,
      yesterdayStats,
      paymentModeStats,
      recentDays,
      topProducts
    ] = await Promise.all([
      // Total bills & total revenue
      Bill.aggregate([
        { $match: { status: "completed" } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$grandTotal" },
            totalProfit: { $sum: "$totalProfit" },
            totalBills: { $sum: 1 }
          }
        }
      ]),

      // Today's stats
      Bill.aggregate([
        { $match: { status: "completed", createdAt: { $gte: todayStart } } },
        {
          $group: {
            _id: null,
            todayRevenue: { $sum: "$grandTotal" },
            todayProfit: { $sum: "$totalProfit" },
            todayBills: { $sum: 1 }
          }
        }
      ]),

      // Yesterday's stats (for comparison)
      Bill.aggregate([
        { $match: { status: "completed", createdAt: { $gte: yesterdayStart, $lt: todayStart } } },
        {
          $group: {
            _id: null,
            yesterdayRevenue: { $sum: "$grandTotal" },
            yesterdayBills: { $sum: 1 }
          }
        }
      ]),

      // Breakdown by payment mode
      Bill.aggregate([
        { $match: { status: "completed" } },
        {
          $group: {
            _id: "$paymentMode",
            count: { $sum: 1 },
            amount: { $sum: "$grandTotal" }
          }
        }
      ]),

      // Last 7 days daily revenue for charts
      Bill.aggregate([
        {
          $match: {
            status: "completed",
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            revenue: { $sum: "$grandTotal" },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Top 5 selling products across retail POS
      Bill.aggregate([
        { $match: { status: "completed" } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.name",
            sku: { $first: "$items.sku" },
            unitsSold: { $sum: "$items.quantity" },
            revenue: { $sum: "$items.total" }
          }
        },
        { $sort: { unitsSold: -1 } },
        { $limit: 5 }
      ])
    ]);

    const totalRevenue = allTimeStats[0]?.totalRevenue || 0;
    const totalProfit = allTimeStats[0]?.totalProfit || 0;
    const totalBills = allTimeStats[0]?.totalBills || 0;
    const todayRevenue = todayStats[0]?.todayRevenue || 0;
    const todayBills = todayStats[0]?.todayBills || 0;
    const yesterdayRevenue = yesterdayStats[0]?.yesterdayRevenue || 0;

    const avgOrderValue = totalBills > 0 ? Math.round(totalRevenue / totalBills) : 0;
    const grossMarginPercent = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;

    return res.json({
      success: true,
      stats: {
        totalRevenue,
        totalProfit,
        totalBills,
        todayRevenue,
        todayBills,
        yesterdayRevenue,
        avgOrderValue,
        grossMarginPercent,
        paymentModeStats,
        dailyTrend: recentDays,
        topSellingProducts: topProducts.map(tp => ({
          name: tp._id,
          sku: tp.sku || "",
          unitsSold: tp.unitsSold,
          revenue: tp.revenue
        }))
      }
    });
  } catch (error) {
    console.error("Bill stats error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not calculate billing metrics"
    });
  }
}

// GET /api/bills/recent-customers - Customer lookup for POS autocomplete
async function getRecentCustomers(req, res) {
  try {
    const customers = await Bill.aggregate([
      { $match: { customerPhone: { $exists: true, $ne: "" } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$customerPhone",
          name: { $first: "$customerName" },
          phone: { $first: "$customerPhone" },
          address: { $first: "$customerAddress" },
          lastPurchase: { $first: "$createdAt" },
          totalPurchases: { $sum: 1 }
        }
      },
      { $sort: { lastPurchase: -1 } },
      { $limit: 30 }
    ]);

    return res.json({
      success: true,
      customers
    });
  } catch (error) {
    console.error("Recent customers lookup error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not retrieve customer history"
    });
  }
}

// GET /api/bills/:id - Single bill details
async function getBillById(req, res) {
  try {
    const { id } = req.params;

    let query = {};
    if (mongoose.isValidObjectId(id)) {
      query._id = id;
    } else {
      query.invoiceNumber = id;
    }

    const bill = await Bill.findOne(query).populate("createdBy", "name email").lean();

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found"
      });
    }

    return res.json({ success: true, bill });
  } catch (error) {
    console.error("Get bill detail error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not retrieve bill details"
    });
  }
}

// PATCH /api/bills/:id/cancel - Cancel bill and restore stock
async function cancelBill(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bill ID"
      });
    }

    const bill = await Bill.findById(id);
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found"
      });
    }

    if (bill.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Bill is already cancelled"
      });
    }

    // Restore stock and IMEI status
    for (const it of bill.items) {
      if (it.productId) {
        await Product.findByIdAndUpdate(it.productId, {
          $inc: { stockQuantity: it.quantity }
        }).catch(err => console.error("Error restoring stock on bill cancel:", err.message));

        try {
          const pDoc = await Product.findById(it.productId);
          if (pDoc && Array.isArray(pDoc.imeiRecords) && pDoc.imeiRecords.length > 0) {
            const soldRec = pDoc.imeiRecords.find(r => 
              r.soldBillNumber === bill.invoiceNumber ||
              (bill.imei1 && r.imei1 === bill.imei1)
            );
            if (soldRec) {
              soldRec.status = "In Stock";
              soldRec.soldBillNumber = null;
              soldRec.soldDate = null;
              if (!pDoc.imei1) {
                pDoc.imei1 = soldRec.imei1 || "";
                pDoc.imei2 = soldRec.imei2 || "";
              }
              await pDoc.save();
            }
          }
        } catch (restErr) {
          console.warn("Error restoring IMEI status on bill cancel:", restErr.message);
        }
      }
    }

    bill.status = "cancelled";
    await bill.save();

    return res.json({
      success: true,
      message: "Bill cancelled and inventory restored",
      bill
    });
  } catch (error) {
    console.error("Cancel bill error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not cancel bill"
    });
  }
}

module.exports = {
  createBill,
  getBills,
  getBillStats,
  getBillById,
  cancelBill,
  getRecentCustomers
};
