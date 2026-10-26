"use strict";

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254
    },
    password: {
      type: String,
      required: false,
      select: false
    },
    phone: {
      type: String,
      default: "",
      trim: true
    },
    authProvider: {
      type: String,
      default: "local",
      enum: ["local", "google", "facebook", "whatsapp", "apple"]
    },
    avatar: {
      type: String,
      default: ""
    },
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
