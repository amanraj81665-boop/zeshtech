"use strict";

require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Product = require("../models/Product");

const stockData = [
  // --- TELEVISIONS ---
  {
    name: "Redmi Fire TV 43 Inch 4K UHD",
    sku: "TV-REDMI-43-4K",
    barcode: "890123450001",
    category: "Television",
    brand: "Redmi",
    model: '43" Fire TV 4K Ultra HD',
    purchasePrice: 19500,
    sellingPrice: 23999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/smart-tv-43.jpg",
    description: "43 Inch 4K Ultra HD Fire TV with Alexa Voice Remote, HDR10, Dolby Audio, Dual Band Wi-Fi."
  },
  {
    name: "itel G43QFX 43 Inch 4K Smart TV",
    sku: "TV-ITEL-G43QFX",
    barcode: "890123450002",
    category: "Television",
    brand: "itel",
    model: 'G43QFX 43" 4K UHD',
    purchasePrice: 21000,
    sellingPrice: 25999,
    stockQuantity: 2,
    lowStockThreshold: 1,
    imageUrl: "/images/products/smart-tv-43.jpg",
    description: "itel 43 Inch 4K UHD Frameless Smart TV, 24W Stereo Speakers, Dolby Audio, Google TV OS."
  },
  {
    name: "itel A43QUX 43 Inch 4K Smart TV",
    sku: "TV-ITEL-A43QUX",
    barcode: "890123450003",
    category: "Television",
    brand: "itel",
    model: 'A43QUX 43" 4K UHD',
    purchasePrice: 20000,
    sellingPrice: 24999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/smart-tv-43.jpg",
    description: "itel A43QUX 43 Inch Ultra HD 4K Android Smart TV with Chromecast Built-in and HDR Display."
  },
  {
    name: "itel G32QHX 32 Inch HD Smart TV",
    sku: "TV-ITEL-G32QHX",
    barcode: "890123450004",
    category: "Television",
    brand: "itel",
    model: 'G32QHX 32" HD Ready',
    purchasePrice: 14000,
    sellingPrice: 17999,
    stockQuantity: 2,
    lowStockThreshold: 1,
    imageUrl: "/images/products/smart-tv-32.jpg",
    description: "itel 32 Inch HD Ready Bezel-Less Smart TV with Clear Audio, Pre-installed OTT Apps."
  },
  {
    name: "Redmi 32 Inch Fire TV HD",
    sku: "TV-REDMI-32-HD",
    barcode: "890123450005",
    category: "Television",
    brand: "Redmi",
    model: '32" Fire TV HD Ready',
    purchasePrice: 12000,
    sellingPrice: 14999,
    stockQuantity: 2,
    lowStockThreshold: 1,
    imageUrl: "/images/products/smart-tv-32.jpg",
    description: "Redmi 32 Inch HD Ready Smart Fire TV, Alexa Voice Remote, Prime Video & Netflix."
  },

  // --- APPLIANCES (WASHING MACHINES) ---
  {
    name: "itel 8 Kg Washing Machine",
    sku: "APPL-ITEL-WM-8KG",
    barcode: "890123450006",
    category: "Appliances",
    brand: "itel",
    model: "8 Kg High Efficiency Wash",
    purchasePrice: 10200,
    sellingPrice: 12999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/washing-machine.jpg",
    description: "itel 8 Kg Semi-Automatic Washing Machine, Rust-Proof Body, Powerful Deep Clean Pulsator."
  },
  {
    name: "itel 9.5 Kg Washing Machine",
    sku: "APPL-ITEL-WM-95KG",
    barcode: "890123450007",
    category: "Appliances",
    brand: "itel",
    model: "9.5 Kg Jumbo Wash",
    purchasePrice: 11800,
    sellingPrice: 14999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/washing-machine.jpg",
    description: "itel 9.5 Kg Large Capacity Washing Machine with Storm Pulsator & High-Speed Spin Dry."
  },
  {
    name: "itel 10.5 Kg Washing Machine",
    sku: "APPL-ITEL-WM-105KG",
    barcode: "890123450008",
    category: "Appliances",
    brand: "itel",
    model: "10.5 Kg Max Capacity",
    purchasePrice: 13200,
    sellingPrice: 16999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/washing-machine.jpg",
    description: "itel 10.5 Kg Heavy Duty Washing Machine with Extra Large Tub, Lint Filter, Fast Drying."
  },

  // --- KEYPAD MOBILES ---
  {
    name: "Nokia Keypad Mobile Dual SIM",
    sku: "NOKIA-KEYPAD-105",
    barcode: "890123450009",
    category: "Mobile",
    brand: "Nokia",
    model: "Nokia 105 / 110 Dual SIM",
    purchasePrice: 1150,
    sellingPrice: 1499,
    stockQuantity: 5,
    lowStockThreshold: 2,
    imageUrl: "/images/products/nokia-keypad.jpg",
    description: "Nokia classic keypad mobile phone with long-lasting battery, built-in flashlight, wireless FM radio."
  },
  {
    name: "HMD Keypad Mobile 4G Dual SIM",
    sku: "HMD-KEYPAD-105",
    barcode: "890123450010",
    category: "Mobile",
    brand: "HMD",
    model: "HMD 105 4G Keypad",
    purchasePrice: 990,
    sellingPrice: 1299,
    stockQuantity: 4,
    lowStockThreshold: 2,
    imageUrl: "/images/products/hmd-keypad.jpg",
    description: "HMD 105 Keypad Mobile with built-in UPI Pay, crystal clear voice calls, durable polycarbonate body."
  },

  // --- OPPO SERIES ---
  {
    name: "OPPO A6 Pro (8GB/128GB) - Gold",
    sku: "OPPO-A6PRO-8128-GLD",
    barcode: "890123450011",
    category: "Mobile",
    brand: "OPPO",
    model: "A6 Pro 8GB/128GB Gold",
    purchasePrice: 29000,
    sellingPrice: 32999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/oppo-a6-pro-gold.jpg",
    description: "OPPO A6 Pro in Gold with 8GB RAM, 128GB ROM, 64MP AI Triple Camera, 67W SUPERVOOC charging."
  },
  {
    name: "OPPO K14x (4GB/128GB) - Ice Blue",
    sku: "OPPO-K14X-4128-BLU",
    barcode: "890123450012",
    category: "Mobile",
    brand: "OPPO",
    model: "K14x 5G 4GB/128GB Ice Blue",
    purchasePrice: 19800,
    sellingPrice: 22999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/oppo-k14x-blue.jpg",
    description: "OPPO K14x 5G in Ice Blue with 4GB RAM, 128GB ROM, 5000mAh Battery, 50MP AI Dual Camera."
  },
  {
    name: "OPPO K14x (4GB/64GB) - Violet",
    sku: "OPPO-K14X-464-VLT",
    barcode: "890123450013",
    category: "Mobile",
    brand: "OPPO",
    model: "K14x 5G 4GB/64GB Violet",
    purchasePrice: 15200,
    sellingPrice: 17999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/oppo-k14x-violet.jpg",
    description: "OPPO K14x 5G in Violet with 4GB RAM, 64GB ROM, 90Hz Display, 5G Dual SIM connectivity."
  },
  {
    name: "OPPO A6x (4GB/128GB) - Green",
    sku: "OPPO-A6X-4128-GRN",
    barcode: "890123450014",
    category: "Mobile",
    brand: "OPPO",
    model: "A6x 4GB/128GB Green",
    purchasePrice: 20500,
    sellingPrice: 23999,
    stockQuantity: 2,
    lowStockThreshold: 1,
    imageUrl: "/images/products/oppo-a6x-green.jpg",
    description: "OPPO A6x in Forest Green with 4GB RAM, 128GB ROM, 5000mAh Battery, 90Hz HD+ Display."
  },
  {
    name: "OPPO A6x (4GB/64GB) - Blue",
    sku: "OPPO-A6X-464-BLU",
    barcode: "890123450015",
    category: "Mobile",
    brand: "OPPO",
    model: "A6x 4GB/64GB Blue",
    purchasePrice: 16800,
    sellingPrice: 19999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/oppo-a6x-blue.jpg",
    description: "OPPO A6x in Ocean Blue with 4GB RAM, 64GB ROM, 5000mAh Battery, 33W Fast Charging."
  },
  {
    name: "OPPO A6x (6GB/128GB) - Green",
    sku: "OPPO-A6X-6128-GRN",
    barcode: "890123450016",
    category: "Mobile",
    brand: "OPPO",
    model: "A6x 6GB/128GB Green",
    purchasePrice: 23500,
    sellingPrice: 26999,
    stockQuantity: 2,
    lowStockThreshold: 1,
    imageUrl: "/images/products/oppo-a6x-green.jpg",
    description: "OPPO A6x in Emerald Green with 6GB RAM, 128GB ROM, Octa-Core Processor, AI Portrait Camera."
  },
  {
    name: "OPPO A6 (4GB/128GB) - White (Non Tie-Up)",
    sku: "OPPO-A6-4128-WHT-NT",
    barcode: "890123450017",
    category: "Mobile",
    brand: "OPPO",
    model: "A6 4GB/128GB White Non Tie-Up",
    purchasePrice: 26000,
    sellingPrice: 29999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/oppo-a6-white.jpg",
    description: "OPPO A6 in Pearl White (Non Tie-Up Unlocked Stock), 4GB RAM, 128GB ROM, 5000mAh Battery."
  },
  {
    name: "OPPO A6 (4GB/128GB) - White",
    sku: "OPPO-A6-4128-WHT",
    barcode: "890123450018",
    category: "Mobile",
    brand: "OPPO",
    model: "A6 4GB/128GB White",
    purchasePrice: 27500,
    sellingPrice: 31999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/oppo-a6-white.jpg",
    description: "OPPO A6 in Pearl White, 4GB RAM, 128GB ROM, AMOLED 90Hz Display, 33W Fast Charging."
  },
  {
    name: "OPPO A6 (6GB/256GB) - White",
    sku: "OPPO-A6-6256-WHT",
    barcode: "890123450019",
    category: "Mobile",
    brand: "OPPO",
    model: "A6 6GB/256GB White",
    purchasePrice: 30500,
    sellingPrice: 34999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/oppo-a6-white.jpg",
    description: "OPPO A6 in Pearl White with 6GB RAM, 256GB Massive Storage, 50MP AI Dual Camera."
  },
  {
    name: "OPPO F35 (6GB/128GB) - Blue",
    sku: "OPPO-F35-6128-BLU",
    barcode: "890123450020",
    category: "Mobile",
    brand: "OPPO",
    model: "F35 5G 6GB/128GB Blue",
    purchasePrice: 34500,
    sellingPrice: 39999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/oppo-f35-blue.jpg",
    description: "OPPO F35 5G in Horizon Blue with 6GB RAM, 128GB ROM, Ultra-Slim Portrait Camera, 67W Charging."
  },
  {
    name: "OPPO F35 Pro (8GB/128GB) - Brown",
    sku: "OPPO-F35PRO-8128-BRN",
    barcode: "890123450021",
    category: "Mobile",
    brand: "OPPO",
    model: "F35 Pro 5G 8GB/128GB Brown",
    purchasePrice: 43500,
    sellingPrice: 49999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/oppo-f35-pro-brown.jpg",
    description: "OPPO F35 Pro 5G in Premium Leather Brown with 8GB RAM, 128GB ROM, Sony Flagship Sensor."
  },

  // --- SAMSUNG SERIES ---
  {
    name: "Samsung Galaxy S25 (12GB/256GB) - Ice Blue",
    sku: "SAMS-S25-12256-ICE",
    barcode: "890123450022",
    category: "Mobile",
    brand: "Samsung",
    model: "Galaxy S25 12GB/256GB Ice Blue",
    purchasePrice: 54000,
    sellingPrice: 60999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/samsung-s25-iceblue.jpg",
    description: "Samsung Galaxy S25 in Ice Blue with 12GB RAM, 256GB ROM, Snapdragon 8 Elite, Galaxy AI."
  },
  {
    name: "Samsung Galaxy S25 (12GB/128GB) - Silver Shadow",
    sku: "SAMS-S25-12128-SLV",
    barcode: "890123450023",
    category: "Mobile",
    brand: "Samsung",
    model: "Galaxy S25 12GB/128GB Silver Shadow",
    purchasePrice: 48500,
    sellingPrice: 54999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/samsung-s25-silver.jpg",
    description: "Samsung Galaxy S25 in Silver Shadow with 12GB RAM, 128GB ROM, Dynamic AMOLED 2X 120Hz."
  },
  {
    name: "Samsung Galaxy S25 FE (8GB/128GB) - Jet Black",
    sku: "SAMS-S25FE-8128-BLK",
    barcode: "890123450024",
    category: "Mobile",
    brand: "Samsung",
    model: "Galaxy S25 FE 8GB/128GB Jet Black",
    purchasePrice: 39500,
    sellingPrice: 44999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/samsung-s25fe-black.jpg",
    description: "Samsung Galaxy S25 FE in Jet Black with 8GB RAM, 128GB ROM, Flagship Grade Cameras & Display."
  },
  {
    name: "Samsung Galaxy S25 Ultra (12GB/256GB) - White Silver",
    sku: "SAMS-S25U-12256-WSLV",
    barcode: "890123450025",
    category: "Mobile",
    brand: "Samsung",
    model: "Galaxy S25 Ultra 5G 12GB/256GB White Silver",
    purchasePrice: 79000,
    sellingPrice: 87999,
    stockQuantity: 2,
    lowStockThreshold: 1,
    imageUrl: "/images/products/samsung-s25-ultra.jpg",
    description: "Samsung Galaxy S25 Ultra 5G in Titanium White Silver, S-Pen, 200MP Quad Pro Camera, 5000mAh."
  },
  {
    name: "Samsung Galaxy A17 (6GB/128GB) - Black (With Adapter)",
    sku: "SAMS-A17-6128-BLK",
    barcode: "890123450026",
    category: "Mobile",
    brand: "Samsung",
    model: "Galaxy A17 5G 6GB/128GB Black + Adapter",
    purchasePrice: 24500,
    sellingPrice: 28199,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/samsung-a17-black.jpg",
    description: "Samsung Galaxy A17 5G in Black with 6GB RAM, 128GB ROM, Original 25W Fast Adapter Included."
  },
  {
    name: "Samsung Galaxy A07 (6GB/128GB) - Light Violet (With Adapter)",
    sku: "SAMS-A07-6128-VLT",
    barcode: "890123450027",
    category: "Mobile",
    brand: "Samsung",
    model: "Galaxy A07 6GB/128GB Light Violet + Adapter",
    purchasePrice: 20800,
    sellingPrice: 24199,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/samsung-a07-violet.jpg",
    description: "Samsung Galaxy A07 in Light Violet with 6GB RAM, 128GB ROM, Original 25W Adapter Included."
  },

  // --- APPLE IPHONE & IPAD ---
  {
    name: "Apple iPhone 17 (256GB) - White",
    sku: "APPL-IP17-256-WHT",
    barcode: "890123450028",
    category: "Mobile",
    brand: "Apple",
    model: "iPhone 17 256GB White",
    purchasePrice: 91000,
    sellingPrice: 99900,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/iphone-17-white.jpg",
    description: "Apple iPhone 17 256GB in White with A19 Bionic Chip, Super Retina XDR OLED, Dynamic Island."
  },
  {
    name: "Apple iPhone 17 (256GB) - Lavender",
    sku: "APPL-IP17-256-LVD",
    barcode: "890123450029",
    category: "Mobile",
    brand: "Apple",
    model: "iPhone 17 256GB Lavender",
    purchasePrice: 91000,
    sellingPrice: 99900,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/iphone-17-lavender.jpg",
    description: "Apple iPhone 17 256GB in Lavender Light Purple with A19 Bionic Chip, 48MP Fusion Camera."
  },
  {
    name: "Apple iPhone 18 Pro (256GB) - Black",
    sku: "APPL-IP18P-256-BLK",
    barcode: "890123450030",
    category: "Mobile",
    brand: "Apple",
    model: "iPhone 18 Pro 256GB Space Black",
    purchasePrice: 149000,
    sellingPrice: 169000,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/iphone-18pro-black.jpg",
    description: "Apple iPhone 18 Pro 256GB in Space Black Titanium, Triple Pro Camera, LiDAR, Action Button."
  },
  {
    name: "Apple iPad A16 Wi-Fi (128GB) - Blue",
    sku: "APPL-PAD-A16-128-BLU",
    barcode: "890123450031",
    category: "Tablet",
    brand: "Apple",
    model: 'iPad 10.9" A16 Bionic Wi-Fi 128GB Blue',
    purchasePrice: 43500,
    sellingPrice: 49900,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/ipad-a16-blue.jpg",
    description: "Apple iPad 10.9-inch in Ocean Blue with A16 Bionic Chip, 128GB Storage, Wi-Fi, Apple Pencil Support."
  },

  // --- POCO SERIES ---
  {
    name: "Poco C85x (4GB/64GB) - Green",
    sku: "POCO-C85X-464-GRN",
    barcode: "890123450032",
    category: "Mobile",
    brand: "Poco",
    model: "C85x 4GB/64GB Green",
    purchasePrice: 11500,
    sellingPrice: 13999,
    stockQuantity: 2,
    lowStockThreshold: 1,
    imageUrl: "/images/products/poco-c85x-green.jpg",
    description: "Poco C85x in Meadow Green with 4GB RAM, 64GB ROM, 5000mAh Battery, 50MP AI Dual Camera."
  },
  {
    name: "Poco M8x (4GB/128GB) - Blue",
    sku: "POCO-M8X-4128-BLU",
    barcode: "890123450033",
    category: "Mobile",
    brand: "Poco",
    model: "M8x 5G 4GB/128GB Blue",
    purchasePrice: 15200,
    sellingPrice: 17999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/poco-m8x-blue.jpg",
    description: "Poco M8x 5G in Electric Blue with 4GB RAM, 128GB ROM, 120Hz FHD+ Display, Dual SIM 5G."
  },
  {
    name: "Poco M8x (6GB/128GB) - Blue",
    sku: "POCO-M8X-6128-BLU",
    barcode: "890123450034",
    category: "Mobile",
    brand: "Poco",
    model: "M8x 5G 6GB/128GB Blue",
    purchasePrice: 17000,
    sellingPrice: 19999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/poco-m8x-blue.jpg",
    description: "Poco M8x 5G in Electric Blue with 6GB RAM, 128GB ROM, 33W Fast Charging, 5000mAh Battery."
  },
  {
    name: "Poco M8x (6GB/128GB) - Black",
    sku: "POCO-M8X-6128-BLK",
    barcode: "890123450035",
    category: "Mobile",
    brand: "Poco",
    model: "M8x 5G 6GB/128GB Black",
    purchasePrice: 17000,
    sellingPrice: 19999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/poco-m8x-black.jpg",
    description: "Poco M8x 5G in Stealth Black with 6GB RAM, 128GB ROM, 120Hz FHD+, MediaTek 5G."
  },
  {
    name: "Poco M8x (4GB/128GB) - Black",
    sku: "POCO-M8X-4128-BLK",
    barcode: "890123450036",
    category: "Mobile",
    brand: "Poco",
    model: "M8x 5G 4GB/128GB Black",
    purchasePrice: 15200,
    sellingPrice: 17999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/poco-m8x-black.jpg",
    description: "Poco M8x 5G in Stealth Black with 4GB RAM, 128GB ROM, 5000mAh Battery, 50MP AI Camera."
  },

  // --- AI PLUS ---
  {
    name: "AI Plus (8GB/128GB) - Golden Blue Fusion",
    sku: "AIPLUS-8128-FUS",
    barcode: "890123450037",
    category: "Mobile",
    brand: "AI Plus",
    model: "AI Plus 5G 8GB/128GB Golden Blue Fusion",
    purchasePrice: 15200,
    sellingPrice: 17999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/ai-plus-fusion.jpg",
    description: "AI Plus 5G in Golden Blue Fusion Dual Tone, 8GB RAM, 128GB ROM, AI Photography Suite."
  },

  // --- NOTHING PHONE ---
  {
    name: "Nothing Phone 4a (6GB/128GB) - White",
    sku: "NOTH-4A-6128-WHT",
    barcode: "890123450038",
    category: "Mobile",
    brand: "Nothing",
    model: "Phone (4a) 6GB/128GB White",
    purchasePrice: 32000,
    sellingPrice: 36999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/nothing-phone-white.jpg",
    description: "Nothing Phone (4a) in Transparent White, 6GB RAM, 128GB ROM, Glyph Light Interface, Nothing OS."
  },
  {
    name: "Nothing Phone 4b (6GB/128GB) - White",
    sku: "NOTH-4B-6128-WHT",
    barcode: "890123450039",
    category: "Mobile",
    brand: "Nothing",
    model: "Phone (4b) 6GB/128GB White",
    purchasePrice: 25500,
    sellingPrice: 29999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/nothing-phone-white.jpg",
    description: "Nothing Phone (4b) in White, 6GB RAM, 128GB ROM, AMOLED 120Hz Display, Dual 50MP Cameras."
  },

  // --- MOTOROLA SERIES ---
  {
    name: "Moto 8/128 Blue (Non Tie-Up)",
    sku: "MOTO-8128-BLU-NT",
    barcode: "890123450040",
    category: "Mobile",
    brand: "Motorola",
    model: "Moto G/Edge 8GB/128GB Blue Non Tie-Up",
    purchasePrice: 21500,
    sellingPrice: 24999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/moto-blue.jpg",
    description: "Motorola in Blue (Non Tie-Up), 8GB RAM, 128GB ROM, Stock Android, Stereo Speakers with Dolby Atmos."
  },
  {
    name: "Moto 4/128 Blue (Non Tie-Up)",
    sku: "MOTO-4128-BLU-NT",
    barcode: "890123450041",
    category: "Mobile",
    brand: "Motorola",
    model: "Moto G 4GB/128GB Blue Non Tie-Up",
    purchasePrice: 16000,
    sellingPrice: 18999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/moto-blue.jpg",
    description: "Motorola in Blue (Non Tie-Up), 4GB RAM, 128GB ROM, 5000mAh Battery, Fast 30W Charging."
  },
  {
    name: "Moto 8/128 Black (Tie-Up)",
    sku: "MOTO-8128-BLK-TU",
    barcode: "890123450042",
    category: "Mobile",
    brand: "Motorola",
    model: "Moto G 8GB/128GB Black Tie-Up",
    purchasePrice: 21500,
    sellingPrice: 24999,
    stockQuantity: 2,
    lowStockThreshold: 1,
    imageUrl: "/images/products/moto-black.jpg",
    description: "Motorola in Matte Black (Finance Tie-Up), 8GB RAM, 128GB ROM, High Speed Performance."
  },
  {
    name: "Moto 4/128 Black (Tie-Up) - 18K",
    sku: "MOTO-4128-BLK-TU-18K",
    barcode: "890123450043",
    category: "Mobile",
    brand: "Motorola",
    model: "Moto G 4GB/128GB Black Tie-Up",
    purchasePrice: 16000,
    sellingPrice: 18999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/moto-black.jpg",
    description: "Motorola in Matte Black (Tie-Up), 4GB RAM, 128GB ROM, 120Hz Display, 50MP Quad Pixel Camera."
  },
  {
    name: "Moto 4/128 Black (Tie-Up) - 24K",
    sku: "MOTO-4128-BLK-TU-24K",
    barcode: "890123450044",
    category: "Mobile",
    brand: "Motorola",
    model: "Moto Edge 4GB/128GB Black Tie-Up",
    purchasePrice: 21500,
    sellingPrice: 24999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/moto-black.jpg",
    description: "Motorola in Premium Black (Tie-Up), 4GB RAM, 128GB ROM, TurboPower Fast Charging."
  },
  {
    name: "Moto 4/128 Capri (Tie-Up)",
    sku: "MOTO-4128-CPR-TU",
    barcode: "890123450045",
    category: "Mobile",
    brand: "Motorola",
    model: "Moto G 4GB/128GB Capri Tie-Up",
    purchasePrice: 16000,
    sellingPrice: 18999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/moto-capri.jpg",
    description: "Motorola in Capri Teal Blue (Tie-Up), 4GB RAM, 128GB ROM, IP52 Water Repellent Design."
  },
  {
    name: "Moto 8/128 Capri (Tie-Up)",
    sku: "MOTO-8128-CPR-TU",
    barcode: "890123450046",
    category: "Mobile",
    brand: "Motorola",
    model: "Moto G 8GB/128GB Capri Tie-Up",
    purchasePrice: 21500,
    sellingPrice: 24999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/moto-capri.jpg",
    description: "Motorola in Capri Teal Blue (Tie-Up), 8GB RAM, 128GB ROM, Octa-Core Processor, Dolby Audio."
  },

  // --- REALME SERIES ---
  {
    name: "Realme P4 Lite (4GB/128GB) - Green",
    sku: "RLME-P4L-4128-GRN",
    barcode: "890123450047",
    category: "Mobile",
    brand: "Realme",
    model: "P4 Lite 4GB/128GB Green",
    purchasePrice: 16000,
    sellingPrice: 18999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/realme-p4lite-green.jpg",
    description: "Realme P4 Lite in Cyber Green, 4GB RAM, 128GB ROM, Ultra-Slim Profile, 5000mAh Battery."
  },

  // --- VIVO SERIES ---
  {
    name: "Vivo T5 Lite (6GB/256GB) - Twilight Shadow",
    sku: "VIVO-T5L-6256-TWL",
    barcode: "890123450048",
    category: "Mobile",
    brand: "Vivo",
    model: "T5 Lite 5G 6GB/256GB Twilight Shadow",
    purchasePrice: 23500,
    sellingPrice: 26999,
    stockQuantity: 4,
    lowStockThreshold: 1,
    imageUrl: "/images/products/vivo-t5lite-twilight.jpg",
    description: "Vivo T5 Lite 5G in Twilight Shadow with 6GB RAM, 256GB Storage, MediaTek Dimensity, 50MP Aura Light."
  },
  {
    name: "Vivo T5 Lite (6GB/128GB) - Wave Blue",
    sku: "VIVO-T5L-6128-BLU",
    barcode: "890123450049",
    category: "Mobile",
    brand: "Vivo",
    model: "T5 Lite 5G 6GB/128GB Wave Blue",
    purchasePrice: 19800,
    sellingPrice: 22999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/vivo-t5lite-blue.jpg",
    description: "Vivo T5 Lite 5G in Wave Blue with 6GB RAM, 128GB ROM, Ultra Slim 3D Curved Body, 5000mAh."
  },
  {
    name: "Vivo T5x (6GB/128GB) - Silver",
    sku: "VIVO-T5X-6128-SLV",
    barcode: "890123450050",
    category: "Mobile",
    brand: "Vivo",
    model: "T5x 5G 6GB/128GB Silver",
    purchasePrice: 24000,
    sellingPrice: 27999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/vivo-t5x-silver.jpg",
    description: "Vivo T5x 5G in Mystic Silver with 6GB RAM, 128GB ROM, 6000mAh Massive Battery, 44W FlashCharge."
  },
  {
    name: "Vivo T5x (8GB/256GB) - Silver",
    sku: "VIVO-T5X-8256-SLV",
    barcode: "890123450051",
    category: "Mobile",
    brand: "Vivo",
    model: "T5x 5G 8GB/256GB Silver",
    purchasePrice: 29500,
    sellingPrice: 33999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/vivo-t5x-silver.jpg",
    description: "Vivo T5x 5G in Mystic Silver with 8GB RAM, 256GB ROM, 8GB Extended RAM, 6000mAh Battery."
  },
  {
    name: "Vivo T5x (6GB/128GB) - Green",
    sku: "VIVO-T5X-6128-GRN",
    barcode: "890123450052",
    category: "Mobile",
    brand: "Vivo",
    model: "T5x 5G 6GB/128GB Green",
    purchasePrice: 24000,
    sellingPrice: 27999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/vivo-t5x-green.jpg",
    description: "Vivo T5x 5G in Aurora Green with 6GB RAM, 128GB ROM, 6000mAh Battery, Snapdragon 5G Processor."
  },

  // --- REDMI SERIES ---
  {
    name: "Redmi 15A (4GB/64GB) - Purple",
    sku: "RDMI-15A-464-PRP",
    barcode: "890123450053",
    category: "Mobile",
    brand: "Redmi",
    model: "Redmi 15A 4GB/64GB Purple",
    purchasePrice: 15200,
    sellingPrice: 17999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/redmi-purple.jpg",
    description: "Redmi 15A in Lavender Purple with 4GB RAM, 64GB ROM, 5000mAh Long Battery, HD+ Display."
  },
  {
    name: "Redmi 17 (8GB/128GB) - Blue",
    sku: "RDMI-17-8128-BLU",
    barcode: "890123450054",
    category: "Mobile",
    brand: "Redmi",
    model: "Redmi 17 5G 8GB/128GB Blue",
    purchasePrice: 23000,
    sellingPrice: 26999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/redmi-blue.jpg",
    description: "Redmi 17 5G in Starry Blue with 8GB RAM, 128GB ROM, 108MP Pro Camera, 67W Turbo Charge."
  },
  {
    name: "Redmi 17c (4GB/128GB) - Purple",
    sku: "RDMI-17C-4128-PRP",
    barcode: "890123450055",
    category: "Mobile",
    brand: "Redmi",
    model: "Redmi 17c 4GB/128GB Purple",
    purchasePrice: 18000,
    sellingPrice: 20999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/redmi-purple.jpg",
    description: "Redmi 17c in Twilight Purple with 4GB RAM, 128GB ROM, 5000mAh Battery, 50MP AI Dual Camera."
  },
  {
    name: "Redmi 15 (6GB/128GB) - Purple",
    sku: "RDMI-15-6128-PRP",
    barcode: "890123450056",
    category: "Mobile",
    brand: "Redmi",
    model: "Redmi 15 5G 6GB/128GB Purple",
    purchasePrice: 21500,
    sellingPrice: 24999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/redmi-purple.jpg",
    description: "Redmi 15 5G in Crystal Purple with 6GB RAM, 128GB ROM, Snapdragon 4 Gen 2 Processor, 5G."
  },
  {
    name: "Redmi A7 Pro 4G (4GB/64GB) - Black",
    sku: "RDMI-A7P-464-BLK",
    barcode: "890123450057",
    category: "Mobile",
    brand: "Redmi",
    model: "Redmi A7 Pro 4G 4GB/64GB Black",
    purchasePrice: 11900,
    sellingPrice: 13999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/redmi-black.jpg",
    description: "Redmi A7 Pro 4G in Midnight Black with 4GB RAM, 64GB ROM, Dual SIM 4G, 5000mAh Battery."
  },
  {
    name: "Redmi A7 (3GB/64GB) - Blue",
    sku: "RDMI-A7-364-BLU",
    barcode: "890123450058",
    category: "Mobile",
    brand: "Redmi",
    model: "Redmi A7 3GB/64GB Blue",
    purchasePrice: 10800,
    sellingPrice: 12999,
    stockQuantity: 1,
    lowStockThreshold: 1,
    imageUrl: "/images/products/redmi-blue.jpg",
    description: "Redmi A7 in Lake Blue with 3GB RAM, 64GB ROM, Clean Android Go, Octa-Core Processor."
  }
];

async function seedDatabase() {
  try {
    console.log("Connecting to MongoDB Atlas...");
    await connectDB();

    console.log("Cleaning up old test dummy products...");
    await Product.deleteMany({});

    console.log(`Seeding ${stockData.length} official inventory items into MongoDB Atlas...`);
    let totalStock = 0;
    let totalInventoryValue = 0;

    for (const item of stockData) {
      await Product.create(item);
      totalStock += item.stockQuantity;
      totalInventoryValue += item.sellingPrice * item.stockQuantity;
    }

    console.log("=================================================");
    console.log(" SUCCESS: All Products Seeded Permanently in MongoDB!");
    console.log(` Total Products Seeded: ${stockData.length}`);
    console.log(` Total Physical Units (Stock): ${totalStock} units`);
    console.log(` Total Stock Retail Value: ₹${totalInventoryValue.toLocaleString("en-IN")}`);
    console.log("=================================================");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seedDatabase();
