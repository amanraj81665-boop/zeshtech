const mongoose = require("mongoose");

const stockNotificationSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true
    },
    productName: {
      type: String,
      trim: true,
      default: ""
    },
    productSku: {
      type: String,
      trim: true,
      default: ""
    },
    phone: {
      type: String,
      trim: true,
      required: true,
      match: [/^[6-9]\d{9}$/, "Please provide a valid 10-digit Indian phone number"]
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ""
    },
    notified: {
      type: Boolean,
      default: false,
      index: true
    },
    notifiedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("StockNotification", stockNotificationSchema);
