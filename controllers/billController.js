"use strict";

const mongoose = require("mongoose");
const Bill = require("../models/Bill");
const Product = require("../models/Product");
const User = require("../models/User");

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
      exchangePhone,
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
      "Cash", "UPI", "PhonePe / UPI", "Card", "Bajaj Finance", "TVS Credit",
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

        const unitPrice = Number(productDoc.sellingPrice) || 0;

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
    const cleanExchangeVal = exchangePhone && typeof exchangePhone.valuation === "number"
      ? Math.max(0, exchangePhone.valuation)
      : Math.max(0, parseFloat(exchangePhone?.valuation) || 0);

    const grandTotal = Math.max(0, Math.round((calculatedSubtotal + totalCgst + totalSgst - cleanDiscount - cleanExchangeVal) * 100) / 100);
    const totalProfit = Math.round((calculatedSubtotal - cleanDiscount - totalCost) * 100) / 100;

    // Reserve stock, mark the exact handset, and create the bill in one transaction.
    const session = await mongoose.startSession();
    let bill;
    try {
      await session.withTransaction(async () => {
        const quantities = new Map();
        for (const line of processedItems) {
          if (!line.productId) continue;
          const key = String(line.productId);
          quantities.set(key, (quantities.get(key) || 0) + line.quantity);
        }

        for (const [productId, quantity] of quantities) {
          const updated = await Product.findOneAndUpdate(
            { _id: productId, isActive: true, stockQuantity: { $gte: quantity } },
            { $inc: { stockQuantity: -quantity } },
            { new: true, session }
          );
          if (!updated) throw new Error("Insufficient stock or product unavailable. Refresh POS and try again.");
        }

        const cleanImei1 = String(imei1 || "").trim();
        const cleanImei2 = String(imei2 || "").trim();
        const invoiceNumber = generateInvoiceNumber();
        if (cleanImei1 || cleanImei2) {
          const matchingLines = processedItems.filter(line => line.productId);
          if (matchingLines.length !== 1 || matchingLines[0].quantity !== 1) {
            throw new Error("Select exactly one product unit for IMEI-tracked billing.");
          }
          const productId = matchingLines[0].productId;
          const imeiMatch = {
            _id: productId,
            imeiRecords: {
              $elemMatch: {
                status: "In Stock",
                $or: [
                  ...(cleanImei1 ? [{ imei1: cleanImei1 }] : []),
                  ...(cleanImei2 ? [{ imei2: cleanImei2 }] : [])
                ]
              }
            }
          };
          const marked = await Product.updateOne(
            imeiMatch,
            {
              $set: {
                "imeiRecords.$[unit].status": "Sold",
                "imeiRecords.$[unit].soldBillNumber": invoiceNumber,
                "imeiRecords.$[unit].soldDate": new Date()
              }
            },
            {
              arrayFilters: [{
                "unit.status": "In Stock",
                $or: [
                  ...(cleanImei1 ? [{ "unit.imei1": cleanImei1 }] : []),
                  ...(cleanImei2 ? [{ "unit.imei2": cleanImei2 }] : [])
                ]
              }],
              session
            }
          );
          if (!marked.modifiedCount) throw new Error("Selected IMEI is no longer available. Refresh POS and select another handset.");
        }

        bill = (await Bill.create([{
          invoiceNumber,
          customerName: cleanCustomer,
          customerPhone: cleanPhone,
          customerAddress: cleanAddress,
          items: processedItems,
          paymentMode: cleanMode,
          financier: (financier || "").trim(),
          loanReference: (loanReference || "").trim(),
          imei1: cleanImei1,
          imei2: cleanImei2,
          modelNumber: (modelNumber || "").trim(),
          serialNumber: (serialNumber || "").trim(),
          bankName: (bankName || "").trim(),
          cardRefNo: (cardRefNo || "").trim(),
          transactionId: (transactionId || "").trim(),
          taxableValue: Math.round(calculatedSubtotal * 100) / 100,
          cgst: Math.round(totalCgst * 100) / 100,
          sgst: Math.round(totalSgst * 100) / 100,
          discount: Math.round(cleanDiscount * 100) / 100,
          exchangePhone: cleanExchangeVal > 0 ? {
            model: (exchangePhone.model || "").trim(),
            imei: (exchangePhone.imei || "").trim(),
            serialNumber: (exchangePhone.serialNumber || "").trim(),
            valuation: cleanExchangeVal
          } : { model: "", imei: "", serialNumber: "", valuation: 0 },
          grandTotal,
          totalCost: Math.round(totalCost * 100) / 100,
          totalProfit,
          status: "completed",
          createdBy: req.user?.userId || null
        }], { session }))[0];
      });
    } finally {
      await session.endSession();
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
  const session = await mongoose.startSession();
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid bill ID" });

    let bill;
    await session.withTransaction(async () => {
      bill = await Bill.findOneAndUpdate(
        { _id: id, status: "completed" },
        { $set: { status: "cancelled" } },
        { new: true, session }
      );
      if (!bill) {
        const existing = await Bill.findById(id).session(session);
        if (!existing) throw new Error("BILL_NOT_FOUND");
        throw new Error("BILL_ALREADY_CANCELLED");
      }

      const quantities = new Map();
      for (const item of bill.items || []) {
        if (!item.productId) continue;
        const key = String(item.productId);
        quantities.set(key, (quantities.get(key) || 0) + item.quantity);
      }
      for (const [productId, quantity] of quantities) {
        await Product.updateOne({ _id: productId }, { $inc: { stockQuantity: quantity } }, { session });
      }

      for (const productId of quantities.keys()) {
        const product = await Product.findById(productId).session(session);
        if (!product || !Array.isArray(product.imeiRecords)) continue;
        let changed = false;
        for (const record of product.imeiRecords) {
          if (record.status === "Sold" && record.soldBillNumber === bill.invoiceNumber) {
            record.status = "In Stock";
            record.soldBillNumber = null;
            record.soldDate = null;
            changed = true;
          }
        }
        if (changed) {
          const nextAvailable = product.imeiRecords.find(record => record.status === "In Stock");
          product.imei1 = nextAvailable?.imei1 || "";
          product.imei2 = nextAvailable?.imei2 || "";
          product.serialNumber = nextAvailable?.serialNumber || "";
          await product.save({ session });
        }
      }
    });

    return res.json({ success: true, message: "Bill cancelled and inventory restored", bill });
  } catch (error) {
    if (error.message === "BILL_NOT_FOUND") return res.status(404).json({ success: false, message: "Bill not found" });
    if (error.message === "BILL_ALREADY_CANCELLED") return res.status(409).json({ success: false, message: "Bill is already cancelled" });
    console.error("Cancel bill transaction error:", error.message);
    return res.status(500).json({ success: false, message: "Could not cancel bill. No inventory changes were committed." });
  } finally {
    await session.endSession();
  }
}

