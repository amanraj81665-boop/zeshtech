
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: [2, "Product name must be at least 2 characters"],
      maxlength: [120, "Product name cannot exceed 120 characters"]
    },

    sku: {
      type: String,
      required: [true, "SKU is required"],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [50, "SKU cannot exceed 50 characters"]
    },

    barcode: {
      type: String,
      trim: true,
      default: null,
      maxlength: [100, "Barcode cannot exceed 100 characters"]
    },

    serialNumber: {
      type: String,
      trim: true,
      default: "",
      maxlength: [100, "Serial number cannot exceed 100 characters"]
    },

    imei1: {
      type: String,
      trim: true,
      default: "",
      maxlength: [30, "IMEI 1 cannot exceed 30 characters"]
    },

    imei2: {
      type: String,
      trim: true,
      default: "",
      maxlength: [30, "IMEI 2 cannot exceed 30 characters"]
    },

    imeiRecords: [
      {
        imei1: { type: String, trim: true, default: "", maxlength: 30 },
        imei2: { type: String, trim: true, default: "", maxlength: 30 },
        serialNumber: { type: String, trim: true, default: "", maxlength: 100 },
        status: {
          type: String,
          enum: ["In Stock", "Sold", "Reserved"],
          default: "In Stock"
        },
        soldBillNumber: { type: String, default: null },
        soldDate: { type: Date, default: null }
      }
    ],

    category: {
      type: String,
      required: [true, "Product category is required"],
      trim: true,
      enum: {
        values: [
          "Mobile",
          "Television",
          "Appliances",
          "Tablet",
          "Charger",
          "Cable",
          "Earphones",
          "Headphones",
          "Power Bank",
          "Cover",
          "Screen Protector",
          "Smartwatch",
          "Speaker",
          "Memory Card",
          "Accessories",
          "Other"
        ],
        message: "Please select a valid product category"
      }
    },

    brand: {
      type: String,
      trim: true,
      default: "",
      maxlength: [80, "Brand cannot exceed 80 characters"]
    },

    model: {
      type: String,
      trim: true,
      default: "",
      maxlength: [100, "Model cannot exceed 100 characters"]
    },

    ram: {
      type: String,
      trim: true,
      default: "",
      maxlength: [40, "RAM specification cannot exceed 40 characters"]
    },

    storage: {
      type: String,
      trim: true,
      default: "",
      maxlength: [40, "Storage specification cannot exceed 40 characters"]
    },

    color: {
      type: String,
      trim: true,
      default: "",
      maxlength: [50, "Color cannot exceed 50 characters"]
    },

    variants: [
      {
        ram: { type: String, trim: true, default: "" },
        storage: { type: String, trim: true, default: "" },
        color: { type: String, trim: true, default: "" },
        price: { type: Number, default: 0 },
        sku: { type: String, trim: true, default: "" }
      }
    ],

    purchasePrice: {
      type: Number,
      required: [true, "Purchase price is required"],
      min: [0, "Purchase price cannot be negative"],
      validate: {
        validator: Number.isFinite,
        message: "Purchase price must be a valid number"
      }
    },

    sellingPrice: {
      type: Number,
      required: [true, "Selling price is required"],
      min: [0, "Selling price cannot be negative"],
      validate: {
        validator: Number.isFinite,
        message: "Selling price must be a valid number"
      }
    },

    stockQuantity: {
      type: Number,
      required: [true, "Stock quantity is required"],
      default: 0,
      min: [0, "Stock quantity cannot be negative"],
      validate: {
        validator: Number.isSafeInteger,
        message: "Stock quantity must be a whole number"
      }
    },

    lowStockThreshold: {
      type: Number,
      default: 5,
      min: [0, "Low-stock threshold cannot be negative"],
      validate: {
        validator: Number.isSafeInteger,
        message: "Low-stock threshold must be a whole number"
      }
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [1000, "Description cannot exceed 1000 characters"]
    },

    imageUrl: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Image URL cannot exceed 500 characters"]
    },

    images: {
      type: [String],
      default: []
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// SKU is unique. Barcode is unique only when supplied.
productSchema.index(
  { barcode: 1 },
  {
    unique: true,
    partialFilterExpression: {
      barcode: { $type: "string" }
    }
  }
);

// High-performance compound & text indexes for 10ms search, category filtering & sorting
productSchema.index({ isActive: 1, category: 1, sellingPrice: 1 });
productSchema.index({ isActive: 1, brand: 1 });
productSchema.index({ name: "text", brand: "text", model: "text", category: "text" });
productSchema.index({ "imeiRecords.imei1": 1 });
productSchema.index({ "imeiRecords.imei2": 1 });

productSchema.pre("save", function () {
  if (Array.isArray(this.imeiRecords) && this.imeiRecords.length > 0) {
    const available = this.imeiRecords.find(r => r.status === "In Stock");
    if (available) {
      if (available.imei1) this.imei1 = available.imei1;
      if (available.imei2) this.imei2 = available.imei2;
      if (available.serialNumber) this.serialNumber = available.serialNumber;
    }
  } else if (this.imei1 || this.imei2) {
    this.imeiRecords = [
      {
        imei1: this.imei1 || "",
        imei2: this.imei2 || "",
        serialNumber: this.serialNumber || "",
        status: "In Stock"
      }
    ];
  }
});

productSchema.virtual("isLowStock").get(function () {
  return this.stockQuantity <= this.lowStockThreshold;
});

productSchema.virtual("potentialProfit").get(function () {
  return this.sellingPrice - this.purchasePrice;
});

productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

module.exports =
  mongoose.models.Product ||
  mongoose.model("Product", productSchema);
