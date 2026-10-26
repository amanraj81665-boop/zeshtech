
require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../models/User");

async function createAdmin() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from .env");
    }

    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();

    if (!email) {
      throw new Error("ADMIN_EMAIL is missing from .env");
    }

    await mongoose.connect(process.env.MONGO_URI);

    const user = await User.findOne({ email });

    if (!user) {
      throw new Error(
        "Admin email not found. Register this account first."
      );
    }

    user.role = "admin";
    await user.save();

    console.log(`Admin role assigned to: ${user.email}`);
    console.log("Now log in again to obtain a new admin token.");
  } catch (error) {
    console.error("Admin setup failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

createAdmin();
