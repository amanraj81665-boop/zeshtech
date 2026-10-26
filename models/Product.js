
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
