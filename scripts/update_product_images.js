const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const Product = require("../models/Product");

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(uri);
  console.log("Connected to MongoDB Atlas");

  const updates = [
    { sku: "APPL-ITEL-WM-8KG", imageUrl: "/images/products/itel-wm-8kg.webp" },
    { sku: "APPL-ITEL-WM-95KG", imageUrl: "/images/products/itel-wm-95kg.webp" },
    { sku: "APPL-ITEL-WM-105KG", imageUrl: "/images/products/itel-wm-105kg.webp" },
    { sku: "TV-ITEL-G43QFX", imageUrl: "/images/products/itel-tv-43.jpg" },
    { sku: "TV-ITEL-A43QUX", imageUrl: "/images/products/itel-tv-43a.jpg" },
    { sku: "TV-ITEL-G32QHX", imageUrl: "/images/products/itel-tv-32.jpg" },
    { sku: "TV-REDMI-43-4K", imageUrl: "/images/products/smart-tv-43.jpg" },
    { sku: "TV-REDMI-32-HD", imageUrl: "/images/products/smart-tv-32.jpg" }
  ];

  for (const item of updates) {
    const res = await Product.updateOne({ sku: item.sku }, { $set: { imageUrl: item.imageUrl } });
    console.log(`Updated ${item.sku} -> ${item.imageUrl}: matched ${res.matchedCount}, modified ${res.modifiedCount}`);
  }

  // Audit all products to ensure every imageUrl corresponds to an existing file
  const fs = require("fs");
  const path = require("path");
  const publicDir = path.join(__dirname, "..", "public");

  const products = await Product.find().lean();
  let missing = 0;
  for (const p of products) {
    const localPath = path.join(publicDir, p.imageUrl);
    if (!fs.existsSync(localPath)) {
      console.error(`MISSING IMAGE for ${p.sku}: ${localPath}`);
      missing++;
    }
  }

  if (missing === 0) {
    console.log(`SUCCESS! All ${products.length} products have verified image files on disk.`);
  } else {
    console.warn(`WARNING: ${missing} products have missing image files.`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error("Update error:", err);
  process.exit(1);
});
