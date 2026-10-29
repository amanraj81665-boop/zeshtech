
const mongoose = require("mongoose");

const billItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null
    },

    sku: {
      type: String,
      default: "",
      trim: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    hsn: {
      type: String,
      default: "8517",
      trim: true
    },

    modelNumber: {
      type: String,
      default: "",
      trim: true
    },

    quantity: {
      type: Number,
      required: true,
      min: 1
    },

    price: {
      type: Number,
      required: true,
      min: 0
    },

    taxableValue: {
      type: Number,
      required: true,
      min: 0
    },

    cgst: {
      type: Number,
      default: 0,
      min: 0
    },

    sgst: {
      type: Number,
      default: 0,
      min: 0
    },

    total: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const billSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null
    },

    customerName: {
      type: String,
      required: true,
      trim: true
    },

    customerPhone: {
      type: String,
      default: "",
      trim: true
    },

    customerAddress: {
      type: String,
      default: "",
      trim: true
    },

    items: {
      type: [billItemSchema],
      required: true,
      validate: {
        validator: items => items.length > 0,
        message: "Bill must contain at least one item"
      }
    },

    paymentMode: {
      type: String,
      enum: [
        "Cash",
        "UPI",
        "PhonePe / UPI",
        "Card",
        "Bajaj Finance",
        "TVS Credit",
        "DMI Finance",
        "HDB Financial",
        "IDFC FIRST Bank",
        "Other Finance"
      ],
      default: "Cash"
    },

    financier: {
      type: String,
      default: "",
      trim: true
    },

    loanReference: {
      type: String,
      default: "",
      trim: true
    },

    imei1: {
      type: String,
      default: "",
      trim: true
    },

    imei2: {
      type: String,
      default: "",
      trim: true
    },

    modelNumber: {
      type: String,
      default: "",
      trim: true
    },

    serialNumber: {
      type: String,
      default: "",
      trim: true
    },

    bankName: {
      type: String,
      default: "",
      trim: true
    },

    cardRefNo: {
      type: String,
      default: "",
      trim: true
    },

    transactionId: {
      type: String,
      default: "",
      trim: true
    },

    taxableValue: {
      type: Number,
      required: true,
      min: 0
    },

    cgst: {
      type: Number,
      default: 0,
      min: 0
    },

    sgst: {
      type: Number,
      default: 0,
      min: 0
    },

    discount: {
      type: Number,
      default: 0,
      min: 0
    },

    exchangePhone: {
      model: { type: String, default: "", trim: true },
      imei: { type: String, default: "", trim: true },
      serialNumber: { type: String, default: "", trim: true },
      valuation: { type: Number, default: 0, min: 0 }
    },

    grandTotal: {
      type: Number,
      required: true,
      min: 0
    },

    totalCost: {
      type: Number,
      default: 0,
      min: 0
    },

    totalProfit: {
      type: Number,
      default: 0
    },

    status: {
      type: String,
      enum: ["completed", "cancelled"],
      default: "completed"
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true
  }
);

// High-performance indexes for POS billing history and customer search
billSchema.index({ createdAt: -1 });
billSchema.index({ customerPhone: 1, createdAt: -1 });
billSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Bill", billSchema);
