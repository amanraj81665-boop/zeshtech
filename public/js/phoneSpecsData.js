"use strict";

/**
 * ZESH TECH — Rich Specifications, Expert Curations & Comparison Engine
 * Provides official brand-authorized structured specs for all smartphones,
 * smart budget comparison with AI recommendations, and category curations.
 */

window.ZeshSpecs = (function () {
  // Master Specs Knowledge Base
  const specsDB = {
    // --- APPLE IPHONE ---
    "iphone 18 pro": {
      brand: "Apple",
      model: "iPhone 18 Pro",
      chipset: "Apple A19 Pro Bionic (3nm)",
      cpu: "6-Core CPU (2 Performance + 4 Efficiency)",
      gpu: "6-Core Apple GPU with Hardware Ray Tracing",
      display: '6.3" Super Retina XDR OLED, 120Hz ProMotion, 2000 nits Peak, Ceramic Shield',
      resolution: "2556 x 1179 Pixels FHD+",
      refreshRate: "120Hz Dynamic",
      rearCamera: "48MP Fusion (OIS, f/1.78) + 48MP Ultra Wide (Macro) + 48MP 5x Telephoto OIS",
      frontCamera: "12MP TrueDepth Camera with Autofocus (f/1.9)",
      video: "4K Dolby Vision HDR @ 60fps, 4K ProRes 120fps, Spatial Video 3D",
      battery: "3582 mAh with 30W Fast Charging + 15W MagSafe Wireless",
      os: "iOS 18 (Apple Intelligence, 5 Years Guaranteed OS Updates)",
      uiName: "Apple iOS",
      ramRom: "8GB RAM | 256GB NVMe Storage",
      build: "Grade 5 Titanium Frame with Textured Matte Glass Back",
      sim: "Dual SIM (Nano SIM + eSIM)",
      weight: "187 g",
      inBox: "iPhone, USB-C Charge Cable (1m), Documentation",
      zeshScore: 9.8,
      categoryTags: ["camera", "gaming", "ui"],
      bestForBadge: "👑 Ultimate Flagship of the Year",
      cameraScore: 9.9,
      gamingScore: 9.8,
      uiScore: 9.9,
      batteryScore: 8.8,
      highlights: [
        "Pro Triple 48MP Camera system with 5x Optical Periscope Zoom",
        "A19 Pro 3nm Silicon — World's fastest mobile CPU & GPU",
        "Super Retina XDR 120Hz ProMotion with Dynamic Island",
        "Aerospace Grade Titanium body & Action Button"
      ],
      pros: ["Industry-leading 4K video recording", "Insane A19 Pro performance", "Clean ad-free iOS with 5yr updates"],
      cons: ["No charger in box", "Premium price segment"]
    },

    "iphone 17": {
      brand: "Apple",
      model: "iPhone 17",
      chipset: "Apple A18 Bionic (3nm)",
      cpu: "6-Core CPU with 16-Core Neural Engine",
      gpu: "5-Core Apple GPU with Ray Tracing",
      display: '6.1" Super Retina XDR OLED, 120Hz ProMotion, 2000 nits Peak',
      resolution: "2556 x 1179 Pixels FHD+",
      refreshRate: "120Hz ProMotion",
      rearCamera: "48MP Main Fusion (Sensor-Shift OIS, f/1.6) + 12MP Ultra Wide (120° FOV)",
      frontCamera: "12MP TrueDepth Camera with Autofocus",
      video: "4K Dolby Vision HDR @ 60fps, Cinematic Mode 4K HDR 30fps",
      battery: "3561 mAh with 27W Fast Charge + MagSafe Wireless",
      os: "iOS 18 (Apple Intelligence Enabled)",
      uiName: "Apple iOS",
      ramRom: "8GB RAM | 256GB Storage",
      build: "Aerospace Aluminium Frame with Color-Infused Glass",
      sim: "Dual SIM (Nano SIM + eSIM)",
      weight: "171 g",
      inBox: "iPhone 17, USB-C Charge Cable, SIM Ejector, Manuals",
      zeshScore: 9.5,
      categoryTags: ["camera", "ui"],
      bestForBadge: "🥇 Best Compact Premium Phone",
      cameraScore: 9.4,
      gamingScore: 9.3,
      uiScore: 9.9,
      batteryScore: 8.9,
      highlights: [
        "48MP Dual Fusion Camera with 2x Telephoto optical crop",
        "Super Retina XDR 120Hz Display with Dynamic Island",
        "Apple A18 3nm Chip with Apple Intelligence",
        "All-day battery life with USB-C convenience"
      ],
      pros: ["Zero lag, silky smooth 120Hz", "Outstanding portrait photography", "Super lightweight & compact"],
      cons: ["No dedicated 5x telephoto lens"]
    },

    // --- SAMSUNG GALAXY ---
    "s25 ultra": {
      brand: "Samsung",
      model: "Galaxy S25 Ultra 5G",
      chipset: "Qualcomm Snapdragon 8 Elite for Galaxy (3nm)",
      cpu: "Octa-Core Oryon CPU (Up to 4.47 GHz)",
      gpu: "Adreno 830 GPU with Unreal Engine 5 Ray Tracing",
      display: '6.8" Dynamic AMOLED 2X, 1-120Hz LTPO, 2600 nits, Anti-Reflective Gorilla Armor 2',
      resolution: "3120 x 1440 Pixels Quad HD+",
      refreshRate: "120Hz LTPO Adaptive",
      rearCamera: "200MP Main (OIS, f/1.7) + 50MP Periscope (5x Optical OIS) + 50MP Ultrawide + 10MP Telephoto (3x OIS)",
      frontCamera: "12MP Dual Pixel AF (f/2.2)",
      video: "8K @ 30fps, 4K @ 120fps Slow-mo, 10-bit HDR10+",
      battery: "5000 mAh with 45W Super Fast Charging 2.0 + 15W Wireless",
      os: "Android 15 with One UI 7 (7 Years OS & Security Updates)",
      uiName: "Samsung One UI 7 (Galaxy AI)",
      ramRom: "12GB LPDDR5X RAM | 256GB UFS 4.0 Storage",
      build: "Titanium Frame with S-Pen Stylus Built-in (IP68 Water Resistant)",
      sim: "Dual SIM (Nano + Nano / eSIM)",
      weight: "219 g",
      inBox: "Galaxy S25 Ultra, Built-in S-Pen, Type-C to Type-C Cable, SIM Ejector",
      zeshScore: 9.7,
      categoryTags: ["camera", "gaming", "ui"],
      bestForBadge: "👑 Android King & Zoom Master",
      cameraScore: 9.8,
      gamingScore: 9.7,
      uiScore: 9.6,
      batteryScore: 9.3,
      highlights: [
        "200MP Quad Telephoto Camera with 100x Space Zoom",
        "Built-in S-Pen with Air Actions and Note taking",
        "Snapdragon 8 Elite (3nm) — Ultimate gaming performance",
        "7 Years of OS upgrades & Full Galaxy AI Suite"
      ],
      pros: ["Best zoom camera in the world", "S-Pen built-in stylus", "Flawless Quad HD+ anti-reflective screen"],
      cons: ["Large form factor (heavier)", "Adapter sold separately"]
    },

    "s25": {
      brand: "Samsung",
      model: "Galaxy S25 5G",
      chipset: "Qualcomm Snapdragon 8 Elite (3nm)",
      cpu: "Octa-Core Oryon CPU (4.32 GHz)",
      gpu: "Adreno 830 GPU",
      display: '6.2" Dynamic AMOLED 2X, 120Hz Adaptive, 2600 nits, Gorilla Glass Victus 2',
      resolution: "2340 x 1080 Pixels Full HD+",
      refreshRate: "120Hz Adaptive",
      rearCamera: "50MP Dual Pixel OIS (f/1.8) + 12MP Ultra Wide + 10MP 3x Telephoto OIS",
      frontCamera: "12MP Dual Pixel AF",
      video: "8K @ 30fps, 4K @ 60fps",
      battery: "4000 mAh with 25W Fast Charging + Wireless PowerShare",
      os: "Android 15 with One UI 7 (7 Years OS Updates)",
      uiName: "Samsung One UI 7",
      ramRom: "12GB RAM | 128GB/256GB UFS 4.0 Storage",
      build: "Armor Aluminum Frame with Matte Glass Back (IP68)",
      sim: "Dual SIM 5G",
      weight: "167 g",
      inBox: "Handset, USB Type-C Cable, SIM Tool",
      zeshScore: 9.4,
      categoryTags: ["gaming", "ui", "camera"],
      bestForBadge: "🚀 Best Compact Android Flagship",
      cameraScore: 9.3,
      gamingScore: 9.6,
      uiScore: 9.6,
      batteryScore: 8.6,
      highlights: [
        "Snapdragon 8 Elite flagship chip in a compact body",
        "12GB RAM standard across all models",
        "50MP Triple Pro Camera with 3x Optical Zoom",
        "7 Years Guaranteed Android updates"
      ],
      pros: ["Extremely comfortable one-hand feel (167g)", "Top-tier gaming power", "Full Galaxy AI features"],
      cons: ["25W charging speed"]
    },

    "s25 fe": {
      brand: "Samsung",
      model: "Galaxy S25 FE",
      chipset: "Samsung Exynos 2400e (4nm Flagship)",
      cpu: "Deca-Core (10-Core) CPU",
      gpu: "Xclipse 940 GPU (AMD RDNA 3 Architecture)",
      display: '6.7" Dynamic AMOLED 2X, 120Hz, 1900 nits Peak',
      resolution: "2340 x 1080 Pixels FHD+",
      refreshRate: "120Hz",
      rearCamera: "50MP Main OIS (f/1.8) + 12MP Ultra Wide + 8MP 3x Telephoto OIS",
      frontCamera: "10MP Selfie Camera",
      video: "8K @ 30fps, 4K @ 60fps",
      battery: "4700 mAh with 25W Fast Charging + 15W Wireless",
      os: "Android 14/15 with One UI 6.1.1 / One UI 7",
      uiName: "Samsung One UI",
      ramRom: "8GB RAM | 128GB Storage",
      build: "Aluminum Frame with IP68 Water & Dust Resistance",
      sim: "Dual SIM 5G",
      weight: "213 g",
      inBox: "Handset, Data Cable (Type-C), Ejection Pin",
      zeshScore: 9.1,
      categoryTags: ["camera", "ui"],
      bestForBadge: "💎 Flagship Experience Under ₹45k",
      cameraScore: 9.1,
      gamingScore: 8.9,
      uiScore: 9.4,
      batteryScore: 8.9,
      highlights: [
        "Flagship 50MP Camera + 3x Optical Zoom Lens",
        "Vibrant 6.7\" Dynamic AMOLED 2X 120Hz Display",
        "Comprehensive Galaxy AI (Circle to Search, Live Translate)",
        "Premium IP68 Water & Dust Resistance"
      ],
      pros: ["3x Optical Telephoto under 45k", "Full IP68 water protection", "Long software support"],
      cons: ["25W charging speed"]
    },

    "a17": {
      brand: "Samsung",
      model: "Galaxy A17 5G",
      chipset: "Exynos 1380 Octa-Core (5nm)",
      cpu: "Octa-Core (4x2.4 GHz Cortex-A78 & 4x2.0 GHz Cortex-A55)",
      gpu: "Mali-G68 MP5",
      display: '6.6" Super AMOLED, 90Hz, 1000 nits High Brightness Mode',
      resolution: "2340 x 1080 Pixels FHD+",
      refreshRate: "90Hz",
      rearCamera: "50MP Main OIS (f/1.8) + 5MP Ultra Wide + 2MP Macro",
      frontCamera: "13MP Selfie Camera",
      video: "4K @ 30fps, 1080p @ 60fps",
      battery: "5000 mAh with 25W Fast Charging (Original Adapter Included in Box!)",
      os: "Android 14 with One UI 6 (4 OS Updates + 5 Years Security)",
      uiName: "Samsung One UI",
      ramRom: "6GB RAM | 128GB Storage (Expandable up to 1TB)",
      build: "Glass Look Glastic back with Knox Vault Hardware Security",
      sim: "Dual SIM 5G (Hybrid Slot)",
      weight: "198 g",
      inBox: "Galaxy A17, Official 25W Fast Power Adapter, Type-C Cable, Ejection Pin",
      zeshScore: 8.8,
      categoryTags: ["value", "ui"],
      bestForBadge: "🛡️ Best Samsung Brand Trust in ₹28k (Adapter Included)",
      cameraScore: 8.7,
      gamingScore: 8.2,
      uiScore: 9.2,
      batteryScore: 9.1,
      highlights: [
        "Official 25W Fast Adapter Included in Box",
        "50MP Main Camera with Optical Image Stabilization (OIS)",
        "Super AMOLED 90Hz FHD+ Display",
        "Samsung Knox Vault hardware security + 4 OS upgrades"
      ],
      pros: ["Charger included (rare for Samsung)", "Hardware Knox security", "OIS camera for shake-free photos"],
      cons: ["90Hz instead of 120Hz"]
    },

    "a07": {
      brand: "Samsung",
      model: "Galaxy A07 5G",
      chipset: "MediaTek Dimensity 6100+ (6nm 5G)",
      cpu: "Octa-Core 2.2 GHz",
      gpu: "Mali-G57 MC2",
      display: '6.6" HD+ 90Hz PLS LCD with Eye Comfort Shield',
      resolution: "1600 x 720 Pixels",
      refreshRate: "90Hz",
      rearCamera: "50MP AI Main (f/1.8) + 2MP Depth",
      frontCamera: "8MP Selfie Camera",
      video: "1080p @ 30fps",
      battery: "5000 mAh with 25W Fast Adapter Included in Box",
      os: "Android 14 with One UI Core",
      uiName: "Samsung One UI Core",
      ramRom: "6GB RAM | 128GB Storage",
      build: "Ergonomic curved body with Light Violet shimmer finish",
      sim: "Dual 5G SIM",
      weight: "195 g",
      inBox: "Handset, 25W Adapter, Cable, Quick Guide",
      zeshScore: 8.3,
      categoryTags: ["value"],
      bestForBadge: "⚡ Reliable Samsung Daily Driver with Adapter",
      cameraScore: 8.1,
      gamingScore: 7.8,
      uiScore: 8.9,
      batteryScore: 9.2,
      highlights: [
        "Original 25W Fast Adapter included in package",
        "50MP Clear Camera for crisp everyday photos",
        "5000 mAh Long-Lasting Battery",
        "Samsung One UI clean & familiar experience"
      ],
      pros: ["Adapter in box", "Sturdy build quality", "Great battery backup"],
      cons: ["HD+ resolution screen"]
    },

    // --- NOTHING PHONES ---
    "nothing phone 4a": {
      brand: "Nothing",
      model: "Nothing Phone 4a",
      chipset: "MediaTek Dimensity 7300-Pro (4nm TSMC)",
      cpu: "Octa-Core (4x2.5 GHz Cortex-A78 & 4x2.0 GHz Cortex-A55)",
      gpu: "Mali-G615 MC2 with HyperEngine Gaming",
      display: '6.7" Flexible AMOLED, 120Hz Adaptive, 1000 nits, 10-Bit 1.07 Billion Colors',
      resolution: "2412 x 1084 Pixels FHD+",
      refreshRate: "120Hz Flexible",
      rearCamera: "50MP Sony Sensor (OIS, f/1.88) + 50MP Ultra Wide (114° FOV)",
      frontCamera: "32MP Sony Selfie Camera",
      video: "4K @ 30fps, 1080p @ 60fps with Live Action HDR",
      battery: "5000 mAh with 45W Fast Charging (0-50% in 23 mins)",
      os: "Nothing OS 3.0 (Android 15) — 100% Ad-Free, Zero Bloatware",
      uiName: "Nothing OS (Zero Bloatware)",
      ramRom: "6GB RAM | 128GB UFS 2.2 Storage",
      build: "Iconic Transparent Back Design with Glyph LED Interface (IP54)",
      sim: "Dual SIM 5G",
      weight: "190 g",
      inBox: "Nothing Phone, Nothing Type-C Cable, SIM Ejector, Screen Protector Applied",
      zeshScore: 9.3,
      categoryTags: ["ui", "gaming", "camera"],
      bestForBadge: "✨ King of Clean Ad-Free Software & Unique Design",
      cameraScore: 9.1,
      gamingScore: 9.2,
      uiScore: 9.8,
      batteryScore: 9.2,
      highlights: [
        "Nothing OS 3.0: 100% Zero Bloatware, Zero Ads, Pure Aesthetic",
        "Dual 50MP Sony Cameras with Optical Image Stabilization (OIS)",
        "Dimensity 7300-Pro 4nm with Advanced Vapor Chamber Cooling",
        "Customizable Glyph Lighting Interface on the back"
      ],
      pros: ["Best software experience on Android", "Eye-catching transparent look", "Dual 50MP Sony sensors"],
      cons: ["No charger brick in box"]
    },

    "nothing phone 4b": {
      brand: "Nothing",
      model: "Nothing Phone 4b",
      chipset: "MediaTek Dimensity 7200 Ultra (4nm)",
      cpu: "Octa-Core Up to 2.8 GHz",
      gpu: "Mali-G610 MC4",
      display: '6.67" 120Hz AMOLED, 1300 nits Peak Brightness, HDR10+',
      resolution: "2400 x 1080 Pixels FHD+",
      refreshRate: "120Hz",
      rearCamera: "50MP Main (OIS) + 8MP Ultra Wide",
      frontCamera: "16MP HD Selfie",
      video: "4K @ 30fps, 1080p @ 60fps",
      battery: "5000 mAh with 45W Fast Charging",
      os: "Nothing OS 2.8 / 3.0 based on Android 14/15",
      uiName: "Nothing OS (Zero Bloatware)",
      ramRom: "6GB RAM | 128GB Storage",
      build: "Transparent Accent with Essential Glyph Light",
      sim: "Dual SIM 5G",
      weight: "188 g",
      inBox: "Phone, Nothing Custom Type-C Cable, SIM Tool",
      zeshScore: 9.2,
      categoryTags: ["ui", "gaming", "value"],
      bestForBadge: "🥈 Best Clean UI Phone Under ₹30,000",
      cameraScore: 8.8,
      gamingScore: 9.1,
      uiScore: 9.8,
      batteryScore: 9.1,
      highlights: [
        "Pure Clean UI with Zero Advertisements or Pre-installed Junk",
        "120Hz Smooth AMOLED Display with Punchy Colors",
        "4nm Energy Efficient Processor for all-day battery",
        "Nothing Glyph Interface for silent light notifications"
      ],
      pros: ["Unbeatable ad-free UI in 30k segment", "Distinctive design", "Great battery efficiency"],
      cons: ["Charger not included in retail box"]
    },

    // --- VIVO T SERIES ---
    "vivo t5 lite": {
      brand: "Vivo",
      model: "Vivo T5 Lite 5G",
      chipset: "MediaTek Dimensity 6300 (6nm High-Speed 5G)",
      cpu: "Octa-Core (2x2.4 GHz Cortex-A76 & 6x2.0 GHz Cortex-A55)",
      gpu: "Mali-G57 MC2",
      display: '6.67" Ultra-Smooth 120Hz AMOLED, 1200 nits Peak, 100% DCI-P3',
      resolution: "2400 x 1080 Pixels FHD+",
      refreshRate: "120Hz AMOLED",
      rearCamera: "50MP Sony AI Portrait Camera (f/1.8) + 2MP Bokeh Lens",
      frontCamera: "16MP HD Portrait Selfie (f/2.0)",
      video: "1080p @ 60fps, Super Night Video",
      battery: "5000 mAh with 44W FlashCharge (Charger in Box!)",
      os: "Funtouch OS 14 based on Android 14",
      uiName: "Vivo Funtouch OS",
      ramRom: "6GB RAM | 256GB Storage (Massive Segment-Leading Storage!)",
      build: "Ultra Slim 7.79mm Feather-light body with IP64 Dust & Water Resistance",
      sim: "Dual 5G SIM (Hybrid Slot)",
      weight: "185 g",
      inBox: "Vivo T5 Lite, 44W FlashCharge Adapter, Type-C Cable, Transparent Case, SIM Pin",
      zeshScore: 9.4,
      categoryTags: ["value", "camera", "battery"],
      bestForBadge: "🏆 UNDISPUTED #1 BEST ALL-ROUNDER IN ₹30,000 BUDGET",
      cameraScore: 9.1,
      gamingScore: 8.8,
      uiScore: 8.6,
      batteryScore: 9.4,
      verdict30k: "Iss 30k budget segment me 256GB massive storage, 120Hz smooth AMOLED display aur Sony camera ka sabse best balance milta hai! Sath me ₹3,000 cash bachat bhi hoti hai.",
      highlights: [
        "Segment-Leading 256GB Storage at just ₹26,999",
        "Vibrant 120Hz AMOLED Full HD+ Screen with In-Display Fingerprint",
        "50MP Sony Sensor with Super Night & Studio Portrait Modes",
        "Complete Box with 44W FlashCharger & Premium Case Included"
      ],
      pros: ["Huge 256GB storage for ₹26,999", "120Hz AMOLED display", "44W fast charger in box"],
      cons: ["Funtouch OS has a few pre-installed apps"]
    },

    "vivo t5x": {
      brand: "Vivo",
      model: "Vivo T5x 5G",
      chipset: "Qualcomm Snapdragon 6 Gen 1 (4nm Gaming Beast)",
      cpu: "Octa-Core (4x2.2 GHz Cortex-A78 & 4x1.8 GHz Cortex-A55)",
      gpu: "Adreno 710 with Gaming Frame Rate Booster",
      display: '6.72" 120Hz Ultra Vision Display, 1000 nits, TUV Rheinland Low Blue Light',
      resolution: "2408 x 1080 Pixels FHD+",
      refreshRate: "120Hz",
      rearCamera: "64MP Super Night OIS Camera + 2MP Bokeh + Aura Light Portrait",
      frontCamera: "16MP HD Selfie with Portrait Bokeh",
      video: "4K @ 30fps, 1080p @ 60fps with Ultra Stable OIS",
      battery: "6000 mAh Monster Battery with 44W FlashCharge (Charger Included)",
      os: "Funtouch OS 14 on Android 14",
      uiName: "Vivo Funtouch OS",
      ramRom: "6GB/8GB RAM | 128GB/256GB Storage",
      build: "3D Curved Ergonomic Design with IP64 Splash Resistance",
      sim: "Dual 5G SIM",
      weight: "199 g",
      inBox: "Handset, 44W FlashCharge Adapter, Type-C Cable, TPU Case, SIM Tool",
      zeshScore: 9.3,
      categoryTags: ["battery", "camera", "gaming"],
      bestForBadge: "🔋 6000mAh Battery Champion with 64MP OIS Camera",
      cameraScore: 9.2,
      gamingScore: 9.0,
      uiScore: 8.6,
      batteryScore: 9.9,
      verdict30k: "Agar aapko 2-din chalne wali 6000 mAh battery aur 64MP OIS camera chahiye under ₹30,000, toh Vivo T5x se behtar koi choice nahi hai!",
      highlights: [
        "Massive 6000 mAh 2-Day Battery Life with 44W Fast Charging",
        "64MP Ultra-Clear Camera with Optical Image Stabilization (OIS)",
        "Snapdragon 6 Gen 1 (4nm) — Silky 60FPS gaming in BGMI",
        "Dual Stereo Speakers with 300% Ultra Audio Boost"
      ],
      pros: ["Monster 6000mAh battery", "64MP OIS camera for night photography", "Snapdragon 4nm chip"],
      cons: ["Slightly thicker due to huge 6000mAh battery"]
    },

    // --- OPPO SERIES ---
    "oppo f35 pro": {
      brand: "OPPO",
      model: "OPPO F35 Pro 5G",
      chipset: "MediaTek Dimensity 7050 Octa-Core (6nm)",
      cpu: "Octa-Core (2x2.6 GHz Cortex-A78 & 6x2.0 GHz Cortex-A55)",
      gpu: "Mali-G68 MC4",
      display: '6.7" 120Hz 3D Curved AMOLED, 1.07 Billion Colors, HDR10+, 950 nits',
      resolution: "2412 x 1080 Pixels FHD+",
      refreshRate: "120Hz 3D Curved",
      rearCamera: "64MP Ultra-Clear Triple Camera (f/1.7, OIS) + 8MP Ultra Wide (112°) + 2MP Macro",
      frontCamera: "32MP Sony IMX709 Flagship Selfie Camera with Autofocus",
      video: "4K @ 30fps with Ultra Steady Video EIS/OIS",
      battery: "5000 mAh with 67W SUPERVOOC Flash Charge (0-50% in 18 Mins!)",
      os: "ColorOS 14 based on Android 14",
      uiName: "OPPO ColorOS",
      ramRom: "8GB LPDDR4X RAM | 128GB Storage (Up to 8GB Extended RAM)",
      build: "Ultra-Premium Vegan Leather Brown Finish with Borderless Curved Edges",
      sim: "Dual SIM 5G",
      weight: "182 g",
      inBox: "OPPO F35 Pro, 67W SUPERVOOC Power Adapter, Type-C Cable, Case, SIM Pin",
      zeshScore: 9.3,
      categoryTags: ["camera", "battery"],
      bestForBadge: "📸 Portrait Photography King with 3D Curved Display",
      cameraScore: 9.5,
      gamingScore: 8.8,
      uiScore: 8.8,
      batteryScore: 9.5,
      highlights: [
        "Flagship 32MP Sony IMX709 Sensor for DSLR-level selfies",
        "Blazing 67W SUPERVOOC Charger included in box",
        "Stunning 120Hz 3D Curved AMOLED Borderless Display",
        "Luxury Vegan Leather Brown back panel"
      ],
      pros: ["Best portrait camera in upper midrange", "Ultra-fast 67W charging", "3D Curved AMOLED beauty"],
      cons: ["128GB storage at ₹49k"]
    },

    "oppo f35": {
      brand: "OPPO",
      model: "OPPO F35 5G",
      chipset: "MediaTek Dimensity 7050 (6nm)",
      cpu: "Octa-Core 2.6 GHz",
      gpu: "Mali-G68 MC4",
      display: '6.7" 120Hz AMOLED Display, 950 nits',
      resolution: "2412 x 1080 Pixels FHD+",
      refreshRate: "120Hz",
      rearCamera: "64MP Main (OIS) + 8MP Wide + 2MP Macro",
      frontCamera: "32MP Selfie Camera",
      video: "4K @ 30fps",
      battery: "5000 mAh with 67W SUPERVOOC Fast Charge",
      os: "ColorOS 14 on Android 14",
      uiName: "OPPO ColorOS",
      ramRom: "6GB RAM | 128GB Storage",
      build: "Glow Design Horizon Blue with 7.54mm Ultra-Slim Body",
      sim: "Dual SIM 5G",
      weight: "177 g",
      inBox: "Handset, 67W Adapter, Type-C Cable, Protective Case",
      zeshScore: 9.1,
      categoryTags: ["camera", "battery"],
      bestForBadge: "⚡ Ultra-Slim Phone with 67W Flash Charge",
      cameraScore: 9.2,
      gamingScore: 8.7,
      uiScore: 8.8,
      batteryScore: 9.5,
      highlights: [
        "67W SUPERVOOC Fast Charging included",
        "64MP Ultra-Clear Camera with OIS",
        "Lightweight 177g body with slim 7.54mm profile",
        "120Hz AMOLED Vivid Screen"
      ],
      pros: ["Very slim and lightweight", "67W fast charging in box", "Great selfies"],
      cons: ["Mono speaker"]
    },

    "oppo a6": {
      brand: "OPPO",
      model: "OPPO A6",
      chipset: "Qualcomm Snapdragon 680 / 685 (6nm)",
      cpu: "Octa-Core 2.8 GHz",
      gpu: "Adreno 610",
      display: '6.56" 90Hz Sunlight AMOLED Display, 100% DCI-P3',
      resolution: "2400 x 1080 Pixels FHD+",
      refreshRate: "90Hz AMOLED",
      rearCamera: "50MP AI Main (f/1.8) + 2MP Portrait",
      frontCamera: "16MP AI Selfie",
      video: "1080p @ 30fps",
      battery: "5000 mAh with 33W SUPERVOOC Fast Charge",
      os: "ColorOS 14 on Android 14",
      uiName: "OPPO ColorOS",
      ramRom: "4GB/6GB RAM | 128GB/256GB Storage",
      build: "Pearl White Diamond Texture, Ultra-Durable Drop Resistance",
      sim: "Dual SIM 5G",
      weight: "180 g",
      inBox: "Handset, 33W Charger, USB Cable, Clear Case, SIM Tool",
      zeshScore: 8.9,
      categoryTags: ["value"],
      bestForBadge: "💎 Premium Diamond Glass Finish Under ₹30k",
      cameraScore: 8.7,
      gamingScore: 8.3,
      uiScore: 8.8,
      batteryScore: 9.2,
      verdict30k: "OPPO A6 un customers ke liye best hai jo elegant white design, AMOLED display aur 33W SUPERVOOC charging chahte hain.",
      highlights: [
        "Diamond Pearl White shimmering back design",
        "33W SUPERVOOC Fast Charging Adapter in Box",
        "FHD+ AMOLED Screen with High Sunlight Visibility",
        "Ultra-Volume Mode for loud 300% speaker sound"
      ],
      pros: ["Eye-catching design", "Bright AMOLED screen", "33W charger in box"],
      cons: ["90Hz instead of 120Hz"]
    },

    "oppo a6x": {
      brand: "OPPO",
      model: "OPPO A6x",
      chipset: "MediaTek Dimensity 6020 / Helio G85 (Octa-Core)",
      cpu: "Octa-Core 2.2 GHz",
      gpu: "Mali-G57",
      display: '6.56" 90Hz Color-Rich Eye Care Display',
      resolution: "1612 x 720 Pixels HD+",
      refreshRate: "90Hz",
      rearCamera: "50MP AI Main Camera + 2MP Portrait",
      frontCamera: "8MP Front Camera",
      video: "1080p @ 30fps",
      battery: "5000 mAh Long-Life Battery with 33W Fast Charging",
      os: "ColorOS 13.1 / 14 on Android 13/14",
      uiName: "OPPO ColorOS",
      ramRom: "4GB/6GB RAM | 64GB/128GB Storage",
      build: "Glowing Green / Blue Texture with Side Fingerprint",
      sim: "Dual SIM 5G",
      weight: "186 g",
      inBox: "Device, 33W Power Adapter, USB Cable, Case, SIM Pin",
      zeshScore: 8.5,
      categoryTags: ["value"],
      bestForBadge: "💰 Solid OPPO Reliability in ₹20k-₹26k",
      cameraScore: 8.4,
      gamingScore: 8.1,
      uiScore: 8.7,
      batteryScore: 9.2,
      highlights: [
        "5000 mAh All-Day Battery with 33W Fast Charging",
        "50MP AI Portrait Camera with Natural Skin Tones",
        "90Hz Smooth Scrolling Screen",
        "Rigorous 36-Month Fluency Protection certified"
      ],
      pros: ["Durable build quality", "Reliable battery backup", "Complete box accessory pack"],
      cons: ["HD+ display resolution"]
    },

    "oppo k14x": {
      brand: "OPPO",
      model: "OPPO K14x 5G",
      chipset: "MediaTek Dimensity 6100+ (6nm 5G)",
      cpu: "Octa-Core 2.2 GHz",
      gpu: "Mali-G57 MC2",
      display: '6.58" 90Hz Ultra Smooth Display, 180Hz Touch Sampling',
      resolution: "2408 x 1080 Pixels Full HD+",
      refreshRate: "90Hz",
      rearCamera: "50MP AI Ultra-Clear Main + 2MP Portrait",
      frontCamera: "8MP Selfie Camera",
      video: "1080p @ 30fps",
      battery: "5000 mAh with 33W SUPERVOOC Fast Charging",
      os: "ColorOS on Android 14",
      uiName: "OPPO ColorOS",
      ramRom: "4GB RAM | 64GB/128GB Storage",
      build: "Ice Blue & Violet Dual-Tone Finish with IP54 Splash Resistance",
      sim: "Dual 5G SIM",
      weight: "189 g",
      inBox: "Phone, 33W Adapter, USB Cable, Protective Case",
      zeshScore: 8.6,
      categoryTags: ["value"],
      bestForBadge: "⚡ 5G Speed & SUPERVOOC Charging Under ₹22k",
      cameraScore: 8.5,
      gamingScore: 8.4,
      uiScore: 8.7,
      batteryScore: 9.3,
      highlights: [
        "Dimensity 6100+ 6nm 5G Dual SIM connectivity",
        "33W SUPERVOOC Charger included in box",
        "50MP AI Dual Camera system",
        "Full HD+ 90Hz Display for clear multimedia"
      ],
      pros: ["5G dual SIM connectivity", "33W fast charging", "Crisp FHD+ resolution"],
      cons: ["Single speaker"]
    },

    // --- POCO SERIES ---
    "poco m8x": {
      brand: "Poco",
      model: "Poco M8x 5G",
      chipset: "Qualcomm Snapdragon 6 Gen 3 / 695 (6nm High Performance)",
      cpu: "Octa-Core 2.2 GHz",
      gpu: "Adreno 619 with Game Turbo 5.0",
      display: '6.67" 120Hz Full HD+ Turbo AMOLED, 1000 nits, Gorilla Glass 5',
      resolution: "2400 x 1080 Pixels FHD+",
      refreshRate: "120Hz",
      rearCamera: "50MP Dual Camera with Night Mode + 2MP Macro",
      frontCamera: "16MP Center Punch-Hole Selfie",
      video: "1080p @ 60fps",
      battery: "5000 mAh with 33W Fast Turbo Charging (Adapter in Box)",
      os: "Xiaomi HyperOS based on Android 14",
      uiName: "Xiaomi HyperOS",
      ramRom: "4GB/6GB RAM | 128GB Storage (Up to 1TB MicroSD)",
      build: "Classic Poco Two-Tone Camera Visor with IP53 Splash Resistance",
      sim: "Dual 5G SIM",
      weight: "188 g",
      inBox: "Handset, 33W Turbo Charger, Type-C Cable, Black TPU Case, SIM Tool",
      zeshScore: 9.0,
      categoryTags: ["gaming", "value"],
      bestForBadge: "🎮 Best Gaming & Performance King Under ₹20,000",
      cameraScore: 8.6,
      gamingScore: 9.2,
      uiScore: 8.5,
      batteryScore: 9.2,
      highlights: [
        "Snapdragon 5G Chipset with Game Turbo 5.0 optimization",
        "120Hz AMOLED Screen with punchy colors & deep blacks",
        "33W Turbo Charger included in box",
        "Dual 5G SIM with 7 5G bands support"
      ],
      pros: ["Best gaming performance under ₹20k", "120Hz AMOLED display", "Complete package with charger"],
      cons: ["HyperOS has recommendation cards"]
    },

    "poco c85x": {
      brand: "Poco",
      model: "Poco C85x",
      chipset: "MediaTek Helio G85 Gaming Processor (12nm)",
      cpu: "Octa-Core 2.0 GHz",
      gpu: "Mali-G52 MC2",
      display: '6.71" HD+ Large Display with Reading Mode',
      resolution: "1650 x 720 Pixels",
      refreshRate: "60Hz",
      rearCamera: "50MP AI Dual Camera (f/1.8)",
      frontCamera: "5MP Selfie Camera",
      video: "1080p @ 30fps",
      battery: "5000 mAh Long-Life Battery with 10W/18W Support",
      os: "MIUI / HyperOS for Poco on Android 13/14",
      uiName: "Poco OS",
      ramRom: "4GB RAM | 64GB Storage (Expandable up to 1TB)",
      build: "Textured Leather-Feel Back in Forest Green",
      sim: "Dual SIM + Dedicated MicroSD Slot",
      weight: "192 g",
      inBox: "Handset, Power Adapter, USB Cable, SIM Ejector",
      zeshScore: 8.4,
      categoryTags: ["value"],
      bestForBadge: "💰 Best Budget Smartphone Under ₹14,000",
      cameraScore: 8.2,
      gamingScore: 8.1,
      uiScore: 8.3,
      batteryScore: 9.1,
      highlights: [
        "50MP AI High Resolution Camera at budget price",
        "Huge 6.71\" Big Screen for YouTube, Movies & Calls",
        "5000 mAh Massive Battery lasting over 28 hours",
        "Dedicated Triple Card Slot (2 SIM + 1 Memory Card)"
      ],
      pros: ["Very affordable ₹13,999 price", "50MP main camera", "Dedicated memory card slot"],
      cons: ["60Hz screen", "Micro-USB or standard 10W charging"]
    },

    // --- MOTOROLA SERIES ---
    "moto 8/128": {
      brand: "Motorola",
      model: "Moto G Power / Edge (8GB/128GB)",
      chipset: "Qualcomm Snapdragon 695 / 6 Gen 1 (6nm 5G)",
      cpu: "Octa-Core 2.2 GHz",
      gpu: "Adreno 619",
      display: '6.55" 120Hz pOLED / IPS Display, 10-Bit Color, Dolby Atmos',
      resolution: "2400 x 1080 Pixels Full HD+",
      refreshRate: "120Hz",
      rearCamera: "50MP Main with OIS + 8MP Ultra Wide & Macro",
      frontCamera: "16MP Quad Pixel Selfie",
      video: "1080p @ 60fps with OIS",
      battery: "5000 mAh with 30W TurboPower Fast Charging",
      os: "Motorola Hello UI on Android 14 — 100% Clean Stock Android, No Ads",
      uiName: "Motorola Hello UI (Clean Android)",
      ramRom: "8GB RAM | 128GB Storage (Massive 8GB RAM in this budget!)",
      build: "Vegan Leather / Acrylic Glass with Water Repellent Design (IP52)",
      sim: "Dual 5G SIM",
      weight: "179 g",
      inBox: "Motorola Handset, 33W TurboPower Charger, Type-C Cable, Case, SIM Tool",
      zeshScore: 9.3,
      categoryTags: ["ui", "value", "gaming"],
      bestForBadge: "✨ Best 8GB RAM + Clean Ad-Free Stock Android in ₹24,999",
      cameraScore: 8.9,
      gamingScore: 9.0,
      uiScore: 9.7,
      batteryScore: 9.3,
      verdict30k: "Motorola 8/128 un logon ke liye perfect hai jinhe 8GB massive RAM, clean stock Android (bina kisi ad ya bloatware ke) aur stereo speakers chahiye!",
      highlights: [
        "Pure Clean Stock Android UI with zero ads or push spam notifications",
        "Massive 8GB RAM for ultra-smooth app switching and multitasking",
        "50MP Camera with Optical Image Stabilization (OIS)",
        "Stereo Speakers with Dolby Atmos sound tuning"
      ],
      pros: ["Zero ads / clean software", "8GB RAM standard", "Dolby Atmos stereo sound", "Charger in box"],
      cons: ["Slow software major update rollout"]
    },

    "moto 4/128": {
      brand: "Motorola",
      model: "Moto 4GB/128GB",
      chipset: "Snapdragon 695 5G (6nm)",
      cpu: "Octa-Core 2.2 GHz",
      gpu: "Adreno 619",
      display: '6.5" 120Hz FHD+ Display, Stereo Speakers',
      resolution: "2400 x 1080 Pixels FHD+",
      refreshRate: "120Hz",
      rearCamera: "50MP Quad Pixel Camera with OIS",
      frontCamera: "16MP Selfie",
      video: "1080p @ 60fps",
      battery: "5000 mAh with 20W/30W TurboPower",
      os: "Clean Android with Moto Gestures",
      uiName: "Motorola Hello UI",
      ramRom: "4GB RAM | 128GB Storage",
      build: "Water Repellent Body in Capri Blue & Jet Black",
      sim: "Dual 5G SIM",
      weight: "179 g",
      inBox: "Handset, TurboPower Charger, Cable, Case",
      zeshScore: 8.8,
      categoryTags: ["ui", "value"],
      bestForBadge: "✨ Cleanest Ad-Free Experience Under ₹19,000",
      cameraScore: 8.7,
      gamingScore: 8.6,
      uiScore: 9.6,
      batteryScore: 9.2,
      highlights: [
        "Clean Stock Android experience with famous Moto Chop-Chop flashlight gesture",
        "120Hz Smooth Display for jitter-free gaming & browsing",
        "50MP OIS Camera in sub-₹19k segment",
        "Dolby Atmos Stereo Speakers"
      ],
      pros: ["Ad-free clean software", "OIS camera under 19k", "Stereo sound"],
      cons: ["4GB RAM for basic users"]
    },

    // --- REDMI SERIES ---
    "redmi 17": {
      brand: "Redmi",
      model: "Redmi 17 5G",
      chipset: "Qualcomm Snapdragon 4 Gen 2 AE (4nm 5G)",
      cpu: "Octa-Core 2.3 GHz",
      gpu: "Adreno 613",
      display: '6.79" 120Hz FHD+ AdaptiveSync Display, Corning Gorilla Glass',
      resolution: "2460 x 1080 Pixels Full HD+",
      refreshRate: "120Hz",
      rearCamera: "50MP AI Dual Camera (f/1.8) + 2MP Depth",
      frontCamera: "8MP AI Selfie",
      video: "1080p @ 30fps",
      battery: "5160 mAh Long Battery with 45W Turbo Charging Support",
      os: "Xiaomi HyperOS on Android 14",
      uiName: "Xiaomi HyperOS",
      ramRom: "8GB RAM | 128GB Storage (Massive 8GB RAM!)",
      build: "Crystal Glass Back Design with IP53 Splash Resistance",
      sim: "Dual 5G SIM",
      weight: "199 g",
      inBox: "Redmi 17, Power Adapter, USB Type-C Cable, SIM Ejector, Protective Case",
      zeshScore: 9.0,
      categoryTags: ["value", "battery"],
      bestForBadge: "🚀 8GB RAM + Crystal Glass Back in ₹26,999",
      cameraScore: 8.6,
      gamingScore: 8.9,
      uiScore: 8.6,
      batteryScore: 9.5,
      verdict30k: "Redmi 17 un customers ke liye perfect hai jinhe 8GB massive RAM, 5160mAh battery aur premium glass back look chahiye under ₹30,000.",
      highlights: [
        "Massive 8GB RAM + 128GB Storage for fast multitasking",
        "Large 6.79\" 120Hz Full HD+ Immersive Display",
        "5160 mAh Big Battery with all-day backup",
        "Premium Crystal Glass Back look"
      ],
      pros: ["8GB RAM standard", "Huge 6.79-inch display", "Premium glass finish"],
      cons: ["Mono speaker"]
    },

    "redmi 15a": {
      brand: "Redmi",
      model: "Redmi 15A 5G",
      chipset: "Octa-Core 5G Processor",
      cpu: "Octa-Core (High Performance Cores)",
      gpu: "Mali-G57 MC2 GPU",
      display: '17.53 cm (6.9") 120Hz Smooth HD+ Adaptive Display',
      resolution: "1640 x 720 Pixels HD+",
      refreshRate: "120Hz Adaptive",
      rearCamera: "32MP AI Dual Camera with Night Mode",
      frontCamera: "8MP AI Selfie Camera",
      video: "1080p @ 30fps Full HD",
      battery: "6300 mAh (Typical) Massive Battery with 15W Fast Charging",
      os: "Xiaomi HyperOS based on Android 14",
      uiName: "Xiaomi HyperOS",
      ramRom: "4GB RAM | 128GB Storage",
      build: "IP52-rated Splash Resistant Body in Ace Black",
      sim: "Dual 5G SIM (Nano SIM + Nano SIM)",
      weight: "192 g",
      inBox: "Handset, Fast Charger, USB Type-C Cable, SIM Eject Tool, Quick Guide",
      zeshScore: 9.3,
      categoryTags: ["battery", "value"],
      bestForBadge: "🔋 6300mAh Battery Champion",
      cameraScore: 8.8,
      gamingScore: 8.9,
      uiScore: 9.2,
      batteryScore: 9.9,
      highlights: [
        "Massive 6300 mAh (Typical) Battery — Up to 2.5 Days Backup",
        "17.53 cm (6.9-inch class) 120Hz Smooth Adaptive Display",
        "32MP AI Dual Camera with Crisp Night & Portrait Modes",
        "Xiaomi HyperOS with Ultra-Fluid 5G Performance"
      ],
      customBadges: [
        { icon: "🔋", title: "6300 mAh", subtitle: "2.5-Day Battery" },
        { icon: "📸", title: "32MP AI", subtitle: "Dual Camera" },
        { icon: "📱", title: '6.9" 120Hz', subtitle: "Smooth Screen" },
        { icon: "⚡", title: "Xiaomi HyperOS", subtitle: "Fluid 5G OS" }
      ],
      pros: ["Huge 6300mAh battery", "Big 6.9\" 120Hz screen", "Fast Xiaomi HyperOS"],
      cons: ["15W standard charging speed"]
    },

    "redmi 15": {
      brand: "Redmi",
      model: "Redmi 15 5G",
      chipset: "Snapdragon 4 Gen 2 (4nm 5G)",
      cpu: "Octa-Core 2.2 GHz",
      gpu: "Adreno 613",
      display: '6.79" 90Hz FHD+ Display',
      resolution: "2460 x 1080 Pixels FHD+",
      refreshRate: "90Hz",
      rearCamera: "50MP AI Main + 2MP Depth",
      frontCamera: "8MP Front Camera",
      video: "1080p @ 30fps",
      battery: "5000 mAh with 33W Fast Charger Included in Box",
      os: "HyperOS on Android 14",
      uiName: "Xiaomi HyperOS",
      ramRom: "6GB RAM | 128GB Storage",
      build: "Dual Glass Design in Purple",
      sim: "Dual 5G SIM",
      weight: "199 g",
      inBox: "Handset, 33W Charger, USB Cable, Case",
      zeshScore: 8.8,
      categoryTags: ["value"],
      bestForBadge: "⚡ Reliable 6GB/128GB 5G All-Rounder at ₹24,999",
      cameraScore: 8.5,
      gamingScore: 8.7,
      uiScore: 8.6,
      batteryScore: 9.2,
      highlights: [
        "Snapdragon 4nm Power Efficient 5G Processor",
        "FHD+ Large Screen with vivid picture quality",
        "50MP AI Primary Camera",
        "33W Fast Charger included in box"
      ],
      pros: ["Solid 4nm Snapdragon performance", "Glass back panel", "Charger in box"],
      cons: ["90Hz instead of 120Hz"]
    },

    "redmi 17c": {
      brand: "Redmi",
      model: "Redmi 17c",
      chipset: "MediaTek Helio G85 Gaming Processor",
      cpu: "Octa-Core 2.0 GHz",
      gpu: "Mali-G52",
      display: '6.74" 90Hz HD+ Eye Care Display',
      resolution: "1600 x 720 Pixels",
      refreshRate: "90Hz",
      rearCamera: "50MP AI Dual Camera",
      frontCamera: "5MP Front Camera",
      video: "1080p @ 30fps",
      battery: "5000 mAh with 18W Fast Charging Support",
      os: "MIUI / HyperOS",
      uiName: "Xiaomi HyperOS",
      ramRom: "4GB RAM | 128GB Storage",
      build: "Sparkle Starry Purple Finish",
      sim: "Dual SIM + Dedicated Card Slot",
      weight: "192 g",
      inBox: "Handset, Power Adapter, Cable, Tool",
      zeshScore: 8.4,
      categoryTags: ["value"],
      bestForBadge: "💜 Stylish 128GB Storage Phone at ₹20,999",
      cameraScore: 8.2,
      gamingScore: 8.0,
      uiScore: 8.4,
      batteryScore: 9.1,
      highlights: [
        "128GB Big Storage for photos & videos",
        "50MP AI Primary Camera",
        "Large 6.74\" 90Hz Display",
        "5000 mAh Battery with Type-C"
      ],
      pros: ["128GB storage", "Dedicated microSD slot", "Pleasing purple finish"],
      cons: ["HD+ display"]
    },

    "redmi a7 pro": {
      brand: "Redmi",
      model: "Redmi A7 Pro 4G",
      chipset: "MediaTek Helio G36 / Octa-Core",
      cpu: "Octa-Core 2.2 GHz",
      gpu: "PowerVR GE8320",
      display: '6.52" HD+ Scratch-Resistant Display',
      resolution: "1600 x 720 Pixels",
      refreshRate: "60Hz",
      rearCamera: "8MP Dual AI Camera",
      frontCamera: "5MP Front Camera",
      video: "1080p @ 30fps",
      battery: "5000 mAh Long-Life Battery",
      os: "Clean Android 14 (Go Edition)",
      uiName: "Clean Android Go",
      ramRom: "4GB RAM | 64GB Storage",
      build: "Leather Texture Matte Black Back",
      sim: "Dual 4G SIM + MicroSD",
      weight: "192 g",
      inBox: "Phone, Adapter, Cable, Guide",
      zeshScore: 8.2,
      categoryTags: ["value"],
      bestForBadge: "💰 Best Entry-Level Smartphone Under ₹14,000",
      cameraScore: 7.8,
      gamingScore: 7.4,
      uiScore: 8.8,
      batteryScore: 9.2,
      highlights: [
        "Clean Android Go Edition with zero ads",
        "5000 mAh Massive Battery with 30-day standby",
        "Leather Texture scratch-resistant back",
        "Dual SIM 4G with VoLTE"
      ],
      pros: ["Clean Android without lag", "Long battery", "Affordable"],
      cons: ["Entry-level cameras"]
    },

    "redmi a7": {
      brand: "Redmi",
      model: "Redmi A7",
      chipset: "Octa-Core 2.0 GHz Processor",
      cpu: "Octa-Core",
      gpu: "Mali-G52",
      display: '6.52" HD+ Eye Care Display',
      resolution: "1600 x 720 Pixels",
      refreshRate: "60Hz",
      rearCamera: "8MP AI Camera",
      frontCamera: "5MP Selfie",
      video: "1080p @ 30fps",
      battery: "5000 mAh Battery",
      os: "Android Go Edition",
      uiName: "Clean Android Go",
      ramRom: "3GB RAM | 64GB Storage",
      build: "Classic Blue Finish",
      sim: "Dual SIM + MicroSD",
      weight: "192 g",
      inBox: "Phone, Adapter, Cable",
      zeshScore: 8.0,
      categoryTags: ["value"],
      bestForBadge: "📱 Most Affordable Smartphone at ₹12,999",
      cameraScore: 7.6,
      gamingScore: 7.2,
      uiScore: 8.7,
      batteryScore: 9.1,
      highlights: [
        "Budget-friendly price of ₹12,999",
        "5000 mAh Battery",
        "Dual SIM VoLTE support",
        "Clean Android Go UI"
      ],
      pros: ["Super budget friendly", "Long battery life"],
      cons: ["3GB RAM for basic apps"]
    },

    "realme p4 lite": {
      brand: "Realme",
      model: "Realme P4 Lite",
      chipset: "MediaTek Dimensity 6100+ 5G (6nm)",
      cpu: "Octa-Core 2.2 GHz",
      gpu: "Mali-G57 MC2",
      display: '6.67" 90Hz FHD+ Punch-Hole Display, 625 nits',
      resolution: "2400 x 1080 Pixels FHD+",
      refreshRate: "90Hz",
      rearCamera: "50MP AI Main (f/1.8) + 2MP Portrait",
      frontCamera: "8MP AI Selfie",
      video: "1080p @ 30fps",
      battery: "5000 mAh with 33W Dart / SuperVOOC Fast Charge",
      os: "realme UI 5.0 based on Android 14",
      uiName: "Realme UI",
      ramRom: "4GB RAM | 128GB Storage",
      build: "Feather Green Textured Back with Rainwater Smart Touch",
      sim: "Dual 5G SIM",
      weight: "188 g",
      inBox: "Handset, 33W Fast Charger, USB Cable, Case, SIM Ejector",
      zeshScore: 8.7,
      categoryTags: ["value"],
      bestForBadge: "⚡ 5G + 33W Dart Fast Charging at ₹18,999",
      cameraScore: 8.6,
      gamingScore: 8.5,
      uiScore: 8.6,
      batteryScore: 9.3,
      highlights: [
        "Fast 33W Dart Charging in box",
        "50MP AI Ultra-Clear Camera",
        "FHD+ 90Hz Punch-Hole Display",
        "Rainwater Smart Touch for wet hands usability"
      ],
      pros: ["33W charger in box", "FHD+ sharp display", "Good 5G speeds"],
      cons: ["Realme UI notification ads"]
    },

    "ai plus": {
      brand: "AI Plus",
      model: "AI Plus 5G",
      chipset: "Octa-Core 5G High Speed Processor",
      cpu: "Octa-Core 2.2 GHz",
      gpu: "Mali-G57",
      display: '6.6" 90Hz HD+ Smooth Display',
      resolution: "1612 x 720 Pixels",
      refreshRate: "90Hz",
      rearCamera: "50MP Dual AI Camera",
      frontCamera: "8MP AI Selfie",
      video: "1080p @ 30fps",
      battery: "5000 mAh with 18W Fast Charge",
      os: "Android 14",
      uiName: "Clean Android",
      ramRom: "8GB RAM | 128GB Storage (Huge 8GB RAM in ₹17k!)",
      build: "Golden Blue Fusion Dual Tone Finish",
      sim: "Dual 5G SIM",
      weight: "187 g",
      inBox: "Handset, Charger, Cable, Case",
      zeshScore: 8.6,
      categoryTags: ["value"],
      bestForBadge: "⭐ Massive 8GB RAM at Just ₹17,999",
      cameraScore: 8.3,
      gamingScore: 8.4,
      uiScore: 8.8,
      batteryScore: 9.2,
      highlights: [
        "Massive 8GB RAM for ₹17,999",
        "128GB Internal Storage",
        "Golden Blue Fusion premium back look",
        "5000 mAh Long Lasting Battery"
      ],
      pros: ["8GB RAM under 18k", "Distinctive golden blue color", "Charger in box"],
      cons: ["Newer brand"]
    }
  };

  /**
   * Smart Parser: Extracts RAM, ROM, Battery, Camera, Display, OS, and Color
   * from product description or product title if explicitly provided by admin.
   */
  function parseCustomSpecs(text, name = "") {
    if (!text && !name) return {};
    const combined = `${name || ""}\n${text || ""}`;
    const specs = {};

    // RAM & ROM combined patterns: e.g. "6GB/128GB", "6/128", "8GB + 256GB", "4GB RAM | 64GB ROM"
    let parsedRam = "";
    let parsedRom = "";

    const slashMatch = combined.match(/\b(\d+)\s*(?:GB)?\s*[/+]\s*(\d+)\s*(?:GB)?\b/i);
    if (slashMatch) {
      const r = parseInt(slashMatch[1], 10);
      const s = parseInt(slashMatch[2], 10);
      if (r <= 24 && s >= 16) {
        parsedRam = `${r}GB`;
        parsedRom = `${s}GB`;
      }
    }

    if (!parsedRam) {
      const ramMatch = combined.match(/(?:RAM|Memory)\s*[:\t\-]?\s*(\d+)\s*(?:GB)?/i) ||
                       combined.match(/(\d+)\s*GB\s*(?:RAM|LPDDR)/i);
      if (ramMatch && ramMatch[1]) {
        parsedRam = `${ramMatch[1]}GB`;
      }
    }

    if (!parsedRom) {
      const romMatch = combined.match(/(?:Internal\s*Storage|Storage|ROM)\s*[:\t\-]?\s*(\d+\s*(?:GB|TB))/i) ||
                       combined.match(/(\d+\s*(?:GB|TB))\s*(?:ROM|Storage|Internal)/i);
      if (romMatch && romMatch[1]) {
        parsedRom = romMatch[1].toUpperCase().replace(/\s+/, "");
      }
    }

    if (parsedRam && parsedRom) {
      specs.ramRom = `${parsedRam} RAM | ${parsedRom} Storage`;
      specs.ram = parsedRam;
      specs.rom = parsedRom;
    } else if (parsedRam) {
      specs.ramRom = `${parsedRam} RAM`;
      specs.ram = parsedRam;
    } else if (parsedRom) {
      specs.ramRom = `${parsedRom} Storage`;
      specs.rom = parsedRom;
    }

    // Color parsing
    const colMatch = combined.match(/(?:Colour|Color)\s*[:\t\-]?\s*([^\n\r,]+)/i);
    if (colMatch && colMatch[1]) {
      specs.color = colMatch[1].trim();
    }

    // Battery parsing
    const batMatch = combined.match(/Battery\s*[:\t\-]?\s*([^\n\r]+)/i) ||
                     combined.match(/(\d{4,5}\s*mAh[^\n\r,]*)/i);
    if (batMatch && batMatch[1]) {
      const rawBat = batMatch[1].split(/[,;\n]/)[0].replace(/\(Typical\)/i, "").trim();
      if (rawBat) specs.battery = rawBat.includes("mAh") ? rawBat : `${rawBat} mAh`;
    }

    // Charging parsing
    const chgMatch = combined.match(/(?:Charging\s*Support|Fast\s*Charging|Charging)\s*[:\t\-]?\s*([^\n\r,]+)/i);
    if (chgMatch && chgMatch[1] && specs.battery && !specs.battery.toLowerCase().includes("charg")) {
      specs.battery = `${specs.battery} with ${chgMatch[1].trim()} Fast Charging`;
    }

    // Rear Camera parsing
    const rearMatch = combined.match(/(?:Rear\s*Camera|Primary\s*Camera|Main\s*Camera)\s*[:\t\-]?\s*([^\n\r]+)/i) ||
                      combined.match(/(\d+\s*MP[^\n\r,]*(?:Camera|Dual|Triple|Quad|OIS)?)/i);
    if (rearMatch && rearMatch[1]) {
      specs.rearCamera = rearMatch[1].split(/[,;\n]/)[0].trim();
    }

    // Front Camera parsing
    const frontMatch = combined.match(/(?:Front\s*Camera|Selfie\s*Camera|Secondary\s*Camera)\s*[:\t\-]?\s*([^\n\r]+)/i);
    if (frontMatch && frontMatch[1]) {
      specs.frontCamera = frontMatch[1].split(/[,;\n]/)[0].trim();
    }

    // Display parsing
    const dispMatch = combined.match(/Display\s*[:\t\-]?\s*([^\n\r]+)/i) ||
                      combined.match(/Screen\s*[:\t\-]?\s*([^\n\r]+)/i);
    if (dispMatch && dispMatch[1]) {
      specs.display = dispMatch[1].split(/[\n\r]/)[0].trim();
    }

    // Refresh rate parsing
    const rrMatch = combined.match(/(?:Refresh\s*Rate|Screen\s*Refresh)\s*[:\t\-]?\s*([^\n\r]+)/i) ||
                    combined.match(/(\d{2,3}\s*Hz)/i);
    if (rrMatch && rrMatch[1]) {
      specs.refreshRate = rrMatch[1].split(/[,;\n]/)[0].trim();
    }

    // Processor / Chipset parsing
    const procMatch = combined.match(/(?:Processor|Chipset|CPU)\s*[:\t\-]?\s*([^\n\r]+)/i);
    if (procMatch && procMatch[1]) {
      specs.chipset = procMatch[1].split(/[\n\r]/)[0].trim();
    }

    // Operating System parsing
    const osMatch = combined.match(/(?:Operating\s*System|OS|Software)\s*[:\t\-]?\s*([^\n\r]+)/i);
    if (osMatch && osMatch[1]) {
      specs.os = osMatch[1].split(/[\n\r]/)[0].trim();
      specs.uiName = specs.os;
    }

    return specs;
  }

  /**
   * Helper: Matches product name/model against our specs database,
   * or falls back to an intelligent spec generator based on attributes.
   */
  function getPhoneSpecs(product) {
    if (!product) return null;
    const nameLower = (product.name || "").toLowerCase();
    const modelLower = (product.model || "").toLowerCase();
    const combined = `${nameLower} ${modelLower}`;

    // Exact or word-boundary key match in specsDB (sorted by key length descending)
    const sortedEntries = Object.entries(specsDB).sort((a, b) => b[0].length - a[0].length);
    for (const [key, val] of sortedEntries) {
      // Check word boundary so e.g. "redmi 15" does not falsely match "redmi 15a"
      const regex = new RegExp("(?:^|[^a-z0-9])" + key.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&") + "(?:$|[^a-z0-9])", "i");
      if (regex.test(combined) || combined === key) {
        const custom = parseCustomSpecs(product.description, product.name);
        const resolvedRamRom = custom.ramRom || val.ramRom;
        const resolvedBattery = custom.battery || val.battery;
        const resolvedCamera = custom.rearCamera || val.rearCamera;
        const resolvedDisplay = custom.display || val.display;
        const resolvedOS = custom.os || val.os;

        const customBadges = val.customBadges || [
          { icon: "🔋", title: resolvedBattery.split("with")[0].trim(), subtitle: "Long Lasting Battery" },
          { icon: "📸", title: resolvedCamera.split("+")[0].split("Camera")[0].trim() || "AI Camera", subtitle: "AI Portrait Camera" },
          { icon: "📱", title: resolvedDisplay.includes('"') ? resolvedDisplay.split('"')[0] + '"' : (resolvedDisplay.split("(")[0].trim() || "Smooth Display"), subtitle: `${custom.refreshRate || val.refreshRate || "120Hz"} Display` },
          { icon: "⚡", title: resolvedRamRom.split("|")[0].trim() || "Fast RAM", subtitle: (custom.chipset || val.chipset || "Fast Processor").split("(")[0].trim() }
        ];

        return {
          ...val,
          model: product.model || product.name,
          ramRom: resolvedRamRom,
          battery: resolvedBattery,
          rearCamera: resolvedCamera,
          frontCamera: custom.frontCamera || val.frontCamera,
          display: resolvedDisplay,
          refreshRate: custom.refreshRate || val.refreshRate,
          chipset: custom.chipset || val.chipset,
          os: resolvedOS,
          uiName: custom.uiName || val.uiName,
          color: custom.color || "",
          customBadges,
          originalProduct: product,
          categoryType: "mobile"
        };
      }
    }

    const price = product.sellingPrice || 19999;
    const brand = product.brand || "Zesh Verified";
    const cat = (product.category || "").toLowerCase();

    // 1. WASHING MACHINE & HOME APPLIANCES
    if (cat === "appliances" || combined.includes("washing") || combined.includes("machine") || combined.includes("wm")) {
      const capMatch = product.name.match(/(\d+(\.\d+)?\s*kg)/i);
      const cap = capMatch ? capMatch[0] : "7.5 Kg";
      return {
        brand: brand,
        model: product.model || product.name,
        categoryType: "appliance",
        chipset: "High-Torque Inverter Motor with Smart Pulsator",
        cpu: "Dual Storm Pulsator Wash System",
        gpu: "N/A (Home Appliance)",
        display: "Digital LED Touch Control Panel / Soft Dial",
        resolution: "5 Wash Programs (Normal, Gentle, Heavy, Quick, Soak)",
        refreshRate: "1350 RPM",
        rearCamera: "N/A (Home Appliance)",
        frontCamera: "N/A (Home Appliance)",
        video: "Magic Filter with Rust-Proof Polypropylene Body",
        battery: "230V AC / 50Hz • 5 Star Energy Efficient",
        os: "Smart Auto-Restart & Water Level Sensor",
        uiName: "Rotary Knob & Touch UI",
        ramRom: `${cap} Washing Capacity`,
        build: "Rust-Proof Toughened Glass Lid with Rat Protection",
        sim: "N/A",
        weight: "26.5 kg",
        dimensions: { width: "790 mm", depth: "480 mm", height: "960 mm" },
        inBox: "Washing Machine, Inlet Hose, Drain Pipe, Lint Filter, User Manual",
        zeshScore: 9.4,
        categoryTags: ["value", "appliance"],
        bestForBadge: "🧺 Premium Home Appliance",
        highlights: [
          `${cap} Large Capacity - Ideal for Family Laundry`,
          "1350 RPM Super Air Jet Dry for Faster Drying",
          "5 Star BEE Rating for Lowest Power & Water Usage",
          "10 Year Motor Warranty with Zesh Tech In-Store Support"
        ],
        customBadges: [
          { icon: "🧺", title: `${cap} Capacity`, subtitle: "Family Wash Load" },
          { icon: "⚡", title: "1350 RPM Speed", subtitle: "Super Air Turbo Dry" },
          { icon: "⭐", title: "5 Star Rating", subtitle: "Lowest Electricity Bill" },
          { icon: "🛡️", title: "10 Yr Warranty", subtitle: "Long Life Motor" }
        ],
        pros: ["Heavy-duty wash power", "Energy & water saver", "Long motor warranty"],
        cons: ["Requires water tap connection"],
        originalProduct: product
      };
    }

    // 2. SMART TELEVISIONS
    if (cat === "television" || combined.includes("tv")) {
      const is43 = combined.includes("43");
      const sizeText = is43 ? '43" (108 cm) 4K Ultra HD' : '32" (80 cm) Bezel-Less HD';
      return {
        brand: brand,
        model: product.model || product.name,
        categoryType: "tv",
        chipset: "Quad Core A55 64-bit Processor with Mali GPU",
        cpu: "Quad Core A55 (1.5 GHz)",
        gpu: "Mali G31 MP2 GPU",
        display: is43 ? '43" 4K Ultra HD A+ Grade IPS Display, HDR10' : '32" Bezel-Less HD Ready Display',
        resolution: is43 ? "3840 x 2160 Pixels 4K UHD" : "1366 x 768 Pixels HD",
        refreshRate: "60 Hz Vivid Motion Engine",
        rearCamera: "N/A (Smart TV)",
        frontCamera: "N/A (Smart TV)",
        video: "24W Dolby Audio Stereo Speakers with DTS-HD",
        battery: "Power: AC 100-240V ~ 50/60Hz, Eco Mode",
        os: "Google TV / Android TV OS with Play Store & Chromecast",
        uiName: "Google TV Interface",
        ramRom: is43 ? "2 GB RAM | 16 GB Storage" : "1.5 GB RAM | 8 GB Storage",
        build: "Metal Bezel-Less Frameless Design with Table Stand",
        sim: "N/A • Dual Band WiFi (2.4/5GHz) + Bluetooth 5.0",
        weight: is43 ? "6.8 kg" : "3.9 kg",
        dimensions: { width: is43 ? "965 mm" : "720 mm", depth: "85 mm", height: is43 ? "560 mm" : "430 mm" },
        inBox: "Smart TV, Smart Voice Remote, AAA Batteries, Wall Mount, Stand, Power Cable",
        zeshScore: 9.3,
        categoryTags: ["tv", "entertainment"],
        bestForBadge: "📺 Home Cinema Champion",
        highlights: [
          `${sizeText} with 1.07 Billion Colors & HDR10`,
          "24W Dolby Audio with Cinematic Virtual Surround",
          "Google TV with Netflix, Prime Video, YouTube & Hotstar",
          "3 HDMI, 2 USB, Dual Band WiFi, Bluetooth 5.0"
        ],
        customBadges: [
          { icon: "📺", title: is43 ? "4K Ultra HD" : "HD Bezel-Less", subtitle: "Vivid Picture Engine" },
          { icon: "🔊", title: "24W Dolby Audio", subtitle: "Cinema Surround Sound" },
          { icon: "📶", title: "Google TV OS", subtitle: "Netflix, YouTube, Apps" },
          { icon: "⚡", title: "3 HDMI + 2 USB", subtitle: "Full Connectivity" }
        ],
        pros: ["Cinema sound quality", "Stunning vivid colors", "Official Google TV with Play Store"],
        cons: ["Wall mounting installation recommended"],
        originalProduct: product
      };
    }

    // 3. AUDIO & HEADPHONES
    if (cat === "audio" || cat === "earphones" || cat === "headphones" || cat === "speaker") {
      return {
        brand: brand,
        model: product.model || product.name,
        categoryType: "audio",
        chipset: "Low Latency Audio SoC with Bluetooth 5.3",
        cpu: "Active Noise Cancellation DSP",
        gpu: "N/A",
        display: "Smart LED Battery Display Case",
        resolution: "13mm Deep Bass Titanium Drivers",
        refreshRate: "50ms Low Latency Gaming Mode",
        rearCamera: "Quad Mics with AI Environmental Noise Cancellation",
        frontCamera: "N/A",
        video: "Touch Tap Gesture Controls",
        battery: "Up to 40 Hours Total Playtime with Type-C Flash Charge",
        os: "Compatible with Android, iOS, Windows, Mac",
        uiName: "Touch Controls",
        ramRom: "High Definition Audio Codec (AAC/SBC)",
        build: "Ergonomic In-Ear Lightweight IPX5 Water Resistant",
        sim: "Bluetooth 5.3 Instant Pairing",
        weight: "42 g",
        inBox: "Earbuds, Charging Case, Extra Ear Tips, Type-C Cable, Manual",
        zeshScore: 9.1,
        categoryTags: ["audio"],
        bestForBadge: "🎧 Deep Bass King",
        highlights: [
          "13mm Bass Boost Drivers for Punchy Sound",
          "40 Hours Monster Battery Life with Type-C Flash Charge",
          "AI Quad Mic for Crystal Clear Calling",
          "IPX5 Sweat & Water Resistance"
        ],
        customBadges: [
          { icon: "🔋", title: "40 Hrs Playtime", subtitle: "Type-C Flash Charge" },
          { icon: "🎵", title: "13mm Bass Driver", subtitle: "Deep Punchy Audio" },
          { icon: "🎙️", title: "AI Noise Cancel", subtitle: "Crystal Clear Calls" },
          { icon: "💧", title: "IPX5 Splash Proof", subtitle: "Gym & Rain Safe" }
        ],
        pros: ["Deep bass", "Massive battery life", "Instant Bluetooth pairing"],
        cons: ["Keep charging case clean"],
        originalProduct: product
      };
    }

    // 4. CHARGERS & ACCESSORIES
    if (cat === "charger" || cat === "cable" || cat === "power bank") {
      return {
        brand: brand,
        model: product.model || product.name,
        categoryType: "accessory",
        chipset: "GaN Fast Power Controller IC",
        cpu: "9-Layer Smart Circuit Protection",
        gpu: "N/A",
        display: "LED Power Output Indicator",
        resolution: "Dual Port Type-C PD + USB-A",
        refreshRate: "33W / 67W Turbo Flash Charging",
        rearCamera: "N/A",
        frontCamera: "N/A",
        video: "Universal Fast Charging Protocol",
        battery: "High Efficiency 94% Energy Transfer",
        os: "Universal Compatibility",
        uiName: "Plug & Play",
        ramRom: "Over-Voltage, Over-Current, Short Circuit Protection",
        build: "Fireproof Polycarbonate Glossy Compact Body",
        sim: "N/A",
        weight: "65 g",
        inBox: "Fast Charger Adapter, Documentation, Warranty Card",
        zeshScore: 9.2,
        categoryTags: ["accessory"],
        bestForBadge: "⚡ Ultra-Fast Charging",
        highlights: [
          "Super Fast Turbo Charging Output",
          "9-Layer Smart Safety Temperature Control",
          "Universal Compatibility for Android & iPhone",
          "6 Months Zesh Tech Store Replacement Warranty"
        ],
        customBadges: [
          { icon: "⚡", title: "Turbo Fast Charge", subtitle: "Rapid Power Delivery" },
          { icon: "🔌", title: "Dual Output", subtitle: "Type-C + USB-A" },
          { icon: "🛡️", title: "9-Layer Safety", subtitle: "No Over-Heating" },
          { icon: "📱", title: "Universal Fit", subtitle: "Android & iPhone" }
        ],
        pros: ["Super fast charging speed", "Zero heating", "Sturdy pins"],
        cons: ["Cable sold separately depending on model"],
        originalProduct: product
      };
    }

    // 5. SMARTPHONES & MOBILE PHONES (Dynamic Generator)
    const is5G = combined.includes("5g") || price >= 18000;
    const isAMOLED = price >= 23000;
    const custom = parseCustomSpecs(product.description, product.name);

    const ramRom = custom.ramRom || product.name.match(/\d+GB\/\d+GB/i)?.[0] || "6GB RAM | 128GB Storage";
    const battery = custom.battery || (price >= 25000 ? "5000 mAh High-Density Battery with 67W Turbo" : "5000 mAh All-Day Battery with Fast Charging");
    const rearCamera = custom.rearCamera || (price >= 30000 ? "50MP/64MP OIS Main Camera + Ultra Wide" : "50MP AI Dual Camera");
    const frontCamera = custom.frontCamera || (price >= 30000 ? "32MP HD Selfie Camera" : "16MP AI Selfie");
    const display = custom.display || (isAMOLED ? '6.67" 120Hz Super AMOLED Full HD+, HDR10+' : '6.56" 90Hz Smooth Display');
    const refreshRate = custom.refreshRate || (isAMOLED ? "120Hz" : "90Hz");
    const chipset = custom.chipset || (price >= 50000 ? "Flagship Octa-Core (3nm/4nm)" : price >= 25000 ? "High Performance 5G Octa-Core (6nm)" : "Octa-Core Power Efficient Processor");
    const os = custom.os || `${brand} Custom OS based on Android 14`;
    const uiName = custom.uiName || `${brand} UI`;

    const posterBadges = [
      { icon: "🔋", title: battery.split("with")[0].trim(), subtitle: "Long Lasting Battery" },
      { icon: "📸", title: rearCamera.split("+")[0].split("Camera")[0].trim() || "AI Camera", subtitle: "AI Portrait Camera" },
      { icon: "📱", title: display.includes('"') ? display.split('"')[0] + '"' : (display.split("(")[0].trim() || "Smooth Screen"), subtitle: `${refreshRate} Display` },
      { icon: "⚡", title: ramRom.split("|")[0].trim() || "Fast RAM", subtitle: chipset.split("(")[0].trim() || "High Performance" }
    ];

    const highlights = [
      `${custom.display ? custom.display : (is5G ? "Lightning Fast 5G" : "Reliable 4G Dual SIM")} • ${refreshRate}`,
      `${rearCamera} with Night Mode & AI Capture`,
      `${battery}`,
      `${os} • Official ${brand} Brand Warranty`
    ];

    return {
      brand: brand,
      model: product.model || product.name,
      chipset,
      cpu: "Octa-Core (High Performance Cores)",
      gpu: "Advanced Mobile Gaming GPU",
      display,
      resolution: isAMOLED ? "2400 x 1080 Pixels FHD+" : "1600 x 720 Pixels HD+",
      refreshRate,
      rearCamera,
      frontCamera,
      video: price >= 30000 ? "4K @ 30fps Ultra Steady" : "1080p @ 30fps",
      battery,
      os,
      uiName,
      ramRom,
      ram: custom.ram || "",
      rom: custom.rom || "",
      color: custom.color || "",
      build: "Ergonomic Splash Resistant Body with Fingerprint Scanner",
      sim: is5G ? "Dual 5G SIM" : "Dual 4G VoLTE SIM",
      weight: "185 g",
      inBox: "Handset, Fast Charger, Type-C Cable, Protective Case, SIM Tool",
      zeshScore: Math.min(9.5, Number((7.8 + (price / 30000)).toFixed(1))),
      categoryTags: [price >= 25000 ? "camera" : "value"],
      bestForBadge: price >= 30000 ? "⭐ Verified Premium Pick" : "💰 High Value Pick",
      cameraScore: Math.min(9.5, Number((7.5 + (price / 35000)).toFixed(1))),
      gamingScore: Math.min(9.5, Number((7.5 + (price / 35000)).toFixed(1))),
      uiScore: 8.8,
      batteryScore: 9.2,
      highlights,
      customBadges: posterBadges,
      pros: ["Excellent value for price", "Sturdy build quality", "Official brand warranty"],
      cons: ["Fast selling stock"],
      originalProduct: product
    };
  }

  /**
   * Budget Engine:
   * Returns phone contenders in that budget + the crowned Winner + AI explanation.
   */
  function getBudgetComparison(allProducts, budgetKey = "30k") {
    const phones = allProducts.filter(p => p.category === "Mobile" && p.sellingPrice > 2000);
    let minPrice = 0;
    let maxPrice = 1000000;
    let budgetLabel = "Under ₹30,000";

    if (budgetKey === "15k") {
      minPrice = 0;
      maxPrice = 15000;
      budgetLabel = "Under ₹15,000 (Budget Starters)";
    } else if (budgetKey === "20k") {
      minPrice = 15000;
      maxPrice = 20000;
      budgetLabel = "₹15,000 - ₹20,000 (Value Champions)";
    } else if (budgetKey === "30k") {
      minPrice = 20000;
      maxPrice = 30000;
      budgetLabel = "₹20,000 - ₹30,000 (Best ₹30k Picks)";
    } else if (budgetKey === "50k") {
      minPrice = 30000;
      maxPrice = 50000;
      budgetLabel = "₹30,000 - ₹50,000 (Flagship Killers)";
    } else if (budgetKey === "flagship") {
      minPrice = 50000;
      maxPrice = 200000;
      budgetLabel = "Above ₹50,000 (Ultra Flagships)";
    }

    const filtered = phones.filter(p => p.sellingPrice >= minPrice && p.sellingPrice <= maxPrice);

    // Sort by price descending
    filtered.sort((a, b) => b.sellingPrice - a.sellingPrice);

    // Enrich with specs
    const contenders = filtered.map(p => ({
      product: p,
      specs: getPhoneSpecs(p)
    }));

    // Find the #1 Winner
    let winner = null;
    let verdict = "";

    if (budgetKey === "30k") {
      // Find Vivo T5 Lite 256GB or Nothing 4b or Vivo T5x
      winner = contenders.find(c => (c.product.name || "").toLowerCase().includes("t5 lite") && (c.product.name || "").includes("256")) ||
               contenders.find(c => (c.product.name || "").toLowerCase().includes("nothing") && (c.product.name || "").toLowerCase().includes("4b")) ||
               contenders[0];

      verdict = `🏆 <b>Zesh Tech Winner Verdict:</b> <b>${winner ? winner.product.name : "Vivo T5 Lite"}</b> iss 30k budget segment me undisputed champion hai! Isme <b>256GB massive storage</b>, <b>120Hz smooth AMOLED display</b> aur <b>Sony camera</b> ka sabse best balance milta hai, sath hi ₹3,000 cash bachat bhi hoti hai. Agar aapko <b>100% clean, zero-ads software</b> chahiye toh <b>Nothing Phone 4b (₹29,999)</b> number 1 pick hai!`;
    } else if (budgetKey === "20k") {
      winner = contenders.find(c => (c.product.name || "").toLowerCase().includes("m8x") && (c.product.name || "").includes("6/128")) ||
               contenders.find(c => (c.product.name || "").toLowerCase().includes("moto")) ||
               contenders[0];
      verdict = `🏆 <b>Zesh Tech Winner Verdict:</b> <b>${winner ? winner.product.name : "Poco M8x 5G"}</b> under ₹20k best pick hai! Snapdragon gaming chipset, 120Hz AMOLED display aur 33W fast charger ke sath yeh segment ka performance king hai.`;
    } else if (budgetKey === "15k") {
      winner = contenders.find(c => (c.product.name || "").toLowerCase().includes("c85x")) ||
               contenders.find(c => (c.product.name || "").toLowerCase().includes("a7 pro")) ||
               contenders[0];
      verdict = `🏆 <b>Zesh Tech Winner Verdict:</b> <b>${winner ? winner.product.name : "Poco C85x"}</b> under ₹15,000 best smartphone hai! 50MP AI camera, 5000 mAh battery aur big 6.71" display is price me unmatched hai.`;
    } else if (budgetKey === "50k") {
      winner = contenders.find(c => (c.product.name || "").toLowerCase().includes("f35 pro")) ||
               contenders.find(c => (c.product.name || "").toLowerCase().includes("s25 fe")) ||
               contenders[0];
      verdict = `🏆 <b>Zesh Tech Winner Verdict:</b> <b>${winner ? winner.product.name : "OPPO F35 Pro 5G"}</b> portrait photography aur 67W flash charging ke sath iss bracket me number 1 choice hai!`;
    } else {
      winner = contenders.find(c => (c.product.name || "").toLowerCase().includes("s25 ultra")) ||
               contenders.find(c => (c.product.name || "").toLowerCase().includes("18 pro")) ||
               contenders[0];
      verdict = `🏆 <b>Zesh Tech Winner Verdict:</b> <b>${winner ? winner.product.name : "Samsung S25 Ultra"}</b> duniya ka sabse powerful 200MP zoom camera, Snapdragon 8 Elite aur S-Pen ke sath absolute undisputed Android king hai!`;
    }

    return {
      budgetLabel,
      contenders,
      winner,
      verdict
    };
  }

  /**
   * Curated Category Champions:
   * Returns top 3-4 phones for "Best Camera", "Best Gaming", "Best Clean UI", "Best Battery".
   */
  function getCuratedChampions(allProducts, categoryKey = "camera") {
    const phones = allProducts.filter(p => p.category === "Mobile" && p.sellingPrice > 2000);
    const enriched = phones.map(p => ({
      product: p,
      specs: getPhoneSpecs(p)
    }));

    if (categoryKey === "camera") {
      // Sort by cameraScore descending
      enriched.sort((a, b) => (b.specs.cameraScore || 0) - (a.specs.cameraScore || 0));
      return {
        title: "📸 Best Camera Phones",
        subtitle: "DSLR-Grade Portrait Sensors, Optical Image Stabilization (OIS) & 4K Cinema Video",
        items: enriched.slice(0, 4),
        reasonKey: "camera"
      };
    } else if (categoryKey === "gaming") {
      // Sort by gamingScore descending
      enriched.sort((a, b) => (b.specs.gamingScore || 0) - (a.specs.gamingScore || 0));
      return {
        title: "🎮 Best Gaming & Performance Phones",
        subtitle: "120Hz Fast Screens, Liquid Cooling & Flagship Chipsets for Smooth 90FPS Gaming",
        items: enriched.slice(0, 4),
        reasonKey: "gaming"
      };
    } else if (categoryKey === "ui") {
      // Sort by uiScore descending
      enriched.sort((a, b) => (b.specs.uiScore || 0) - (a.specs.uiScore || 0));
      return {
        title: "✨ Best Clean UI & Ad-Free Experience",
        subtitle: "Nothing OS, Motorola Hello UI, Apple iOS & Samsung One UI — Zero Spam, Zero Ads",
        items: enriched.slice(0, 4),
        reasonKey: "ui"
      };
    } else if (categoryKey === "battery") {
      // Sort by batteryScore descending
      enriched.sort((a, b) => (b.specs.batteryScore || 0) - (a.specs.batteryScore || 0));
      return {
        title: "🔋 Best Battery & Ultra-Fast Charging",
        subtitle: "Massive 5000mAh - 6000mAh Powerplants with Up to 67W Turbo Flash Charging",
        items: enriched.slice(0, 4),
        reasonKey: "battery"
      };
    }

    return {
      title: "⭐ Value Champions Under ₹30,000",
      subtitle: "Maximum Specs, Storage & Camera per Rupee Spent",
      items: enriched.filter(e => e.product.sellingPrice <= 30000).slice(0, 4),
      reasonKey: "value"
    };
  }

  return {
    specsDB,
    getPhoneSpecs,
    getBudgetComparison,
    getCuratedChampions
  };
})();
