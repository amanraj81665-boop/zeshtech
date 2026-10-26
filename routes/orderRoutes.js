
const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const Product = require("../models/Product");
const Order = require("../models/Order");
const notificationService = require("../services/notificationService");

router.use(authMiddleware);

function requireCustomer(req, res, next) {
  if (req.user?.role !== "customer") {
    return res.status(403).json({
      success: false,
      message: "Customer account required"
    });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin permission required"
    });
  }
  next();
}

// GET /api/orders - Admin only: list all customer orders
router.get("/", requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status && req.query.status !== "All") {
      filter.status = req.query.status;
    }

    if (req.query.search) {
      const search = String(req.query.search).trim();
      filter.$or = [
        { orderNumber: { $regex: search, $options: "i" } }
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("customer", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Admin order listing error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not load orders"
    });
  }
});

// PATCH /api/orders/:id/status - Admin only: update order status
router.patch("/:id/status", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID"
      });
    }

    const validStatuses = ["Placed", "Processing", "Shipped", "Delivered", "Cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(", ")}`
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const previousStatus = order.status;
    order.status = status;
    await order.save();

    // If order was cancelled from another status, restore product stock
    if (status === "Cancelled" && previousStatus !== "Cancelled") {
      for (const item of order.items) {
        if (item.product) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stockQuantity: item.quantity }
          }).catch(err => console.error("Error restoring stock on cancellation:", err.message));
        }
      }
    }

    return res.json({
      success: true,
      message: `Order status updated to ${status}`,
      order
    });
  } catch (error) {
    console.error("Order status update error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not update order status"
    });
  }
});

// Create an order using server-side prices and stock.
router.post("/", requireCustomer, async (req, res) => {
  const session = await mongoose.startSession();
  let createdOrder;

  try {
    const items = req.body?.items;

    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Provide between 1 and 50 cart items"
      });
    }

    const quantities = new Map();

    for (const item of items) {
      const productId = String(item?.productId || "");
      const quantity = item?.quantity;

      if (
        !mongoose.isValidObjectId(productId) ||
        !Number.isSafeInteger(quantity) ||
        quantity < 1 ||
        quantity > 100
      ) {
        return res.status(400).json({
          success: false,
          message: "Each item needs a valid productId and quantity"
        });
      }

      quantities.set(
        productId,
        (quantities.get(productId) || 0) + quantity
      );

      if (quantities.get(productId) > 100) {
        return res.status(400).json({
          success: false,
          message: "Maximum quantity per product is 100"
        });
      }
    }

    await session.withTransaction(async () => {
      const orderItems = [];
      let subtotal = 0;

      for (const [productId, quantity] of quantities) {
        const product = await Product.findOneAndUpdate(
          {
            _id: productId,
            isActive: true,
            stockQuantity: { $gte: quantity }
          },
          { $inc: { stockQuantity: -quantity } },
          { returnDocument: "after", session }
        );

        if (!product) {
          throw new Error(
            "A product is unavailable or has insufficient stock. Please refresh your cart."
          );
        }

        const price = product.sellingPrice;
        const lineTotal = Math.round(price * quantity * 100) / 100;

        orderItems.push({
          product: product._id,
          name: product.name,
          sku: product.sku,
          imageUrl: product.imageUrl || "",
          price,
          quantity,
          lineTotal
        });

        subtotal += lineTotal;
      }

      subtotal = Math.round(subtotal * 100) / 100;

      const orderNumber =
        "ZT-" + new mongoose.Types.ObjectId().toString().slice(-10).toUpperCase();

      const orders = await Order.create(
        [{
          orderNumber,
          customer: req.user.userId,
          items: orderItems,
          subtotal,
          total: subtotal,
          totalAmount: subtotal,
          paymentMethod: req.body.paymentMethod || "Cash on Delivery",
          paymentDetails: {
            status: req.body.paymentDetails?.status || (req.body.paymentMethod?.includes("UPI") || req.body.paymentMethod?.includes("PhonePe") ? "Paid" : "Pending"),
            transactionId: req.body.paymentDetails?.transactionId || req.body.transactionId || "",
            upiId: "9122846271-5@ybl",
            paidAt: (req.body.paymentDetails?.transactionId || req.body.transactionId) ? new Date() : undefined
          },
          shippingAddress: {
            fullName: req.body.shippingAddress?.fullName || "",
            phone: req.body.shippingAddress?.phone || "",
            addressLine1: req.body.shippingAddress?.addressLine1 || "",
            city: req.body.shippingAddress?.city || "",
            state: req.body.shippingAddress?.state || "Bihar",
            pincode: req.body.shippingAddress?.pincode || ""
          },
          financeDetails: {
            provider: req.body.financeDetails?.provider || "",
            loanAccount: req.body.financeDetails?.loanAccount || "",
            downPayment: Number(req.body.financeDetails?.downPayment || 0)
          },
          notes: req.body.notes || ""
        }],
        { session }
      );

      createdOrder = orders[0];
    });

    const whatsAppAlertUrl = notificationService.createWhatsAppOwnerAlertUrl(createdOrder);
    notificationService.sendOwnerOrderEmail(createdOrder).catch(err => {
      console.error("Owner email background notification failed:", err.message);
    });

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: createdOrder,
      whatsAppAlertUrl
    });
  } catch (error) {
    console.error("Order creation error:", error.message);

    return res.status(400).json({
      success: false,
      message: error.message.includes("unavailable") ||
        error.message.includes("insufficient stock")
        ? error.message
        : "Could not place the order. Please try again."
    });
  } finally {
    await session.endSession();
  }
});

// Get only the logged-in customer's order history.
router.get("/my", async (req, res) => {
  try {
    const orders = await Order.find({
      customer: req.user.userId
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error("Order history error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not load order history"
    });
  }
});

// Get one order, if admin or belongs to the logged-in customer.
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID"
      });
    }

    const query = { _id: req.params.id };
    if (req.user?.role !== "admin") {
      query.customer = req.user.userId;
    }

    const orderQuery = Order.findOne(query);
    if (req.user?.role === "admin") {
      orderQuery.populate("customer", "name email");
    }

    const order = await orderQuery.lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    return res.json({ success: true, order });
  } catch (error) {
    console.error("Order detail error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not load order"
    });
  }
});

module.exports = router;