// GET /api/bills/daily-register - Daily Cash Register & Galla Closing Summary
async function getDailyRegister(req, res) {
  try {
    let dateStr = req.query.date; // e.g. "2026-10-29"
    let startOfDay, endOfDay;

    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
      endOfDay = new Date(`${dateStr}T23:59:59.999Z`);
    } else {
      const now = new Date();
      startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    }

    const bills = await Bill.find({
      status: "completed",
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ createdAt: -1 });

    let cashTotal = 0;
    let upiTotal = 0;
    let cardTotal = 0;
    let financeTotal = 0;
    let grossRevenue = 0;
    let totalProfit = 0;
    let totalDiscount = 0;
    let totalExchangeVal = 0;
    let totalHandsetsSold = 0;

    bills.forEach((b) => {
      grossRevenue += b.grandTotal || 0;
      totalProfit += b.totalProfit || 0;
      totalDiscount += b.discount || 0;
      if (b.exchangePhone && b.exchangePhone.valuation) {
        totalExchangeVal += b.exchangePhone.valuation;
      }

      if (b.items && Array.isArray(b.items)) {
        b.items.forEach((it) => {
          totalHandsetsSold += it.quantity || 1;
        });
      }

      const mode = (b.paymentMode || "").toLowerCase();
      if (mode.includes("cash")) {
        cashTotal += b.grandTotal || 0;
      } else if (mode.includes("upi")) {
        upiTotal += b.grandTotal || 0;
      } else if (mode.includes("card")) {
        cardTotal += b.grandTotal || 0;
      } else if (mode.includes("finance") || mode.includes("bajaj") || mode.includes("tvs") || mode.includes("dmi") || mode.includes("idfc") || mode.includes("hdb")) {
        financeTotal += b.grandTotal || 0;
      } else {
        cashTotal += b.grandTotal || 0; // fallback
      }
    });

    return res.json({
      success: true,
      date: dateStr || new Date().toISOString().split("T")[0],
      summary: {
        totalBills: bills.length,
        totalHandsetsSold,
        grossRevenue: Math.round(grossRevenue * 100) / 100,
        cashTotal: Math.round(cashTotal * 100) / 100,
        upiTotal: Math.round(upiTotal * 100) / 100,
        cardTotal: Math.round(cardTotal * 100) / 100,
        financeTotal: Math.round(financeTotal * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        totalExchangeVal: Math.round(totalExchangeVal * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100
      },
      bills: bills.map((b) => ({
        invoiceNumber: b.invoiceNumber,
        customerName: b.customerName,
        customerPhone: b.customerPhone,
        paymentMode: b.paymentMode,
        grandTotal: b.grandTotal,
        itemsCount: (b.items || []).length,
        time: b.createdAt
      }))
    });
  } catch (error) {
    console.error("Daily register error:", error);
    return res.status(500).json({ success: false, message: "Could not generate daily register summary" });
  }
}

// GET /api/bills/warranty-locker?phone=XXXXXXXXXX
async function getWarrantyLocker(req, res) {
  try {
    const rawPhone = String(req.query.phone || "").replace(/\D/g, "");
    if (!rawPhone || rawPhone.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10-digit mobile number"
      });
    }

    const phone = rawPhone.slice(-10);
    if (!req.user?.userId) {
      return res.status(401).json({ success: false, message: "Please sign in to view your warranty records." });
    }
    const account = await User.findById(req.user.userId).select("phone role").lean();
    if (!account) return res.status(401).json({ success: false, message: "Account not found." });
    if (account.role !== "admin") {
      const accountPhone = String(account.phone || "").replace(/\D/g, "").slice(-10);
      if (!accountPhone || accountPhone !== phone) {
        return res.status(403).json({ success: false, message: "You can only view warranty records linked to your verified account phone number." });
      }
    }

    const bills = await Bill.find({
      status: "completed",
      customerPhone: { $regex: phone + "$" }
    }).sort({ createdAt: -1 });

    if (bills.length === 0) {
      return res.json({
        success: true,
        customerName: "Valued Customer",
        phone,
        devices: [],
        message: "No registered purchases found for this mobile number"
      });
    }

    const customerName = bills[0].customerName || "Valued Customer";
    const devices = [];

    bills.forEach((bill) => {
      const billDate = new Date(bill.createdAt);
      const warrantyEndDate = new Date(billDate.getTime() + 365 * 24 * 60 * 60 * 1000);
      const daysLeft = Math.ceil((warrantyEndDate - Date.now()) / (1000 * 60 * 60 * 24));
      const isUnderWarranty = daysLeft > 0;

      const deviceImei1 = bill.imei1 || "";
      const deviceImei2 = bill.imei2 || "";
      const deviceSerial = bill.serialNumber || "";
      const modelNo = bill.modelNumber || "";

      (bill.items || []).forEach((item) => {
        devices.push({
          productName: item.name,
          sku: item.sku,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
          invoiceNumber: bill.invoiceNumber,
          purchaseDate: billDate.toISOString(),
          imei1: deviceImei1,
          imei2: deviceImei2,
          serialNumber: deviceSerial,
          modelNumber: modelNo,
          warrantyPeriod: "1 Year Official Brand Warranty",
          warrantyEndDate: warrantyEndDate.toISOString(),
          daysLeft: Math.max(0, daysLeft),
          isUnderWarranty,
          paymentMode: bill.paymentMode,
          billId: bill._id,
          billDetails: {
            invoiceNumber: bill.invoiceNumber,
            date: bill.createdAt,
            customerName: bill.customerName,
            customerPhone: bill.customerPhone,
            customerAddress: bill.customerAddress,
            paymentMode: bill.paymentMode,
            subtotal: bill.subtotal,
            cgst: bill.cgst,
            sgst: bill.sgst,
            discount: bill.discount,
            exchangePhone: bill.exchangePhone,
            grandTotal: bill.grandTotal,
            imei1: deviceImei1,
            imei2: deviceImei2,
            serialNumber: deviceSerial,
            items: bill.items
          }
        });
      });
    });

    return res.json({
      success: true,
      customerName,
      phone,
      totalDevices: devices.length,
      devices
    });
  } catch (error) {
    console.error("Warranty locker lookup error:", error);
    return res.status(500).json({ success: false, message: "Failed to look up digital warranty records" });
  }
}


