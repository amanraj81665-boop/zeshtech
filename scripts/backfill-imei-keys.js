"use strict";

require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Product = require("../models/Product");

function normalize(value) {
  return String(value || "").trim().toUpperCase();
}

function getKeys(product) {
  const keys = [];
  const add = value => {
    const key = normalize(value);
    if (key) keys.push(key);
  };

  if (Array.isArray(product.imeiRecords) && product.imeiRecords.length) {
    for (const record of product.imeiRecords) {
      add(record.imei1);
      add(record.imei2);
    }
  } else {
    add(product.imei1);
    add(product.imei2);
  }

  return [...new Set(keys)];
}

async function main() {
  await connectDB();

  const products = await Product.find({})
    .select("+imeiKeys name sku imei1 imei2 imeiRecords")
    .lean();

  const owners = new Map();
  const conflicts = [];

  for (const product of products) {
    for (const key of getKeys(product)) {
      const previous = owners.get(key);
      if (previous && String(previous._id) !== String(product._id)) {
        conflicts.push({
          imei: key,
          firstProduct: previous.name || previous.sku || String(previous._id),
          duplicateProduct: product.name || product.sku || String(product._id)
        });
      } else {
        owners.set(key, product);
      }
    }
  }

  if (conflicts.length) {
    console.error("Duplicate IMEIs already exist. Resolve these records before creating the unique index:");
    console.error(JSON.stringify(conflicts, null, 2));
    process.exitCode = 2;
    return;
  }

  const operations = products.map(product => ({
    updateOne: {
      filter: { _id: product._id },
      update: { $set: { imeiKeys: getKeys(product) } }
    }
  }));

  if (operations.length) {
    await Product.bulkWrite(operations, { ordered: true });
  }

  await Product.collection.createIndex(
    { imeiKeys: 1 },
    { unique: true, partialFilterExpression: { imeiKeys: { $type: "string" } }, name: "unique_product_imei_keys" }
  );

  console.log(`IMEI migration complete. Indexed ${owners.size} unique IMEI values across ${products.length} products.`);
}

main()
  .catch(error => {
    console.error("IMEI migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
