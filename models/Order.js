"use strict";

const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    name: { type: String, required: true, trim: true },
    sku: { type: String, default: "", trim: true },
    imageUrl: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: items => items.length > 0,
        message: "An order must contain at least one item"
      }
    },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["Placed", "Processing", "Shipped", "Delivered", "Cancelled"],
      default: "Placed"
    },
    paymentMethod: {
      type: String,
      default: "Cash on Delivery"
    },
    paymentDetails: {
      status: {
        type: String,
        enum: ["Pending", "Paid", "Verified"],
        default: "Pending"
      },
      transactionId: { type: String, default: "" },
      upiId: { type: String, default: "9122846271-5@ybl" },
      paidAt: { type: Date }
    },
    shippingAddress: {
      fullName: { type: String, default: "" },
      phone: { type: String, default: "" },
      addressLine1: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "Bihar" },
      pincode: { type: String, default: "" }
    },
    financeDetails: {
      provider: { type: String, default: "" }, // Bajaj / TVS / DMI / HDB
      loanAccount: { type: String, default: "" },
      downPayment: { type: Number, default: 0 }
    },
    notes: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Order || mongoose.model("Order", orderSchema);