// GET /api/bills/public/:invoiceNumber - privacy-safe public invoice summary
async function getPublicInvoice(req, res) {
  try {
    const invoiceNumber = String(req.params.invoiceNumber || "").trim();
    if (!/^[A-Za-z0-9-]{6,40}$/.test(invoiceNumber)) {
      return res.status(400).json({ success: false, message: "Invalid invoice number" });
    }

    const bill = await Bill.findOne({ invoiceNumber, status: "completed" })
      .select("invoiceNumber createdAt items taxableValue cgst sgst discount grandTotal")
      .lean();

    if (!bill) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    const items = (bill.items || []).map((item) => ({
      name: item.name,
      hsn: item.hsn || "",
      quantity: item.quantity,
      price: item.price,
      taxableValue: item.taxableValue,
      cgst: item.cgst || 0,
      sgst: item.sgst || 0,
      total: item.total
    }));

    return res.json({
      success: true,
      invoice: {
        invoiceNumber: bill.invoiceNumber,
        date: bill.createdAt,
        items,
        taxableValue: bill.taxableValue || 0,
        cgst: bill.cgst || 0,
        sgst: bill.sgst || 0,
        discount: bill.discount || 0,
        grandTotal: bill.grandTotal || 0
      }
    });
  } catch (error) {
    console.error("Public invoice lookup error:", error);
    return res.status(500).json({ success: false, message: "Unable to load invoice" });
  }
}

module.exports = {
  createBill,
  getBills,
  getBillStats,
  getBillById,
  cancelBill,
  getRecentCustomers,
  getDailyRegister,
  getWarrantyLocker,
  getPublicInvoice
};
