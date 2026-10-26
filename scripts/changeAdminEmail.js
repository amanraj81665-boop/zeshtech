
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function changeAdminEmail() {
  try {
    const newEmail = (await new Promise(resolve =>
      rl.question("Enter your real email: ", resolve)
    )).trim().toLowerCase();

    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      throw new Error("Please enter a valid email.");
    }

    await mongoose.connect(process.env.MONGO_URI);

    const admin = await User.findOne({ role: "admin" });
    if (!admin) throw new Error("Admin account not found.");

    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser && existingUser._id.toString() !== admin._id.toString()) {
      throw new Error("This email is already used by another account.");
    }

    admin.email = newEmail;
    await admin.save();

    console.log("Admin email updated successfully.");
    console.log("Admin role:", admin.role);
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    rl.close();
    await mongoose.disconnect().catch(() => {});
  }
}

changeAdminEmail();
