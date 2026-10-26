require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../models/Product");

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB Atlas");

  // 1. Ensure Vivo T5x Green is stock = 1
  await Product.updateOne(
    { sku: "VIVO-T5X-6128-GRN" },
    { $set: { stockQuantity: 1, isActive: true } }
  );

  // 2. Fetch all products and verify
  const products = await Product.find().lean();
  console.log(`Audited ${products.length} products in DB.`);

  let totalQty = 0;
  let totalVal = 0;
  products.forEach(p => {
    totalQty += p.stockQuantity;
    totalVal += (p.sellingPrice * p.stockQuantity);
  });

  console.log(`Total inventory units: ${totalQty}`);
  console.log(`Total inventory retail value: Rs. ${totalVal.toLocaleString("en-IN")}`);
  process.exit(0);
}

main().catch(err => {
  console.error("Audit error:", err);
  process.exit(1);
});
