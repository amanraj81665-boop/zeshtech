
require("dotenv").config();

const mongoose = require("mongoose");
const readline = require("readline");
const User = require("../models/User");
const { hashPassword } = require("../utils/password");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function resetPassword() {
  try {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();

    if (!email) {
      throw new Error("ADMIN_EMAIL missing in .env");
    }

    const password = await new Promise(resolve => {
      rl.question("Enter new password (minimum 8 characters): ", resolve);
    });

    if (!password || password.length < 8 || password.length > 72) {
      throw new Error("Password must be between 8 and 72 characters");
    }

    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI missing in .env");
    }

    await mongoose.connect(process.env.MONGO_URI);

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      throw new Error(
        "Admin email not found. Check ADMIN_EMAIL and MONGO_URI in .env"
      );
    }

    if (user.role !== "admin") {
      throw new Error("This account is not an admin");
    }

    user.password = await hashPassword(password);
    await user.save();

    console.log("Admin password reset successful.");
    console.log("Email:", user.email);
    console.log("Role:", user.role);
  } catch (error) {
    console.error("Failed:", error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
    await mongoose.disconnect().catch(() => {});
  }
}

resetPassword();
