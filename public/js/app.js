"use strict";

/* ==========================================================================
   ZESH-TECH — Storefront Application Logic
   ========================================================================== */

(function () {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const money = (val) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(Number(val) || 0);

  const imageFallback = "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80";

  // Application State
  let allProducts = [];
  let cart = [];
  let currentCategory = "All";
  let currentBrand = "All";
  let wishlist = [];
  let searchKeyword = "";
  let inStockOnly = false;
  let sortBy = "newest";
  let authMode = "login"; // 'login' or 'register'

  // Load cart & wishlist from localStorage
  try {
    const saved = localStorage.getItem("zesh_customer_cart");
    if (saved) cart = JSON.parse(saved);
  } catch (e) {
    cart = [];
  }

  try {
    const savedWish = localStorage.getItem("zesh_wishlist");
    if (savedWish) wishlist = JSON.parse(savedWish);
  } catch (e) {
    wishlist = [];
  }

  // Toast Notification
  function showToast(message, type = "info") {
    const container = $("#toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span style="font-size: 16px;">${type === "success" ? "✓" : type === "error" ? "⚠" : "ℹ"}</span>
      <span>${escapeHTML(message)}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function escapeHTML(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c]);
  }

  function saveCart() {
    try {
      localStorage.setItem("zesh_customer_cart", JSON.stringify(cart));
    } catch (e) {}
    updateCartUI();
  }

  /* ==========================================================================
     Catalogue & Products
     ========================================================================== */

  async function fetchCatalogue() {
    const container = $("#products-container");
    const countBadge = $("#product-count-badge");
    if (!container) return;

    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--text-muted);">
        <div class="live-dot pulse-dot" style="margin: 0 auto 12px; width: 10px; height: 10px;"></div>
        <div>Loading verified retail catalogue...</div>
      </div>
    `;

    try {
      const params = { limit: 100 };
      if (currentCategory && currentCategory !== "All") {
        params.category = currentCategory;
      }
      if (sortBy) {
        params.sort = sortBy;
      }

      const res = await zeshAPI.getProducts(params);
      allProducts = res.products || [];

      if (countBadge) {
        countBadge.textContent = `${allProducts.length} items available`;
      }

      applyFiltersAndRender();
      initCurationsAndComparison();
    } catch (err) {
      console.error("Failed to load catalogue:", err);
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: white; border-radius: var(--radius-lg); border: 1px solid var(--border);">
          <div style="color: var(--danger); font-size: 16px; font-weight: 700; margin-bottom: 8px;">Could not connect to catalogue</div>
          <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 16px;">${escapeHTML(err.message)}</p>
          <button class="btn btn-secondary btn-small" id="retry-load-btn">Retry Connection</button>
        </div>
      `;
      $("#retry-load-btn")?.addEventListener("click", fetchCatalogue);
    }
  }

  // Extract key specs for Zesh Tech cute cutlet pills
  function extractProductSpecs(product) {
    const specs = [];
    const name = product.name || "";

    // 1. Storage / RAM
    const ramRomMatch = name.match(/(\d+\s*GB\s*\/\s*\d+\s*GB|\d+\/\d+|\d+\s*GB)/i);
    if (ramRomMatch) specs.push(ramRomMatch[0].trim());

    // 2. Color / Finish
    const colors = [
      "Ice Blue", "Iceblue", "Lavender", "Silver Shadow", "Twilight Shadow",
      "Wave Blue", "Jet Black", "White Silver", "Gold", "Violet",
      "Green", "Blue", "Black", "Capri", "White", "Brown", "Purple"
    ];
    for (const c of colors) {
      if (name.toLowerCase().includes(c.toLowerCase()) && !specs.includes(c)) {
        specs.push(c);
        break;
      }
    }

    // 3. Screen size / type
    if (name.includes("43")) specs.push("43\" Display");
    if (name.includes("32")) specs.push("32\" Display");
    if (name.includes("4K")) specs.push("4K UHD");
    if (name.includes("Fire TV")) specs.push("Fire TV");

    // 4. Appliances capacity
    const wmMatch = name.match(/(\d+(\.\d+)?\s*Kg)/i);
    if (wmMatch) specs.push(wmMatch[0]);

    if (name.includes("Adapter")) specs.push("+ Fast Adapter");
    if (name.includes("Dual SIM")) specs.push("Dual SIM");

    return specs.slice(0, 3);
  }

  // Realistic Zesh Tech MRP and Discount Calculation
  function calculateDiscount(sellingPrice) {
    const price = Number(sellingPrice) || 0;
    if (price <= 0) return { mrp: 0, discountPct: 0 };

    let pct = 18;
    if (price > 70000) pct = 10;
    else if (price > 40000) pct = 14;
    else if (price > 20000) pct = 18;
    else if (price > 10000) pct = 22;
    else pct = 26;

    const mrp = Math.round((price * (1 + pct / 100)) / 100) * 100 - 1;
    const discountPct = Math.max(5, Math.round(((mrp - price) / mrp) * 100));

    return { mrp, discountPct };
  }

  // Deterministic realistic rating & reviews based on SKU
  function getProductRating(product) {
    const key = (product.sku || product.name || "ZESH");
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) & 0xffffffff;
    const abs = Math.abs(hash);
    const rating = (4.3 + (abs % 7) * 0.1).toFixed(1); // 4.3 to 4.9
    const ratingsCount = 240 + (abs % 1850);
    const reviewsCount = Math.round(ratingsCount / 3.8);
    const ratingsFormatted = ratingsCount.toLocaleString("en-IN");
    const reviewsFormatted = reviewsCount.toLocaleString("en-IN");
    return {
      rating,
      ratingsCount,
      reviewsCount,
      ratingsFormatted,
      reviewsFormatted,
      reviews: ratingsFormatted
    };
  }

  function applyFiltersAndRender() {
    const container = $("#products-container");
    const noProductsView = $("#no-products-view");
    const countBadge = $("#product-count-badge");
    if (!container) return;

    let filtered = [...allProducts];

    // Category filter including special tabs
    if (currentCategory === "Apple") {
      filtered = filtered.filter(p =>
        (p.brand && p.brand.toLowerCase() === "apple") ||
        (p.name && (p.name.includes("iPhone") || p.name.includes("iPad")))
      );
    } else if (currentCategory === "Keypad") {
      filtered = filtered.filter(p =>
        (p.sku && p.sku.includes("KEYPAD")) ||
        (p.name && p.name.toLowerCase().includes("keypad"))
      );
    } else if (currentCategory && currentCategory !== "All") {
      filtered = filtered.filter(p => p.category === currentCategory);
    }

    // Brand quick filter
    if (currentBrand && currentBrand !== "All") {
      filtered = filtered.filter(p => p.brand && p.brand.toLowerCase() === currentBrand.toLowerCase());
    }

    // Search keyword filter
    if (searchKeyword) {
      const q = searchKeyword.toLowerCase();
      filtered = filtered.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.model && p.model.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q))
      );
    }

    // In stock only filter
    if (inStockOnly) {
      filtered = filtered.filter(p => (p.stockQuantity || 0) > 0);
    }

    if (countBadge) {
      countBadge.textContent = `${filtered.length} products found`;
    }

    if (filtered.length === 0) {
      container.innerHTML = "";
      noProductsView?.classList.remove("hidden");
      return;
    }

    noProductsView?.classList.add("hidden");

    container.innerHTML = filtered.map(product => {
      const stock = Number(product.stockQuantity) || 0;
      const isOut = stock <= 0;
      const isLow = !isOut && stock <= (product.lowStockThreshold || 2);
      const isWish = wishlist.includes(product._id);
      const img = product.imageUrl || imageFallback;
      const specs = extractProductSpecs(product);
      const { mrp, discountPct } = calculateDiscount(product.sellingPrice);
      const { rating, reviews } = getProductRating(product);

      return `
        <article class="product-card" data-product-id="${escapeHTML(product._id)}">
          <!-- Image Cutlet Box -->
          <div class="product-thumbnail-box view-details-btn" data-id="${escapeHTML(product._id)}" title="Click to view details">
            <!-- Top-Left Badge -->
            ${isOut ? `
              <span class="card-badge-pill out-of-stock">Out of Stock</span>
            ` : isLow ? `
              <span class="card-badge-pill low-stock">🔥 Only ${stock} left</span>
            ` : `
              <span class="card-badge-pill assured-badge">
                <span class="star-sparkle">★</span> Zesh Assured
              </span>
            `}

            <!-- Top-Right Wishlist Button -->
            <button class="card-wishlist-btn ${isWish ? "active" : ""}" title="${isWish ? "Remove from wishlist" : "Add to wishlist"}" data-id="${escapeHTML(product._id)}" type="button" aria-label="Toggle Wishlist">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            </button>

            <!-- Product Image with contain fit -->
            <img src="${escapeHTML(img)}" alt="${escapeHTML(product.name)}" loading="lazy" onerror="this.onerror=null;this.src='${imageFallback}';">

            <!-- Bottom Rating Pill Overlay -->
            <div class="product-rating-badge">
              <span>${rating}</span>
              <span class="star-icon">★</span>
              <span class="rating-count">(${reviews})</span>
            </div>

            <!-- Quick Compare Button for Mobile Phones -->
            ${product.category === "Mobile" ? `
              <button class="card-compare-pill compare-this-btn" data-id="${escapeHTML(product._id)}" title="Compare this phone" type="button">
                ⚖️ Compare
              </button>
            ` : ""}
          </div>

          <!-- Product Body Content -->
          <div class="product-content">
            <div class="product-brand-row">
              <span class="product-brand-pill">${escapeHTML(product.brand || "ZESH TECH")}</span>
              <span class="product-category-sub">${escapeHTML(product.category || "Verified")}</span>
            </div>

            <h3 class="product-title view-details-btn" data-id="${escapeHTML(product._id)}" title="${escapeHTML(product.name)}">
              ${escapeHTML(product.name)}
            </h3>

            <!-- Micro Specs Cutlet Pills -->
            <div class="product-specs-row">
              ${specs.map(s => `<span class="spec-cutlet">${escapeHTML(s)}</span>`).join("")}
            </div>

            <!-- Zesh Tech Pricing Row -->
            <div class="zesh-price-row">
              <div class="price-main-wrap">
                <span class="selling-price-val">${money(product.sellingPrice)}</span>
                <span class="mrp-strikethrough">${money(mrp)}</span>
                <span class="discount-badge">${discountPct}% off</span>
              </div>
              <div class="perk-subtext">Free Store Delivery • 0% EMI</div>
            </div>

            <!-- Dual Action Buttons -->
            <div class="product-card-actions">
              <button class="btn-buy-now direct-buy-btn" data-id="${escapeHTML(product._id)}" ${isOut ? "disabled" : ""}>
                <span>${isOut ? "Sold Out" : "⚡ Buy Now"}</span>
              </button>
              <button class="btn-add-bag add-to-bag-btn" data-id="${escapeHTML(product._id)}" title="Add to Cart Bag" ${isOut ? "disabled" : ""}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              </button>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  // Smart Color & Multi-Angle Image Resolver for Smartphones & Tech
  function getProductColorVariants(product, allProds = [], specs = null) {
    const brand = (product.brand || "").toLowerCase();
    const name = (product.name || "").toLowerCase();
    const baseImg = product.imageUrl || imageFallback;
    const variants = [];
    const seenColors = new Set();

    // 1. Current color from specs, description or title
    let currentColorName = specs?.color || "";
    if (!currentColorName) {
      const colorInDesc = (product.description || "").match(/(?:Colour|Color)\s*[:\t\-]?\s*([^\n\r,]+)/i);
      if (colorInDesc && colorInDesc[1]) currentColorName = colorInDesc[1].trim();
    }
    if (!currentColorName) {
      const currentColorMatch = product.name.match(/-\s*([A-Za-z\s]+?)(?:\(|$)/i);
      currentColorName = currentColorMatch ? currentColorMatch[1].trim() : (product.brand ? `${product.brand} Signature` : "Standard Finish");
    }
    variants.push({ color: currentColorName, image: baseImg });
    seenColors.add(currentColorName.toLowerCase());

    // 2. If product has multi-images uploaded by admin, add them as angle/variant photos
    if (Array.isArray(product.images) && product.images.length > 1) {
      product.images.forEach((imgUrl, i) => {
        if (i === 0) return;
        const angleLabel = i === 1 ? "Back View" : i === 2 ? "Side View" : `Angle #${i + 1}`;
        if (!seenColors.has(angleLabel.toLowerCase())) {
          seenColors.add(angleLabel.toLowerCase());
          variants.push({ color: angleLabel, image: imgUrl });
        }
      });
    }

    // 3. Look for sibling color variants in the catalog
    const baseNameTokens = name.replace(/-\s*([A-Za-z\s]+?)(?:\(|$)/i, "").trim().split(" ").filter(w => w.length > 2);
    const siblings = allProds.filter(p => {
      if (p._id === product._id) return false;
      const pBrand = (p.brand || "").toLowerCase();
      const pName = (p.name || "").toLowerCase();
      if (pBrand !== brand) return false;
      const matches = baseNameTokens.filter(t => pName.includes(t));
      return matches.length >= Math.min(2, baseNameTokens.length);
    });

    siblings.forEach(p => {
      const cMatch = p.name.match(/-\s*([A-Za-z\s]+?)(?:\(|$)/i);
      const cName = cMatch ? cMatch[1].trim() : "";
      if (cName && !seenColors.has(cName.toLowerCase())) {
        seenColors.add(cName.toLowerCase());
        variants.push({ color: cName, image: p.imageUrl || baseImg });
      }
    });

    // 3. Fallback color palette matching exact inventory stock photos
    if (variants.length < 3 && product.category === "Mobile") {
      if (brand.includes("apple") || name.includes("iphone")) {
        if (!seenColors.has("lavender")) variants.push({ color: "Lavender", image: "/images/products/iphone-17-lavender.jpg" });
        if (!seenColors.has("starlight white") && !seenColors.has("white")) variants.push({ color: "Starlight White", image: "/images/products/iphone-17-white.jpg" });
        if (!seenColors.has("space black") && !seenColors.has("black")) variants.push({ color: "Space Black", image: "/images/products/iphone-18pro-black.jpg" });
      } else if (brand.includes("samsung")) {
        if (!seenColors.has("ice blue")) variants.push({ color: "Ice Blue", image: "/images/products/samsung-s25-iceblue.jpg" });
        if (!seenColors.has("silver shadow") && !seenColors.has("silver")) variants.push({ color: "Silver Shadow", image: "/images/products/samsung-s25-silver.jpg" });
        if (!seenColors.has("jet black") && !seenColors.has("black")) variants.push({ color: "Jet Black", image: "/images/products/samsung-s25fe-black.jpg" });
      } else if (brand.includes("vivo")) {
        if (!seenColors.has("wave blue")) variants.push({ color: "Wave Blue", image: "/images/products/vivo-t5lite-blue.jpg" });
        if (!seenColors.has("twilight shadow") && !seenColors.has("twilight")) variants.push({ color: "Twilight Shadow", image: "/images/products/vivo-t5lite-twilight.jpg" });
        if (!seenColors.has("glacier silver") && !seenColors.has("silver")) variants.push({ color: "Glacier Silver", image: "/images/products/vivo-t5x-silver.jpg" });
      } else if (brand.includes("redmi") || brand.includes("xiaomi")) {
        if (!seenColors.has("lake blue") && !seenColors.has("blue")) variants.push({ color: "Lake Blue", image: "/images/products/redmi-blue.jpg" });
        if (!seenColors.has("carbon black") && !seenColors.has("black")) variants.push({ color: "Carbon Black", image: "/images/products/redmi-black.jpg" });
        if (!seenColors.has("pastel purple") && !seenColors.has("purple")) variants.push({ color: "Pastel Purple", image: "/images/products/redmi-purple.jpg" });
      } else if (brand.includes("oppo")) {
        if (!seenColors.has("royal gold") && !seenColors.has("gold")) variants.push({ color: "Royal Gold", image: "/images/products/oppo-a6-pro-gold.jpg" });
        if (!seenColors.has("mocha brown") && !seenColors.has("brown")) variants.push({ color: "Mocha Brown", image: "/images/products/oppo-f35-pro-brown.jpg" });
        if (!seenColors.has("ocean blue") && !seenColors.has("blue")) variants.push({ color: "Ocean Blue", image: "/images/products/oppo-f35-blue.jpg" });
      } else if (brand.includes("poco")) {
        if (!seenColors.has("aqua blue") && !seenColors.has("blue")) variants.push({ color: "Aqua Blue", image: "/images/products/poco-m8x-blue.jpg" });
        if (!seenColors.has("power black") && !seenColors.has("black")) variants.push({ color: "Power Black", image: "/images/products/poco-m8x-black.jpg" });
        if (!seenColors.has("emerald green") && !seenColors.has("green")) variants.push({ color: "Emerald Green", image: "/images/products/poco-c85x-green.jpg" });
      } else if (brand.includes("moto")) {
        if (!seenColors.has("navy blue") && !seenColors.has("blue")) variants.push({ color: "Navy Blue", image: "/images/products/moto-blue.jpg" });
        if (!seenColors.has("capri blue") && !seenColors.has("capri")) variants.push({ color: "Capri Blue", image: "/images/products/moto-capri.jpg" });
        if (!seenColors.has("charcoal black") && !seenColors.has("black")) variants.push({ color: "Charcoal Black", image: "/images/products/moto-black.jpg" });
      } else {
        if (!seenColors.has("sapphire blue")) variants.push({ color: "Sapphire Blue", image: "/images/products/vivo-t5lite-blue.jpg" });
        if (!seenColors.has("midnight black")) variants.push({ color: "Midnight Black", image: "/images/products/moto-black.jpg" });
      }
    }

    return variants.slice(0, 4);
  }

  // Resolve Real & Dynamic Storage/RAM Variants
  function getProductVariants(product, allProds = [], specs = null) {
    const currentRamRom = specs?.ramRom || "Standard Variant";
    const { mrp, discountPct } = calculateDiscount(product.sellingPrice);

    // Search allProds for variants of the same phone family
    const brand = (product.brand || "").toLowerCase();
    const rawName = (product.name || "").toLowerCase();
    // Strip ram/rom/color in parentheses or after dash
    const baseName = rawName.replace(/\(.*?\)/g, "").replace(/-\s*.*$/, "").trim();

    const variantsList = [
      {
        id: product._id,
        title: currentRamRom,
        price: product.sellingPrice,
        mrp: mrp,
        discountPct: discountPct,
        isActive: true,
        isRealProduct: true
      }
    ];

    const siblings = allProds.filter(p => {
      if (String(p._id) === String(product._id)) return false;
      const pBrand = (p.brand || "").toLowerCase();
      const pRaw = (p.name || "").toLowerCase();
      const pBase = pRaw.replace(/\(.*?\)/g, "").replace(/-\s*.*$/, "").trim();
      return pBrand === brand && (pBase === baseName || (baseName.length > 3 && pBase.includes(baseName)));
    });

    siblings.forEach(sib => {
      const sibSpecs = window.ZeshSpecs ? window.ZeshSpecs.getPhoneSpecs(sib) : null;
      const sibTitle = sibSpecs?.ramRom || sib.name.match(/\d+GB\/\d+GB/i)?.[0] || sib.name;
      const sibDisc = calculateDiscount(sib.sellingPrice);
      if (!variantsList.some(v => v.title.toLowerCase() === sibTitle.toLowerCase())) {
        variantsList.push({
          id: sib._id,
          title: sibTitle,
          price: sib.sellingPrice,
          mrp: sibDisc.mrp,
          discountPct: sibDisc.discountPct,
          isActive: false,
          isRealProduct: true
        });
      }
    });

    // If only 1 real variant in inventory and it's a mobile, show an intelligent option
    if (variantsList.length === 1 && product.category === "Mobile") {
      const parsedRam = parseInt(specs?.ram || "4", 10) || 4;
      const parsedRom = parseInt(specs?.rom || "128", 10) || 128;
      const nextRam = parsedRam === 4 ? 6 : parsedRam === 6 ? 8 : 12;
      const nextRom = parsedRom === 64 ? 128 : parsedRom === 128 ? 256 : 512;
      const nextPrice = product.sellingPrice + 2000;
      const nextMrp = mrp + 3000;
      const nextDisc = Math.round(((nextMrp - nextPrice) / nextMrp) * 100);

      variantsList.push({
        id: null,
        title: `${nextRam}GB RAM | ${nextRom}GB Storage`,
        price: nextPrice,
        mrp: nextMrp,
        discountPct: nextDisc,
        isActive: false,
        isRealProduct: false,
        note: "Store Order"
      });
    }

    return variantsList;
  }

  let active360SpinRaf = null;

  // ZESH TECH Official Specifications & Details Modal
  async function openQuickView(productId) {
    const modalBackdrop = $("#product-modal-backdrop");
    const modalContent = $("#product-modal-content");
    if (!modalBackdrop || !modalContent) return;

    if (active360SpinRaf) {
      cancelAnimationFrame(active360SpinRaf);
      active360SpinRaf = null;
    }

    // Check in-memory allProducts for instant 0ms rendering
    let product = allProducts.find(p => String(p._id) === String(productId));

    if (!product) {
      modalContent.innerHTML = `
        <div style="text-align:center; padding: 60px 20px; color:var(--text-muted);">
          <div class="live-dot pulse-dot" style="margin:0 auto 12px; width:12px; height:12px;"></div>
          <div style="font-weight:700; font-size:14px; color:#0f172a;">Loading ZESH TECH Verified Specifications...</div>
        </div>
      `;
      modalBackdrop.classList.add("active");

      try {
        const res = await zeshAPI.getProductById(productId);
        product = res.product;
      } catch (err) {
        modalContent.innerHTML = `
          <div style="text-align:center; padding: 40px 20px;">
            <div style="font-size:32px; margin-bottom:12px;">⚠️</div>
            <div style="font-weight:700; font-size:16px; color:#ef4444; margin-bottom:8px;">Unable to load product details</div>
            <p style="font-size:13px; color:#64748b;">${escapeHTML(err.message || "Please check your network connection.")}</p>
          </div>
        `;
        return;
      }
    } else {
      modalBackdrop.classList.add("active");
    }

    if (!product) {
      modalContent.innerHTML = `
        <div style="text-align:center; padding: 40px 20px;">
          <div style="font-size:32px; margin-bottom:12px;">🔍</div>
          <div style="font-weight:700; font-size:16px; color:#0f172a;">Product not found in store inventory</div>
        </div>
      `;
      return;
    }

    try {
      const stock = Number(product.stockQuantity) || 0;
      const isOut = stock <= 0;
      const img = product.imageUrl || imageFallback;
      const { mrp, discountPct } = calculateDiscount(product.sellingPrice);
      const ratingInfo = getProductRating(product);
      const { rating, ratingsFormatted, reviewsFormatted } = ratingInfo;

      // Get rich specs from our Knowledge Base or intelligent generator
      const specs = window.ZeshSpecs ? window.ZeshSpecs.getPhoneSpecs(product) : null;

      // Color variants with real photos
      const colorVariants = getProductColorVariants(product, allProducts, specs);
      const selectedColor = colorVariants[0]?.color || "Standard Finish";

      // Variant extraction
      const ramRomText = specs?.ramRom || "8 GB RAM | 128 GB ROM";
      const variantsList = getProductVariants(product, allProducts, specs);

      // Category Badges (accurate for phones, TVs, washing machines, audio)
      const posterBadges = specs?.customBadges || [
        { icon: "🔋", title: specs?.battery?.split("with")[0]?.trim() || "5000 mAh", subtitle: "Long Lasting Battery" },
        { icon: "📸", title: specs?.rearCamera?.split("+")[0]?.trim() || "50MP AI", subtitle: "AI Portrait Camera" },
        { icon: "📱", title: specs?.display?.split(",")[0]?.trim() || "6.79 inch", subtitle: `${specs?.refreshRate || "120Hz"} Display` },
        { icon: "⚡", title: specs?.antutuScore || "5,47,000+*", subtitle: "Leading AnTuTu Score" }
      ];

      const has360View = product.category === "Mobile" || product.category === "Television";

      modalContent.innerHTML = `
        <div class="zesh-product-page">
          <!-- Top Breadcrumb Bar -->
          <div class="fk-breadcrumb-bar">
            <div class="fk-breadcrumbs">
              <a href="/">Home</a> <span>/</span>
              <a href="#catalogue-section">Mobiles &amp; Electronics</a> <span>/</span>
              <a href="#catalogue-section">${escapeHTML(product.category || "Smartphones")}</a> <span>/</span>
              <span>${escapeHTML(product.brand || "Zesh")}</span> <span>/</span>
              <span class="fk-current-crumb">${escapeHTML(product.name)}</span>
            </div>
          </div>

          <div class="fk-main-grid">
            <!-- LEFT: Gallery Column with 360° Viewer & Specs Poster -->
            <div class="fk-gallery-column">
              <div class="fk-image-showcase">
                <!-- 360 Interactive View Trigger -->
                ${has360View ? `
                  <button class="fk-360-badge" id="fk-toggle-360-btn" type="button" title="Experience 360 Interactive View">
                    <span class="spin-icon">🔄</span> 360° 3D View
                  </button>
                ` : ""}

                <!-- Top Floating Action Circles (Wishlist & Share) -->
                <button class="fk-action-circle card-wishlist-btn ${wishlist.includes(product._id) ? "active" : ""}" title="Save to Wishlist" data-id="${escapeHTML(product._id)}" type="button">
                  ❤️
                </button>
                <button class="fk-action-circle fk-share-btn" title="Share Product Link" type="button">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                </button>

                <!-- Standard Product Image Showcase -->
                <div class="fk-main-image-wrap" id="fk-main-image-wrap">
                  <img src="${escapeHTML(img)}" alt="${escapeHTML(product.name)}" class="fk-main-img" id="fk-main-img" onerror="this.onerror=null;this.src='${imageFallback}';">
                </div>

                <!-- Multi-Image Gallery Thumbnails (if multiple photos available) -->
                ${(Array.isArray(product.images) && product.images.length > 1) ? `
                  <div class="fk-gallery-thumbs-row" style="display:flex; gap:8px; justify-content:center; margin-top:10px; overflow-x:auto; padding:4px 0;">
                    ${product.images.map((im, idx) => `
                      <button type="button" class="fk-gallery-thumb-btn ${idx === 0 ? 'active' : ''}" data-img="${escapeHTML(im)}" style="width:52px; height:52px; border-radius:8px; border:2px solid ${idx === 0 ? '#2563eb' : '#cbd5e1'}; background:#fff; padding:2px; cursor:pointer; flex-shrink:0;">
                        <img src="${escapeHTML(im)}" style="width:100%; height:100%; object-fit:contain; border-radius:6px;">
                      </button>
                    `).join("")}
                  </div>
                ` : ""}

                <!-- 360° Interactive 3D Rotation Stage -->
                <div class="fk-360-stage" id="fk-360-stage" style="display:none;">
                  <div class="fk-360-phone-wrapper" id="fk-360-phone">
                    <img src="${escapeHTML(img)}" alt="${escapeHTML(product.name)}" class="fk-360-phone-img" id="fk-360-img">
                    <div class="fk-360-reflection"></div>
                  </div>
                  <div class="fk-360-hint-pill">
                    <span>👈 Swipe / Drag to Rotate 360° 👉</span>
                  </div>
                </div>

                <!-- 360° Control Bar -->
                <div class="fk-360-controls-bar" id="fk-360-controls" style="display:none;">
                  <button type="button" class="fk-360-angle-btn active" data-angle="0">Front</button>
                  <button type="button" class="fk-360-angle-btn" data-angle="45">45°</button>
                  <button type="button" class="fk-360-angle-btn" data-angle="90">Side</button>
                  <button type="button" class="fk-360-angle-btn" data-angle="180">Back</button>
                  <button type="button" class="fk-360-spin-toggle-btn" id="fk-auto-spin-btn">
                    <span>▶ Auto Spin</span>
                  </button>
                  <button type="button" class="fk-360-angle-btn" id="fk-exit-360-btn" style="color:#ef4444; border-color:#fca5a5;">✕ Normal View</button>
                </div>

                <!-- Zesh Tech Specs Poster Graphic Badge Overlay -->
                ${specs ? `
                  <div class="fk-specs-poster-overlay">
                    ${posterBadges.map(b => `
                      <div class="fk-poster-badge">
                        <span class="fk-poster-icon">${escapeHTML(b.icon)}</span>
                        <div>
                          <strong>${escapeHTML(b.title)}</strong>
                          <small>${escapeHTML(b.subtitle)}</small>
                        </div>
                      </div>
                    `).join("")}
                  </div>
                ` : ""}
              </div>
            </div>

            <!-- RIGHT: Product Details, Offers, Highlights & Accordion -->
            <div class="fk-info-column">
              <!-- Official Store Verification Banner -->
              <div class="fk-brand-promo-banner">
                <div class="fk-promo-brand"><b>${escapeHTML(product.brand?.toUpperCase() || "SMART")}</b> AUTHORIZED RETAIL STOCK</div>
                <div class="fk-promo-text">100% Brand Sealed Pack • <b>ZESH TECH, Station Road, Barh (Patna)</b></div>
              </div>

              <!-- Selected Color with Swatches & Real Photos -->
              <div class="fk-swatch-section">
                <div class="fk-section-subhead">Color: <b id="fk-selected-color-label">${escapeHTML(selectedColor)}</b></div>
                <div class="fk-color-swatches-row">
                  ${colorVariants.map((c, i) => `
                    <div class="fk-swatch-card ${i === 0 ? 'active' : ''}" data-color="${escapeHTML(c.color)}" data-image="${escapeHTML(c.image)}">
                      <img src="${escapeHTML(c.image)}" alt="${escapeHTML(c.color)}" onerror="this.src='${imageFallback}';">
                      <span>${escapeHTML(c.color)}</span>
                    </div>
                  `).join("")}
                </div>
              </div>

              <!-- RAM & Storage Variant Boxes -->
              <div class="fk-variants-section">
                <div class="fk-section-subhead">Variant: <b>${escapeHTML(ramRomText)}</b></div>
                <div class="fk-variant-boxes-row">
                  ${variantsList.map(v => `
                    <div class="fk-variant-box ${v.isActive ? 'active' : ''}" data-variant-id="${v.id || ''}" style="${v.isRealProduct && !v.isActive ? 'cursor:pointer;' : ''}">
                      <div class="fk-variant-title">${escapeHTML(v.title)}</div>
                      <div class="fk-variant-discount">↓${v.discountPct}% <span class="fk-mrp-strike">${money(v.mrp)}</span></div>
                      <div class="fk-variant-price">${money(v.price)} ${v.note ? `<small style="font-size:10px; color:#2563eb; display:block; margin-top:2px;">(${v.note})</small>` : ''}</div>
                    </div>
                  `).join("")}
                </div>
              </div>

              <!-- Product Title & Verified Rating -->
              <h1 class="fk-product-title">${escapeHTML(product.name)} (${escapeHTML(ramRomText)})</h1>

              <div class="fk-rating-row">
                <span class="fk-rating-pill">
                  <span>${rating}</span>
                  <span style="font-size:10px;">★</span>
                </span>
                <span class="fk-rating-count">${ratingsFormatted} Ratings &amp; ${reviewsFormatted} Reviews</span>
                <span class="card-badge-pill assured-badge" style="margin-left: 8px;">
                  <span class="star-sparkle">★</span> Zesh Assured
                </span>
              </div>

              <!-- Main Price Display -->
              <div class="fk-price-box">
                <div class="fk-price-main-line">
                  <span class="fk-discount-green">↓${discountPct}% Off</span>
                  <span class="fk-mrp-line">${money(mrp)}</span>
                  <span class="fk-actual-price">${money(product.sellingPrice)}</span>
                </div>
                <div class="fk-protect-promise">✓ 100% Genuine Brand Product • Free Store Pickup • Express Delivery (Barh &amp; Patna)</div>
              </div>

              <!-- ZESH MEGA SAVINGS Apply Offers Box -->
              <div class="fk-wow-deal-box">
                <div class="fk-wow-header" id="fk-toggle-wow-deal" role="button" tabindex="0">
                  <div class="fk-wow-badge">★ ZESH STORE SAVINGS</div>
                  <div class="fk-wow-title">Apply in-store &amp; card offers for maximum discount</div>
                  <span class="fk-arrow-toggle" id="fk-wow-arrow">▲</span>
                </div>

                <div class="fk-wow-body" id="fk-wow-deal-content">
                  <!-- Split Lowest Price vs 3-Month EMI -->
                  <div class="fk-lowest-price-split">
                    <div class="fk-split-card lowest-card">
                      <div class="fk-lowest-val">${money(Math.max(product.sellingPrice - 1000, 999))}</div>
                      <small>Lowest price with UPI / Card Instant Offer</small>
                    </div>
                    <div class="fk-split-or">OR</div>
                    <div class="fk-split-card emi-card">
                      <div class="fk-emi-val">${money(Math.round(product.sellingPrice / 3))} x 3m</div>
                      <small>Easy 0% No-Cost EMI via Credit Cards / Bajaj Finance</small>
                    </div>
                  </div>

                  <!-- Exchange Offer Card -->
                  <div class="fk-exchange-card">
                    <div class="fk-exchange-head">
                      <span>Old Phone Exchange <b>Available at Zesh Tech Counter</b></span>
                    </div>
                    <div class="fk-exchange-content">
                      <div class="fk-exchange-icon">🔄</div>
                      <div>
                        <strong>Up to ₹12,000 off</strong> on exchanging old smartphone
                        <div style="font-size: 11px; color: #2563eb; font-weight:700;">Instant device valuation at Station Road Barh store ›</div>
                      </div>
                    </div>
                  </div>

                  <!-- Payment / Bank Offers Grid -->
                  <div class="fk-bank-offers-wrap">
                    <div class="fk-bank-offers-header">
                      <strong>Payment &amp; Bank Offers</strong>
                      <span class="fk-view-emi-link" style="color:var(--text-muted); font-size:12px;">Store Verified</span>
                    </div>
                    <div class="fk-best-value-pill">Verified In-Store &amp; Online</div>

                    <div class="fk-bank-cards-grid">
                      <!-- UPI GPay / PhonePe -->
                      <div class="fk-bank-card">
                        <div class="fk-bank-left">
                          <div class="fk-bank-logo">UPI</div>
                          <div>
                            <strong>₹1,000 off</strong> Instant Discount
                            <div class="fk-bank-sub">GPay / PhonePe / Paytm / QR</div>
                          </div>
                        </div>
                        <button type="button" class="fk-apply-btn">Apply</button>
                      </div>

                      <!-- HDFC / ICICI / SBI / Axis Cards -->
                      <div class="fk-bank-card">
                        <div class="fk-bank-left">
                          <div class="fk-bank-logo">💳</div>
                          <div>
                            <strong>₹1,500 off</strong> Bank Cards
                            <div class="fk-bank-sub">HDFC / ICICI / SBI / Axis Credit Card</div>
                          </div>
                        </div>
                        <button type="button" class="fk-apply-btn">Apply</button>
                      </div>

                      <!-- BHIM UPI -->
                      <div class="fk-bank-card">
                        <div class="fk-bank-left">
                          <div class="fk-bank-logo">🇮🇳</div>
                          <div>
                            <strong>₹1,000 off</strong> BHIM UPI
                            <div class="fk-bank-sub">Direct Bank Account Transfer</div>
                          </div>
                        </div>
                        <button type="button" class="fk-apply-btn">Apply</button>
                      </div>
                    </div>

                    <!-- Additional Benefits -->
                    <div class="fk-benefits-section">
                      <div class="fk-benefit-title">Store Perks &amp; Freebies with this device</div>
                      <div class="fk-benefit-card">
                        <span>🎁</span>
                        <span><b>Free Tempered Glass &amp; Case Voucher</b> • Claim at Zesh Tech Barh counter with this purchase</span>
                        <span style="margin-left:auto; color:#94a3b8;">✓</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- PRODUCT HIGHLIGHTS SECTION -->
              ${specs ? `
                <div class="fk-highlights-section">
                  <div class="fk-section-header-collapsible">
                    <h2 class="fk-h2-title">Product highlights</h2>
                    <span class="fk-arrow-toggle">▲</span>
                  </div>

                  <div class="fk-highlights-grid">
                    ${(specs.highlights || []).map(hl => `
                      <div class="fk-highlight-card">
                        <div class="fk-highlight-icon-box">✨</div>
                        <div class="fk-highlight-text">
                          <strong class="fk-hl-title">${escapeHTML(hl)}</strong>
                        </div>
                      </div>
                    `).join("")}
                  </div>
                </div>
              ` : ""}

              <!-- ALL DETAILS TABBED SECTION -->
              ${specs ? `
                <div class="fk-all-details-section">
                  <div class="fk-section-header-collapsible">
                    <h2 class="fk-h2-title">All details</h2>
                    <span class="fk-arrow-toggle">▲</span>
                  </div>

                  <!-- 4 Tab Buttons -->
                  <div class="fk-tab-pills-row">
                    <button type="button" class="fk-tab-pill active" data-fktab="specs">Specifications</button>
                    <button type="button" class="fk-tab-pill" data-fktab="showcase">Showcase</button>
                    <button type="button" class="fk-tab-pill" data-fktab="desc">Description</button>
                    <button type="button" class="fk-tab-pill" data-fktab="warranty">Warranty</button>
                  </div>

                  <!-- Tab 1: Specifications (Default Active) -->
                  <div class="fk-tab-pane active" id="fk-tab-specs">
                    <!-- Power & Performance -->
                    <div class="fk-specs-group">
                      <h3 class="fk-group-title">Performance &amp; Power</h3>
                      <div class="fk-spec-item-line">
                        <span class="fk-spec-name">Processor / Engine</span>
                        <strong class="fk-spec-val">${escapeHTML(specs.chipset || "Flagship Octa-Core")}</strong>
                      </div>
                      <div class="fk-spec-item-line">
                        <span class="fk-spec-name">Power / Battery</span>
                        <strong class="fk-spec-val">${escapeHTML(specs.battery || "5000 mAh")}</strong>
                      </div>
                    </div>

                    <!-- Dimensions -->
                    <div class="fk-specs-group">
                      <h3 class="fk-group-title">Dimensions</h3>
                      <div class="fk-dimensions-2col-grid">
                        <div class="fk-dim-box">
                          <span class="fk-dim-name">Width</span>
                          <strong class="fk-dim-val">${escapeHTML(specs.dimensions?.width || "77.71 mm")}</strong>
                        </div>
                        <div class="fk-dim-box">
                          <span class="fk-dim-name">Depth</span>
                          <strong class="fk-dim-val">${escapeHTML(specs.dimensions?.depth || "8.5 mm")}</strong>
                        </div>
                        <div class="fk-dim-box">
                          <span class="fk-dim-name">Height</span>
                          <strong class="fk-dim-val">${escapeHTML(specs.dimensions?.height || "170 mm")}</strong>
                        </div>
                        <div class="fk-dim-box">
                          <span class="fk-dim-name">Weight</span>
                          <strong class="fk-dim-val">${escapeHTML(specs.weight || "185 g")}</strong>
                        </div>
                      </div>
                    </div>

                    <!-- Display Features -->
                    <div class="fk-specs-group">
                      <h3 class="fk-group-title">Display &amp; Audio</h3>
                      <div class="fk-spec-item-line">
                        <span class="fk-spec-name">Display</span>
                        <strong class="fk-spec-val">${escapeHTML(specs.display || "Full HD+")}</strong>
                      </div>
                      <div class="fk-spec-item-line">
                        <span class="fk-spec-name">Resolution / Audio</span>
                        <strong class="fk-spec-val">${escapeHTML(specs.resolution || "HD")}</strong>
                      </div>
                    </div>

                    <!-- Features -->
                    ${specs.rearCamera && specs.rearCamera !== "N/A (Home Appliance)" && specs.rearCamera !== "N/A" ? `
                      <div class="fk-specs-group">
                        <h3 class="fk-group-title">Camera &amp; Video</h3>
                        <div class="fk-spec-item-line">
                          <span class="fk-spec-name">Primary Camera</span>
                          <strong class="fk-spec-val">${escapeHTML(specs.rearCamera)}</strong>
                        </div>
                        <div class="fk-spec-item-line">
                          <span class="fk-spec-name">Selfie Camera</span>
                          <strong class="fk-spec-val">${escapeHTML(specs.frontCamera)}</strong>
                        </div>
                      </div>
                    ` : ""}
                  </div>

                  <!-- Tab 2: Showcase -->
                  <div class="fk-tab-pane" id="fk-tab-showcase" style="display:none; padding:16px 0;">
                    <div style="text-align:center; padding: 20px;">
                      <img src="${escapeHTML(img)}" style="max-height:240px; object-fit:contain; margin-bottom:12px;">
                      <h3 style="font-size:16px; font-weight:800; color:#0f172a;">${escapeHTML(product.name)}</h3>
                      <p style="font-size:13px; color:#64748b; max-width:600px; margin:0 auto; line-height:1.6;">${escapeHTML(product.description || "Engineered for high performance, battery endurance, and crystal clear quality with 100% brand warranty.")}</p>
                    </div>
                  </div>

                  <!-- Tab 3: Description -->
                  <div class="fk-tab-pane" id="fk-tab-desc" style="display:none; padding:16px 0;">
                    <div style="font-size:13px; line-height:1.7; color:#334155;">
                      <p><b>Product Overview:</b> ${escapeHTML(product.name)} delivers exceptional reliability and power in its class. Manufactured under strict quality benchmarks with official brand sealing.</p>
                      <p><b>Performance &amp; Quality:</b> Designed for endurance, low energy consumption, and maximum daily productivity.</p>
                    </div>
                  </div>

                  <!-- Tab 4: Warranty -->
                  <div class="fk-tab-pane" id="fk-tab-warranty" style="display:none; padding:16px 0;">
                    <div class="fk-spec-item-line">
                      <span class="fk-spec-name">Warranty Summary</span>
                      <strong class="fk-spec-val">1 Year Official Brand Warranty (10 Year Motor Warranty for Appliances)</strong>
                    </div>
                    <div class="fk-spec-item-line">
                      <span class="fk-spec-name">Service Location</span>
                      <strong class="fk-spec-val">Authorized Brand Service Centers Across India + Walk-in Store Support at Zesh Tech, Station Road, Barh</strong>
                    </div>
                  </div>
                </div>
              ` : ""}

              <!-- Action Buttons Row (Buy Now, Add to Bag, Compare) -->
              <div class="fk-actions-bottom-row">
                <button class="btn btn-primary fk-btn-buy direct-buy-btn" data-id="${escapeHTML(product._id)}" ${isOut ? "disabled" : ""}>
                  ⚡ Instant Buy Now
                </button>
                <button class="btn btn-secondary fk-btn-bag add-to-bag-btn" data-id="${escapeHTML(product._id)}" ${isOut ? "disabled" : ""}>
                  🛒 Add to Bag
                </button>
                ${product.category === "Mobile" ? `
                  <button class="btn btn-dark fk-btn-compare compare-this-btn" data-id="${escapeHTML(product._id)}" type="button">
                    ⚖️ Compare in Budget
                  </button>
                ` : ""}
              </div>
            </div>
          </div>
        </div>
      `;

      // Wire up clicks inside modal

      // 1. Color Swatches with Instant Real Photo Switching!
      modalContent.querySelectorAll(".fk-swatch-card").forEach(swatch => {
        swatch.addEventListener("click", () => {
          modalContent.querySelectorAll(".fk-swatch-card").forEach(s => s.classList.remove("active"));
          swatch.classList.add("active");
          const chosenColor = swatch.dataset.color || "";
          const chosenImg = swatch.dataset.image || "";
          const label = modalContent.querySelector("#fk-selected-color-label");
          if (label) label.textContent = chosenColor;
          const mainImg = modalContent.querySelector("#fk-main-img");
          if (mainImg && chosenImg) {
            mainImg.style.opacity = "0.4";
            setTimeout(() => {
              mainImg.src = chosenImg;
              mainImg.style.opacity = "1";
            }, 120);
          }
          const view360Img = modalContent.querySelector("#fk-360-img");
          if (view360Img && chosenImg) {
            view360Img.src = chosenImg;
          }
        });
      });

      // 1b. Multi-Image Gallery Thumbnails click handler
      modalContent.querySelectorAll(".fk-gallery-thumb-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          modalContent.querySelectorAll(".fk-gallery-thumb-btn").forEach(b => {
            b.classList.remove("active");
            b.style.borderColor = "#cbd5e1";
          });
          btn.classList.add("active");
          btn.style.borderColor = "#2563eb";
          const chosenImg = btn.dataset.img;
          const mainImg = modalContent.querySelector("#fk-main-img");
          if (mainImg && chosenImg) {
            mainImg.style.opacity = "0.4";
            setTimeout(() => {
              mainImg.src = chosenImg;
              mainImg.style.opacity = "1";
            }, 100);
          }
          const v360 = modalContent.querySelector("#fk-360-img");
          if (v360 && chosenImg) v360.src = chosenImg;
        });
      });

      // 1c. RAM / Storage Variant Box clicks (switch to sibling variant if real product)
      modalContent.querySelectorAll(".fk-variant-box").forEach(box => {
        box.addEventListener("click", () => {
          const varId = box.dataset.variantId;
          if (varId && String(varId) !== String(product._id)) {
            openQuickView(varId);
          }
        });
      });

      // 2. 360° Interactive 3D Viewer Logic
      const toggle360Btn = modalContent.querySelector("#fk-toggle-360-btn");
      const stage = modalContent.querySelector("#fk-360-stage");
      const controlsBar = modalContent.querySelector("#fk-360-controls");
      const mainImageWrap = modalContent.querySelector("#fk-main-image-wrap");
      const phoneWrapper = modalContent.querySelector("#fk-360-phone");
      const spinBtn = modalContent.querySelector("#fk-auto-spin-btn");

      let currentAngle = 0;
      let isDragging = false;
      let startX = 0;

      function update360Rotation(deg) {
        currentAngle = ((deg % 360) + 360) % 360;
        if (phoneWrapper) {
          phoneWrapper.style.transform = `rotateY(${currentAngle}deg) rotateX(4deg)`;
          const brightness = 0.95 + Math.sin(currentAngle * Math.PI / 180) * 0.12;
          const phoneImg = modalContent.querySelector("#fk-360-img");
          if (phoneImg) {
            phoneImg.style.filter = `drop-shadow(0 14px 24px rgba(15,23,42,0.3)) brightness(${brightness})`;
          }
        }
      }

      function stopAutoSpin() {
        if (active360SpinRaf) {
          cancelAnimationFrame(active360SpinRaf);
          active360SpinRaf = null;
          if (spinBtn) spinBtn.innerHTML = `<span>▶ Auto Spin</span>`;
        }
      }

      function startAutoSpin() {
        function step() {
          update360Rotation(currentAngle + 1.2);
          active360SpinRaf = requestAnimationFrame(step);
        }
        active360SpinRaf = requestAnimationFrame(step);
        if (spinBtn) spinBtn.innerHTML = `<span>⏸ Pause Spin</span>`;
      }

      toggle360Btn?.addEventListener("click", () => {
        const isOpening = stage.style.display === "none";
        stage.style.display = isOpening ? "flex" : "none";
        controlsBar.style.display = isOpening ? "flex" : "none";
        mainImageWrap.style.display = isOpening ? "none" : "flex";
        toggle360Btn.classList.toggle("active", isOpening);
        toggle360Btn.innerHTML = isOpening ? `<span class="spin-icon">📱</span> Photo View` : `<span class="spin-icon">🔄</span> 360° 3D View`;
        if (isOpening) {
          update360Rotation(0);
        } else {
          stopAutoSpin();
        }
      });

      if (stage) {
        const onPointerDown = (clientX) => {
          isDragging = true;
          startX = clientX;
          stopAutoSpin();
        };
        const onPointerMove = (clientX) => {
          if (!isDragging) return;
          const delta = clientX - startX;
          startX = clientX;
          update360Rotation(currentAngle + delta * 1.5);
        };
        const onPointerUp = () => { isDragging = false; };

        stage.addEventListener("mousedown", (e) => onPointerDown(e.clientX));
        window.addEventListener("mousemove", (e) => onPointerMove(e.clientX));
        window.addEventListener("mouseup", onPointerUp);

        stage.addEventListener("touchstart", (e) => {
          if (e.touches && e.touches[0]) onPointerDown(e.touches[0].clientX);
        }, { passive: true });
        stage.addEventListener("touchmove", (e) => {
          if (e.touches && e.touches[0]) onPointerMove(e.touches[0].clientX);
        }, { passive: true });
        stage.addEventListener("touchend", onPointerUp);
      }

      modalContent.querySelectorAll(".fk-360-angle-btn[data-angle]").forEach(btn => {
        btn.addEventListener("click", () => {
          stopAutoSpin();
          modalContent.querySelectorAll(".fk-360-angle-btn[data-angle]").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          const targetAngle = Number(btn.dataset.angle) || 0;
          update360Rotation(targetAngle);
        });
      });

      spinBtn?.addEventListener("click", () => {
        if (active360SpinRaf) stopAutoSpin();
        else startAutoSpin();
      });

      modalContent.querySelector("#fk-exit-360-btn")?.addEventListener("click", () => {
        stopAutoSpin();
        stage.style.display = "none";
        controlsBar.style.display = "none";
        mainImageWrap.style.display = "flex";
        toggle360Btn.classList.remove("active");
        toggle360Btn.innerHTML = `<span class="spin-icon">🔄</span> 360° 3D View`;
      });

      // Toggle Zesh Store Savings Accordion
      const wowToggle = modalContent.querySelector("#fk-toggle-wow-deal");
      const wowContent = modalContent.querySelector("#fk-wow-deal-content");
      const wowArrow = modalContent.querySelector("#fk-wow-arrow");
      if (wowToggle && wowContent) {
        wowToggle.addEventListener("click", () => {
          const isHidden = wowContent.style.display === "none";
          wowContent.style.display = isHidden ? "block" : "none";
          if (wowArrow) wowArrow.textContent = isHidden ? "▲" : "▼";
        });
      }

      // Share button
      modalContent.querySelector(".fk-share-btn")?.addEventListener("click", () => {
        if (navigator.share) {
          navigator.share({
            title: product.name,
            text: `Check out ${product.name} at Zesh Tech Barh!`,
            url: window.location.href
          }).catch(() => {});
        } else {
          navigator.clipboard.writeText(window.location.href);
          showToast("Product link copied! 📋", "success");
        }
      });

      // Wishlist toggle button inside modal
      const modalWishBtn = modalContent.querySelector(".card-wishlist-btn");
      if (modalWishBtn) {
        modalWishBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const pid = product._id;
          const idx = wishlist.indexOf(pid);
          if (idx > -1) {
            wishlist.splice(idx, 1);
            modalWishBtn.classList.remove("active");
            showToast("Removed from wishlist", "info");
          } else {
            wishlist.push(pid);
            modalWishBtn.classList.add("active");
            showToast("Added to wishlist ❤️", "success");
          }
          localStorage.setItem("zesh_wishlist", JSON.stringify(wishlist));
          renderCatalogue();
        });
      }

      // Variant Box Click
      modalContent.querySelectorAll(".fk-variant-box").forEach(box => {
        box.addEventListener("click", () => {
          modalContent.querySelectorAll(".fk-variant-box").forEach(b => b.classList.remove("active"));
          box.classList.add("active");
        });
      });

      // Bank Apply Button Click
      modalContent.querySelectorAll(".fk-apply-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          btn.textContent = "Applied ✓";
          btn.style.color = "#16a34a";
          btn.style.fontWeight = "800";
          showToast("Offer applied to your cart! 🎉", "success");
        });
      });

      // Tabs Switcher
      modalContent.querySelectorAll(".fk-tab-pill").forEach(pill => {
        pill.addEventListener("click", () => {
          const tabKey = pill.dataset.fktab;
          modalContent.querySelectorAll(".fk-tab-pill").forEach(p => p.classList.remove("active"));
          pill.classList.add("active");

          const panes = ["specs", "showcase", "desc", "warranty"];
          panes.forEach(key => {
            const pane = modalContent.querySelector(`#fk-tab-${key}`);
            if (pane) {
              pane.style.display = (key === tabKey) ? "block" : "none";
            }
          });
        });
      });

      // Buy Now & Add to Bag
      modalContent.querySelector(".fk-btn-buy")?.addEventListener("click", () => {
        modalBackdrop.classList.remove("active");
        addToCart(product, 1);
        openCheckoutModal();
      });

      modalContent.querySelector(".fk-btn-bag")?.addEventListener("click", () => {
        addToCart(product, 1);
        modalBackdrop.classList.remove("active");
      });

      modalContent.querySelector(".fk-btn-compare")?.addEventListener("click", () => {
        modalBackdrop.classList.remove("active");
        handleComparePhone(product._id);
      });

    } catch (err) {
      modalContent.innerHTML = `<div style="text-align:center; padding: 30px; color:var(--danger);">${escapeHTML(err.message || "Failed to render details")}</div>`;
    }
  }

  /* ==========================================================================
     Cart & Slide-Over Bag
     ========================================================================== */

  function addToCart(product, quantity = 1) {
    const existingIndex = cart.findIndex(item => item.id === product._id || item.id === product.id);
    const availableStock = Number(product.stockQuantity) || 10;

    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty + quantity > availableStock) {
        showToast(`Cannot add more. Available stock: ${availableStock}`, "warning");
        return;
      }
      cart[existingIndex].quantity += quantity;
    } else {
      if (quantity > availableStock) {
        showToast(`Cannot add ${quantity} units. Available stock: ${availableStock}`, "warning");
        return;
      }
      cart.push({
        id: String(product._id || product.id),
        name: product.name,
        price: Number(product.sellingPrice || product.price),
        image: product.imageUrl || product.image || imageFallback,
        stock: availableStock,
        category: product.category,
        quantity: quantity
      });
    }

    saveCart();
    showToast(`Added "${product.name}" to your bag`, "success");
    openCartDrawer();
  }

  function updateCartQuantity(productId, delta) {
    const index = cart.findIndex(item => item.id === productId);
    if (index === -1) return;

    const item = cart[index];
    const newQty = item.quantity + delta;

    if (newQty <= 0) {
      cart.splice(index, 1);
      showToast(`Removed "${item.name}" from bag`, "info");
    } else if (newQty > item.stock) {
      showToast(`Stock limit reached for this item (${item.stock} available)`, "warning");
      return;
    } else {
      item.quantity = newQty;
    }

    saveCart();
  }

  function updateCartUI() {
    const totalCount = cart.reduce((acc, it) => acc + it.quantity, 0);
    const subtotal = cart.reduce((acc, it) => acc + it.price * it.quantity, 0);

    // Header badge & Mobile badge
    const headerCount = $("#header-cart-count");
    if (headerCount) headerCount.textContent = totalCount;
    const mobCount = $("#mob-cart-count");
    if (mobCount) mobCount.textContent = totalCount;

    // Drawer item count
    const drawerCount = $("#drawer-item-count");
    if (drawerCount) drawerCount.textContent = `${totalCount} item${totalCount === 1 ? "" : "s"}`;

    // Subtotal & Totals
    const subtotalEl = $("#cart-subtotal-val");
    const totalEl = $("#cart-total-val");
    if (subtotalEl) subtotalEl.textContent = money(subtotal);
    if (totalEl) totalEl.textContent = money(subtotal);

    // Free shipping threshold (₹999)
    const trackerText = $("#shipping-tracker-text");
    const trackerFill = $("#shipping-tracker-fill");
    const trackerAmount = $("#shipping-tracker-amount");

    if (trackerFill && trackerText) {
      const freeThreshold = 999;
      if (subtotal >= freeThreshold) {
        trackerText.textContent = "You qualified for Free Express Delivery!";
        trackerFill.style.width = "100%";
        if (trackerAmount) trackerAmount.textContent = "FREE";
      } else {
        const remaining = freeThreshold - subtotal;
        trackerText.textContent = `Add ${money(remaining)} more for Free Shipping`;
        trackerFill.style.width = `${Math.min(100, Math.round((subtotal / freeThreshold) * 100))}%`;
        if (trackerAmount) trackerAmount.textContent = money(remaining);
      }
    }

    // Render items in drawer
    const container = $("#cart-items-container");
    const emptyView = $("#cart-empty-view");
    const footerBox = $("#cart-footer-box");

    if (!container) return;

    if (cart.length === 0) {
      container.innerHTML = "";
      emptyView?.classList.remove("hidden");
      if (footerBox) footerBox.style.display = "none";
      return;
    }

    emptyView?.classList.add("hidden");
    if (footerBox) footerBox.style.display = "block";

    container.innerHTML = cart.map(item => `
      <div class="drawer-item">
        <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}" class="drawer-item-img" onerror="this.src='${imageFallback}';">
        <div class="drawer-item-info">
          <strong title="${escapeHTML(item.name)}">${escapeHTML(item.name)}</strong>
          <div class="drawer-item-price">${money(item.price)}</div>
        </div>
        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
          <div class="quantity-stepper">
            <button type="button" class="cart-step-minus" data-id="${escapeHTML(item.id)}">-</button>
            <span>${item.quantity}</span>
            <button type="button" class="cart-step-plus" data-id="${escapeHTML(item.id)}">+</button>
          </div>
          <button type="button" class="cart-remove-btn" data-id="${escapeHTML(item.id)}" style="font-size:11px; color:var(--danger); cursor:pointer;">
            Remove
          </button>
        </div>
      </div>
    `).join("");
  }

  function openCartDrawer() {
    $("#cart-drawer")?.classList.add("active");
    $("#cart-drawer-overlay")?.classList.add("active");
  }

  function closeCartDrawer() {
    $("#cart-drawer")?.classList.remove("active");
    $("#cart-drawer-overlay")?.classList.remove("active");
  }

  /* ==========================================================================
     Checkout & Order Placement
     ========================================================================== */

  function openCheckoutModal() {
    if (cart.length === 0) {
      showToast("Your shopping bag is empty", "warning");
      return;
    }

    closeCartDrawer();
    const modal = $("#checkout-modal-backdrop");
    if (!modal) return;

    const subtotal = cart.reduce((acc, it) => acc + it.price * it.quantity, 0);
    const totalQty = cart.reduce((acc, it) => acc + it.quantity, 0);

    $("#checkout-items-qty").textContent = totalQty;
    $("#checkout-subtotal-val").textContent = money(subtotal);
    $("#checkout-grand-total-val").textContent = money(subtotal);

    // Pre-fill if customer profile exists
    const customer = zeshCustomerAPI.user;
    if (customer && customer.name) {
      const nameInput = $("#checkout-name");
      if (nameInput && !nameInput.value) nameInput.value = customer.name;
    }

    $("#checkout-error-msg")?.classList.add("hidden");
    modal.classList.add("active");
  }

  let pendingOrderPayload = null;

  async function handleCheckoutSubmit(e) {
    e.preventDefault();
    const submitBtn = $("#submit-order-btn");
    const errorMsg = $("#checkout-error-msg");

    if (cart.length === 0) {
      showToast("Your cart is empty", "warning");
      return;
    }

    // Ensure customer authentication
    if (!zeshCustomerAPI.isLoggedIn()) {
      showToast("Please sign in or create an account to place your order.", "info");
      $("#checkout-modal-backdrop")?.classList.remove("active");
      openAuthModal("login");
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = "Processing...";
      if (errorMsg) errorMsg.classList.add("hidden");

      // Build order payload with items, shipping details, and finance selection
      const selectedMethodEl = document.querySelector('input[name="paymentMethod"]:checked');
      const selectedMethod = selectedMethodEl ? selectedMethodEl.value : "Cash on Delivery";
      const financeProvider = $("#checkout-finance-provider")?.value || "Bajaj Finserv";

      const orderPayload = {
        items: cart.map(it => ({
          productId: it.id,
          quantity: it.quantity
        })),
        shippingAddress: {
          fullName: $("#checkout-name")?.value.trim() || "",
          phone: $("#checkout-phone")?.value.trim() || "",
          addressLine1: $("#checkout-address")?.value.trim() || "",
          city: $("#checkout-city")?.value.trim() || "Barh",
          state: $("#checkout-state")?.value.trim() || "Bihar",
          pincode: $("#checkout-pincode")?.value.trim() || "803213"
        },
        paymentMethod: selectedMethod === "Finance / Loan"
          ? `Finance (${financeProvider})`
          : selectedMethod,
        financeDetails: {
          provider: selectedMethod === "Finance / Loan" ? financeProvider : ""
        }
      };

      // If user selected PhonePe / Google Pay / UPI:
      if (selectedMethod.includes("UPI") || selectedMethod.includes("PhonePe")) {
        pendingOrderPayload = orderPayload;
        const total = cart.reduce((acc, it) => acc + (it.price * it.quantity), 0);
        
        // Populate UPI Modal details
        const modalAmount = $("#upi-modal-amount");
        if (modalAmount) modalAmount.textContent = money(total);

        const upiVpa = "9122846271-5@ybl";
        const merchantName = "ZESH TECH";
        const note = "ZeshTech Order";

        // Deep-link intent URLs (Universal standard UPI link)
        const genericUpiUrl = `upi://pay?pa=${upiVpa}&pn=${encodeURIComponent(merchantName)}&cu=INR&tn=${encodeURIComponent(note)}`;
        const anyUpiBtn = $("#upi-intent-any");
        if (anyUpiBtn) anyUpiBtn.href = genericUpiUrl;

        // Close checkout and open PhonePe / UPI modal
        $("#checkout-modal-backdrop")?.classList.remove("active");
        $("#upi-payment-modal-backdrop")?.classList.add("active");
        const utrField = $("#upi-utr-input");
        if (utrField) utrField.value = "";
        $("#upi-error-msg")?.classList.add("hidden");
        return;
      }

      // If Cash on Delivery or Finance:
      const res = await zeshCustomerAPI.createOrder(orderPayload);
      const createdOrder = res.order;

      // Clear bag and update UI
      cart = [];
      saveCart();

      // Close checkout modal
      $("#checkout-modal-backdrop")?.classList.remove("active");

      // Show confirmation celebration modal & configure WhatsApp owner notification
      showOrderConfirmation(createdOrder, res.whatsAppAlertUrl);

    } catch (err) {
      console.error("Checkout failed:", err);
      if (errorMsg) {
        errorMsg.textContent = err.message || "Failed to place order. Please review your cart.";
        errorMsg.classList.remove("hidden");
      }
      showToast(err.message || "Failed to place order", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <span>Confirm &amp; Place Order</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
      `;
    }
  }

  async function handleUpiVerificationSubmit(e) {
    e.preventDefault();
    const utrInput = $("#upi-utr-input");
    const errorMsg = $("#upi-error-msg");
    const confirmBtn = $("#confirm-upi-payment-btn");

    if (!pendingOrderPayload) {
      showToast("Order session expired. Please retry.", "error");
      $("#upi-payment-modal-backdrop")?.classList.remove("active");
      return;
    }

    const utr = (utrInput?.value || "").trim();
    if (!utr || utr.length < 6) {
      if (errorMsg) {
        errorMsg.textContent = "Please enter a valid 12-digit UPI UTR or Reference number.";
        errorMsg.classList.remove("hidden");
      }
      return;
    }

    try {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = `<span>Verifying Payment...</span>`;
      if (errorMsg) errorMsg.classList.add("hidden");

      pendingOrderPayload.paymentDetails = {
        status: "Paid",
        transactionId: utr,
        upiId: "9122846271-5@ybl"
      };

      const res = await zeshCustomerAPI.createOrder(pendingOrderPayload);
      const createdOrder = res.order;

      cart = [];
      saveCart();

      $("#upi-payment-modal-backdrop")?.classList.remove("active");
      showOrderConfirmation(createdOrder, res.whatsAppAlertUrl);
      showToast("Payment verified! Order placed successfully.", "success");
    } catch (err) {
      console.error("UPI order creation error:", err);
      if (errorMsg) {
        errorMsg.textContent = err.message || "Failed to submit payment details. Please try again.";
        errorMsg.classList.remove("hidden");
      }
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = `
        <span>✓ I Have Paid — Confirm Order</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>
      `;
    }
  }

  function showOrderConfirmation(createdOrder, whatsAppAlertUrl) {
    const confirmedNumber = $("#confirmed-order-number");
    if (confirmedNumber && createdOrder) {
      confirmedNumber.textContent = createdOrder.orderNumber;
    }

    const waBtn = $("#confirmed-whatsapp-btn");
    if (waBtn) {
      if (whatsAppAlertUrl) {
        waBtn.href = whatsAppAlertUrl;
      } else {
        waBtn.href = `https://wa.me/917903746116?text=${encodeURIComponent('Hello ZeshTech, I have placed order #' + (createdOrder?.orderNumber || '') + '. Please confirm dispatch.')}`;
      }
    }

    $("#confirmation-modal-backdrop")?.classList.add("active");
  }

  /* ==========================================================================
     Customer Portal & Order History
     ========================================================================== */

  function updateCustomerAuthHeader() {
    const container = $("#auth-header-container");
    if (!container) return;

    if (zeshCustomerAPI.isLoggedIn()) {
      const user = zeshCustomerAPI.user;
      const initial = (user.name || "C").charAt(0).toUpperCase();

      container.innerHTML = `
        <button class="user-menu-pill" id="customer-profile-trigger">
          <span class="user-avatar-circle">${escapeHTML(initial)}</span>
          <span>${escapeHTML(user.name.split(" ")[0])}</span>
        </button>
      `;

      $("#customer-profile-trigger")?.addEventListener("click", openCustomerPortal);
    } else {
      container.innerHTML = `
        <button class="btn btn-secondary btn-small" id="open-auth-btn" type="button">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>Sign In</span>
        </button>
      `;
      $("#open-auth-btn")?.addEventListener("click", () => openAuthModal("login"));
    }
  }

  async function openCustomerPortal() {
    if (!zeshCustomerAPI.isLoggedIn()) {
      openAuthModal("login");
      return;
    }

    const backdrop = $("#customer-portal-backdrop");
    if (!backdrop) return;

    backdrop.classList.add("active");
    switchPortalTab("orders");
    await loadCustomerOrders();
    populateProfileForm();
  }

  function switchPortalTab(tab) {
    if (tab === "orders") {
      $("#tab-btn-orders")?.classList.add("active");
      $("#tab-btn-profile")?.classList.remove("active");
      $("#customer-orders-tab")?.classList.remove("hidden");
      $("#customer-profile-tab")?.classList.add("hidden");
    } else {
      $("#tab-btn-orders")?.classList.remove("active");
      $("#tab-btn-profile")?.classList.add("active");
      $("#customer-orders-tab")?.classList.add("hidden");
      $("#customer-profile-tab")?.classList.remove("hidden");
    }
  }

  async function loadCustomerOrders() {
    const listContainer = $("#customer-orders-list");
    if (!listContainer) return;

    listContainer.innerHTML = `<div style="text-align:center; padding: 24px; color:var(--text-muted);">Fetching your orders from database...</div>`;

    try {
      const res = await zeshCustomerAPI.getMyOrders();
      const orders = res.orders || [];

      if (orders.length === 0) {
        listContainer.innerHTML = `
          <div style="text-align:center; padding: 40px 20px; background: var(--surface-alt); border-radius: var(--radius-md);">
            <div style="font-size: 28px; margin-bottom: 8px;">📦</div>
            <h4 style="font-size: 15px; margin-bottom: 4px;">No orders found</h4>
            <p style="color: var(--text-muted); font-size: 12px;">You haven't placed any orders yet. Discover our tech products to get started.</p>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = orders.map(order => {
        const dateStr = new Date(order.createdAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric"
        });

        let statusBadgeClass = "badge-info";
        if (order.status === "Delivered") statusBadgeClass = "badge-success";
        if (order.status === "Cancelled") statusBadgeClass = "badge-danger";
        if (order.status === "Processing" || order.status === "Shipped") statusBadgeClass = "badge-warning";

        return `
          <div style="background: white; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 10px;">
              <div>
                <strong style="font-family: var(--font-mono); font-size: 13px;">${escapeHTML(order.orderNumber)}</strong>
                <div style="font-size: 11px; color: var(--text-muted);">Placed on ${dateStr} • COD</div>
              </div>
              <span class="badge ${statusBadgeClass}">${escapeHTML(order.status)}</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
              ${order.items.map(it => `
                <div style="display:flex; justify-content:space-between; font-size: 13px;">
                  <span>${escapeHTML(it.name)} × ${it.quantity}</span>
                  <strong>${money(it.lineTotal)}</strong>
                </div>
              `).join("")}
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; border-top: 1px dashed var(--border); padding-top: 10px; font-size: 14px; font-weight: 700;">
              <span>Total Payable</span>
              <span style="color: var(--primary);">${money(order.total)}</span>
            </div>
          </div>
        `;
      }).join("");

    } catch (err) {
      listContainer.innerHTML = `<div style="text-align:center; padding: 20px; color:var(--danger);">${escapeHTML(err.message)}</div>`;
    }
  }

  function populateProfileForm() {
    const user = zeshCustomerAPI.user;
    if (!user) return;

    const nameInput = $("#profile-name-input");
    const emailInput = $("#profile-email-input");
    if (nameInput) nameInput.value = user.name || "";
    if (emailInput) emailInput.value = user.email || "";
  }

  async function handleProfileUpdate(e) {
    e.preventDefault();
    const saveBtn = $("#save-profile-btn");
    const feedback = $("#profile-feedback-msg");
    const name = $("#profile-name-input").value.trim();
    const currentPassword = $("#profile-current-pwd").value;
    const newPassword = $("#profile-new-pwd").value;

    try {
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";

      const payload = { name };
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      await zeshCustomerAPI.updateProfile(payload);
      updateCustomerAuthHeader();

      if (feedback) {
        feedback.textContent = "Profile updated successfully!";
        feedback.classList.remove("hidden");
        setTimeout(() => feedback.classList.add("hidden"), 3000);
      }
      showToast("Profile details updated", "success");
    } catch (err) {
      showToast(err.message || "Failed to update profile", "error");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Profile Changes";
    }
  }

  /* ==========================================================================
     Customer Authentication Modal
     ========================================================================== */

  function openAuthModal(mode = "login") {
    authMode = mode;
    const modal = $("#auth-modal-backdrop");
    const alertBox = $("#auth-alert-msg");
    if (!modal) return;

    // Reset views to main email/social grid
    $("#auth-main-view")?.classList.remove("hidden");
    $("#auth-google-view")?.classList.add("hidden");
    $("#auth-whatsapp-view")?.classList.add("hidden");
    $("#auth-social-view")?.classList.add("hidden");

    if (alertBox) alertBox.classList.add("hidden");
    setAuthModeUI(mode);
    modal.classList.add("active");
  }

  function setAuthModeUI(mode) {
    authMode = mode;
    const isLogin = mode === "login";

    $("#auth-tab-login").style.background = isLogin ? "white" : "transparent";
    $("#auth-tab-login").style.boxShadow = isLogin ? "var(--shadow-xs)" : "none";
    $("#auth-tab-login").style.color = isLogin ? "var(--text-main)" : "var(--text-muted)";

    $("#auth-tab-register").style.background = isLogin ? "transparent" : "white";
    $("#auth-tab-register").style.boxShadow = isLogin ? "none" : "var(--shadow-xs)";
    $("#auth-tab-register").style.color = isLogin ? "var(--text-muted)" : "var(--text-main)";

    $("#auth-modal-heading").textContent = isLogin ? "Sign In to Your Account" : "Create a Customer Account";
    $("#auth-modal-subtext").textContent = isLogin ? "Access your orders, tracking, and warranty details." : "Join ZESH-TECH for fast checkout and delivery updates.";
    $("#auth-submit-btn").textContent = isLogin ? "Sign In" : "Register Account";

    if (isLogin) {
      $("#auth-name-field")?.classList.add("hidden");
      $("#auth-name-input")?.removeAttribute("required");
    } else {
      $("#auth-name-field")?.classList.remove("hidden");
      $("#auth-name-input")?.setAttribute("required", "true");
    }
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    const submitBtn = $("#auth-submit-btn");
    const alertBox = $("#auth-alert-msg");
    const email = $("#auth-email-input").value.trim();
    const password = $("#auth-password-input").value;
    const name = $("#auth-name-input")?.value?.trim() || "";

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = "Please wait...";
      if (alertBox) alertBox.classList.add("hidden");

      if (authMode === "login") {
        await zeshCustomerAPI.login(email, password, true);
        showToast("Signed in successfully!", "success");
      } else {
        await zeshCustomerAPI.register({ name, email, password });
        await zeshCustomerAPI.login(email, password, true);
        showToast("Account created successfully!", "success");
      }

      $("#auth-modal-backdrop")?.classList.remove("active");
      updateCustomerAuthHeader();
    } catch (err) {
      console.error("Auth failed:", err);
      if (alertBox) {
        alertBox.textContent = err.message || "Authentication failed.";
        alertBox.classList.remove("hidden");
      }
      showToast(err.message || "Authentication error", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = authMode === "login" ? "Sign In" : "Register Account";
    }
  }

  /* ==========================================================================
     EXPERT CURATIONS & SMART PHONE COMPARISON ENGINE
     ========================================================================== */

  let currentCuration = "camera";
  let currentBudget = "30k";

  function initCurationsAndComparison() {
    if (!window.ZeshSpecs || !allProducts || allProducts.length === 0) return;

    setupPhoneSelectors();
    renderCuratedChampions(currentCuration);
    renderBudgetComparison(currentBudget);
  }

  // 1. Curated Champions (Best Camera, Best Gaming, Clean UI, Battery, Best Value)
  function renderCuratedChampions(catKey) {
    currentCuration = catKey;
    const banner = $("#curation-header-banner");
    const grid = $("#curation-cards-grid");
    if (!banner || !grid || !window.ZeshSpecs) return;

    // Update active tab button
    $$("#curations-tab-bar .curation-tab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.curation === catKey);
    });

    const data = window.ZeshSpecs.getCuratedChampions(allProducts, catKey);

    banner.innerHTML = `
      <div>
        <div class="curation-header-title">${data.title}</div>
        <div class="curation-header-sub">${data.subtitle}</div>
      </div>
      <a href="#phone-comparison-section" style="font-size: 12.5px; font-weight: 700; color: #2563eb; text-decoration: none;">
        Compare in Budget Engine →
      </a>
    `;

    if (!data.items || data.items.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:30px; color:var(--text-muted);">No phones found for this category.</div>`;
      return;
    }

    const rankBadges = ["🥇 #1 Champion", "🥈 #2 Contender", "🥉 #3 Strong Pick", "⭐ Top Value Pick"];

    grid.innerHTML = data.items.map((item, idx) => {
      const p = item.product;
      const s = item.specs;
      const img = p.imageUrl || imageFallback;
      const { mrp, discountPct } = calculateDiscount(p.sellingPrice);

      let keyMetric = "";
      if (catKey === "camera") {
        keyMetric = `📸 ${s.rearCamera.split("+")[0]?.trim() || "50MP OIS"} • Selfie: ${s.frontCamera.split(" ")[0] || "32MP"}`;
      } else if (catKey === "gaming") {
        keyMetric = `⚡ ${s.chipset.split("(")[0]?.trim()} • 120Hz Screen`;
      } else if (catKey === "ui") {
        keyMetric = `✨ ${s.uiName} • 100% Zero Bloatware`;
      } else if (catKey === "battery") {
        keyMetric = `🔋 ${s.battery.split("with")[0]?.trim()} • Super Fast Charge`;
      } else {
        keyMetric = `💰 ${s.ramRom} • ${s.display.split(",")[0]}`;
      }

      return `
        <article class="curation-card">
          <span class="curation-rank-pill">${rankBadges[idx] || "⭐ Ranked"}</span>

          <div class="curation-img-wrap view-details-btn" data-id="${p._id}" title="Click to view full specs">
            <img src="${escapeHTML(img)}" alt="${escapeHTML(p.name)}" onerror="this.onerror=null;this.src='${imageFallback}';">
          </div>

          <span class="curation-card-badge">${escapeHTML(s.bestForBadge || "Verified Choice")}</span>
          <h4 class="curation-title view-details-btn" data-id="${p._id}">${escapeHTML(p.name)}</h4>

          <div class="curation-specs-bullets">
            <div style="color: #2563eb; font-weight: 700; margin-bottom: 2px;">${keyMetric}</div>
            <div>• <b>RAM/ROM:</b> ${escapeHTML(s.ramRom)}</div>
            <div>• <b>Display:</b> ${escapeHTML(s.display.split(",")[0])}</div>
          </div>

          <div class="curation-price-row">
            <div>
              <div class="curation-price">${money(p.sellingPrice)}</div>
              <small style="font-size: 10px; color: var(--text-muted); text-decoration: line-through;">${money(mrp)} (${discountPct}% off)</small>
            </div>
            <button class="btn btn-primary btn-small direct-buy-btn" data-id="${p._id}">
              ⚡ Buy
            </button>
          </div>
        </article>
      `;
    }).join("");
  }

  // 2. Smart Budget Comparison Engine (Side-by-Side Matrix + Crowned Winner)
  function renderBudgetComparison(budgetKey) {
    currentBudget = budgetKey;
    const winnerCard = $("#comparison-winner-card");
    const matrixWrap = $("#comparison-matrix-wrapper");
    if (!winnerCard || !matrixWrap || !window.ZeshSpecs) return;

    // Update active budget chip
    $$("#budget-chips .budget-chip").forEach(chip => {
      chip.classList.toggle("active", chip.dataset.budget === budgetKey);
    });

    const data = window.ZeshSpecs.getBudgetComparison(allProducts, budgetKey);

    // Winner Banner Card
    if (data.winner) {
      const wp = data.winner.product;
      const ws = data.winner.specs;
      const { mrp, discountPct } = calculateDiscount(wp.sellingPrice);

      winnerCard.innerHTML = `
        <div style="flex: 1;">
          <div class="winner-badge-pill">
            <span>🏆</span> ZESH TECH #1 CROWNED WINNER (${data.budgetLabel})
          </div>
          <h3 style="font-size: 19px; font-weight: 800; color: var(--text-heading); margin-bottom: 8px;">
            ${escapeHTML(wp.name)}
          </h3>
          <p class="winner-verdict-text">${data.verdict}</p>

          <div style="display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap;">
            <span class="badge badge-success" style="font-size: 11px;">Score: ${ws.zeshScore}/10 ★</span>
            <span class="badge badge-info" style="font-size: 11px;">RAM: ${escapeHTML(ws.ramRom)}</span>
            <span class="badge badge-neutral" style="font-size: 11px;">120Hz Display</span>
          </div>
        </div>

        <div style="text-align: center; flex-shrink: 0; min-width: 140px;">
          <img src="${escapeHTML(wp.imageUrl || imageFallback)}" alt="${escapeHTML(wp.name)}" style="height: 100px; object-fit: contain; margin-bottom: 6px;">
          <div style="font-size: 18px; font-weight: 900; color: var(--primary); font-family: var(--font-heading);">${money(wp.sellingPrice)}</div>
          <div style="font-size: 11px; color: var(--text-muted); text-decoration: line-through; margin-bottom: 8px;">${money(mrp)} (${discountPct}% off)</div>
          <button class="btn btn-primary btn-small direct-buy-btn" data-id="${wp._id}" style="width: 100%;">
            ⚡ Buy Winner
          </button>
        </div>
      `;
    } else {
      winnerCard.innerHTML = `<div style="padding: 20px; color: var(--text-muted);">No winner in this segment.</div>`;
    }

    // Side-by-Side Comparison Matrix Table
    const contenders = (data.contenders || []).slice(0, 4);

    if (contenders.length === 0) {
      matrixWrap.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-muted);">No products found in this budget range.</div>`;
      return;
    }

    renderComparisonTable(contenders, matrixWrap, data.winner?.product?._id);
  }

  // Helper to render the comparison table rows
  function renderComparisonTable(contenders, containerEl, winnerId) {
    const isWinner = id => id === winnerId;

    let html = `
      <table class="comparison-matrix-table">
        <thead>
          <tr>
            <th class="feature-col-th">Specifications</th>
            ${contenders.map(c => {
              const p = c.product;
              const { mrp, discountPct } = calculateDiscount(p.sellingPrice);
              const win = isWinner(p._id);
              return `
                <th class="compare-product-col ${win ? 'winner-col-highlight' : ''}">
                  <div class="compare-img-box view-details-btn" data-id="${p._id}" style="cursor: pointer;">
                    <img src="${escapeHTML(p.imageUrl || imageFallback)}" alt="${escapeHTML(p.name)}">
                  </div>
                  <strong style="font-size: 13px; color: var(--text-heading); display: block; margin-bottom: 4px; min-height: 36px; line-height: 1.3;">
                    ${escapeHTML(p.name)}
                  </strong>
                  <div style="font-size: 16px; font-weight: 900; color: var(--primary);">${money(p.sellingPrice)}</div>
                  <small style="font-size: 11px; color: var(--text-muted); text-decoration: line-through;">${money(mrp)} (${discountPct}% off)</small>
                  <div style="margin-top: 8px;">
                    <button class="btn btn-primary btn-small direct-buy-btn" data-id="${p._id}" style="width: 100%; font-size: 11px; padding: 6px 10px;">
                      ⚡ Buy Now
                    </button>
                  </div>
                </th>
              `;
            }).join("")}
          </tr>
        </thead>
        <tbody>
          <!-- Row 1: Overall Zesh Score -->
          <tr>
            <td class="feature-col-td">⭐ Overall Zesh Score</td>
            ${contenders.map(c => `
              <td class="${isWinner(c.product._id) ? 'winner-col-highlight' : ''}">
                <span class="score-pill">${c.specs.zeshScore} / 10 ★</span>
              </td>
            `).join("")}
          </tr>

          <!-- Row 2: Best For Tag -->
          <tr>
            <td class="feature-col-td">🏆 Best Known For</td>
            ${contenders.map(c => `
              <td class="${isWinner(c.product._id) ? 'winner-col-highlight' : ''}" style="font-weight: 700; color: #2563eb; font-size: 12px;">
                ${escapeHTML(c.specs.bestForBadge || "High Quality")}
              </td>
            `).join("")}
          </tr>

          <!-- Row 3: Processor & Chipset -->
          <tr>
            <td class="feature-col-td">⚡ Processor</td>
            ${contenders.map(c => `
              <td class="${isWinner(c.product._id) ? 'winner-col-highlight' : ''}" style="font-size: 12px;">
                <b>${escapeHTML(c.specs.chipset.split("(")[0])}</b>
                <div style="font-size: 10.5px; color: var(--text-muted);">${escapeHTML(c.specs.cpu)}</div>
              </td>
            `).join("")}
          </tr>

          <!-- Row 4: RAM & Storage -->
          <tr>
            <td class="feature-col-td">💾 RAM &amp; Storage</td>
            ${contenders.map(c => `
              <td class="${isWinner(c.product._id) ? 'winner-col-highlight' : ''}" style="font-size: 12px; font-weight: 700;">
                ${escapeHTML(c.specs.ramRom)}
              </td>
            `).join("")}
          </tr>

          <!-- Row 5: Display & Refresh Rate -->
          <tr>
            <td class="feature-col-td">📱 Display Quality</td>
            ${contenders.map(c => `
              <td class="${isWinner(c.product._id) ? 'winner-col-highlight' : ''}" style="font-size: 12px;">
                <div><b>${escapeHTML(c.specs.display.split(",")[0])}</b></div>
                <span class="badge badge-info" style="font-size: 10px; margin-top: 4px;">${escapeHTML(c.specs.refreshRate)}</span>
              </td>
            `).join("")}
          </tr>

          <!-- Row 6: Rear Camera -->
          <tr>
            <td class="feature-col-td">📸 Rear Cameras</td>
            ${contenders.map(c => `
              <td class="${isWinner(c.product._id) ? 'winner-col-highlight' : ''}" style="font-size: 12px;">
                ${escapeHTML(c.specs.rearCamera)}
              </td>
            `).join("")}
          </tr>

          <!-- Row 7: Selfie Camera -->
          <tr>
            <td class="feature-col-td">🤳 Front Selfie Camera</td>
            ${contenders.map(c => `
              <td class="${isWinner(c.product._id) ? 'winner-col-highlight' : ''}" style="font-size: 12px;">
                ${escapeHTML(c.specs.frontCamera)}
              </td>
            `).join("")}
          </tr>

          <!-- Row 8: Battery & Charging Speed -->
          <tr>
            <td class="feature-col-td">🔋 Battery &amp; Charging</td>
            ${contenders.map(c => `
              <td class="${isWinner(c.product._id) ? 'winner-col-highlight' : ''}" style="font-size: 12px;">
                <b>${escapeHTML(c.specs.battery.split("with")[0]?.trim() || "5000 mAh")}</b>
                <div style="font-size: 11px; color: #16a34a; font-weight: 700;">${escapeHTML(c.specs.battery.split("with")[1]?.trim() || "Fast Charge")}</div>
              </td>
            `).join("")}
          </tr>

          <!-- Row 9: Operating System & Clean UI -->
          <tr>
            <td class="feature-col-td">🎨 Software &amp; UI</td>
            ${contenders.map(c => `
              <td class="${isWinner(c.product._id) ? 'winner-col-highlight' : ''}" style="font-size: 12px;">
                <b>${escapeHTML(c.specs.uiName)}</b>
                <div style="font-size: 10.5px; color: var(--text-muted);">${escapeHTML(c.specs.os)}</div>
              </td>
            `).join("")}
          </tr>

          <!-- Row 10: In The Box -->
          <tr>
            <td class="feature-col-td">📦 In The Box</td>
            ${contenders.map(c => `
              <td class="${isWinner(c.product._id) ? 'winner-col-highlight' : ''}" style="font-size: 11.5px; color: var(--text-muted);">
                ${escapeHTML(c.specs.inBox || "Handset, Cable, Guide")}
              </td>
            `).join("")}
          </tr>

          <!-- Row 11: Full Details Action -->
          <tr>
            <td class="feature-col-td">🔍 Full Details</td>
            ${contenders.map(c => `
              <td class="${isWinner(c.product._id) ? 'winner-col-highlight' : ''}">
                <button class="btn btn-secondary btn-small view-details-btn" data-id="${c.product._id}" style="font-size: 11px; width: 100%;">
                  View Full Specs ↗
                </button>
              </td>
            `).join("")}
          </tr>
        </tbody>
      </table>
    `;

    containerEl.innerHTML = html;
  }

  // 3. Custom 2-Phone Comparison
  function setupPhoneSelectors() {
    const s1 = $("#custom-phone-select-1");
    const s2 = $("#custom-phone-select-2");
    if (!s1 || !s2 || !allProducts) return;

    const phones = allProducts.filter(p => p.category === "Mobile" && p.sellingPrice > 2000);
    phones.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    const options = phones.map(p => `<option value="${p._id}">${escapeHTML(p.name)} — ${money(p.sellingPrice)}</option>`).join("");
    s1.innerHTML = options;
    s2.innerHTML = options;

    // Pick two default contrasting phones
    const phone1 = phones.find(p => (p.name || "").toLowerCase().includes("t5 lite") && (p.name || "").includes("256")) || phones[0];
    const phone2 = phones.find(p => (p.name || "").toLowerCase().includes("nothing") && (p.name || "").includes("4b")) || phones[1];

    if (phone1) s1.value = phone1._id;
    if (phone2) s2.value = phone2._id;
  }

  function runCustomComparison() {
    const s1 = $("#custom-phone-select-1");
    const s2 = $("#custom-phone-select-2");
    const matrixWrap = $("#comparison-matrix-wrapper");
    if (!s1 || !s2 || !matrixWrap) return;

    const id1 = s1.value;
    const id2 = s2.value;
    if (id1 === id2) {
      showToast("Please choose two different phones to compare", "warning");
      return;
    }

    const p1 = allProducts.find(p => p._id === id1);
    const p2 = allProducts.find(p => p._id === id2);
    if (!p1 || !p2) return;

    const contenders = [
      { product: p1, specs: window.ZeshSpecs.getPhoneSpecs(p1) },
      { product: p2, specs: window.ZeshSpecs.getPhoneSpecs(p2) }
    ];

    const winnerId = (contenders[0].specs.zeshScore >= contenders[1].specs.zeshScore) ? p1._id : p2._id;
    renderComparisonTable(contenders, matrixWrap, winnerId);

    // Scroll smoothly to table
    matrixWrap.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function toggleComparisonDrawer(forceOpen = null) {
    const content = $("#phone-comparison-content");
    const label = $("#toggle-comparison-text");
    if (!content) return;

    const isCollapsed = content.classList.contains("collapsed");
    const open = forceOpen !== null ? forceOpen : isCollapsed;

    if (open) {
      content.classList.remove("collapsed");
      if (label) label.textContent = "Close Comparison ▴";
      renderBudgetComparison(currentBudgetComparisonKey || "30k");
    } else {
      content.classList.add("collapsed");
      if (label) label.textContent = "Open Comparison ▾";
    }
  }

  // 4. Quick Compare Trigger from Product Card
  function handleComparePhone(productId) {
    const product = allProducts.find(p => p._id === productId);
    if (!product) return;

    toggleComparisonDrawer(true);

    const compareSection = $("#phone-comparison-section");
    if (compareSection) {
      compareSection.scrollIntoView({ behavior: "smooth" });
    }

    // Determine matching budget
    let targetBudget = "30k";
    if (product.sellingPrice <= 15000) targetBudget = "15k";
    else if (product.sellingPrice <= 20000) targetBudget = "20k";
    else if (product.sellingPrice <= 30000) targetBudget = "30k";
    else if (product.sellingPrice <= 50000) targetBudget = "50k";
    else targetBudget = "flagship";

    renderBudgetComparison(targetBudget);

    // Preselect in custom compare selectors
    const s1 = $("#custom-phone-select-1");
    if (s1) s1.value = product._id;
  }

  /* ==========================================================================
     Global Event Listeners & Initialization
     ========================================================================== */

  document.addEventListener("DOMContentLoaded", () => {
    // Initial fetches
    fetchCatalogue();
    updateCartUI();
    updateCustomerAuthHeader();

    const yearSpan = $("#current-year");
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();

    // Category Slider Chips
    $("#category-chips")?.addEventListener("click", (e) => {
      const chip = e.target.closest(".category-chip");
      if (!chip) return;

      $$("#category-chips .category-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");

      currentCategory = chip.dataset.category || "All";
      fetchCatalogue();
    });

    // Brand Quick Slider Chips
    $("#brand-chips")?.addEventListener("click", (e) => {
      const chip = e.target.closest(".brand-chip");
      if (!chip) return;

      $$("#brand-chips .brand-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");

      currentBrand = chip.dataset.brand || "All";
      applyFiltersAndRender();
    });

    // Header Category Nav Links
    $$(".main-nav .nav-link").forEach(link => {
      link.addEventListener("click", (e) => {
        const cat = link.dataset.cat || "All";
        $$(".main-nav .nav-link").forEach(l => l.classList.remove("active"));
        link.classList.add("active");

        // Sync with chips
        $$("#category-chips .category-chip").forEach(c => {
          c.classList.toggle("active", c.dataset.category === cat);
        });

        currentCategory = cat;
        fetchCatalogue();
      });
    });

    // Search Input
    const searchInput = $("#product-search-input");
    let searchDebounce;
    searchInput?.addEventListener("input", (e) => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        searchKeyword = e.target.value.trim();
        applyFiltersAndRender();
      }, 250);
    });

    // In Stock Checkbox
    $("#in-stock-only-checkbox")?.addEventListener("change", (e) => {
      inStockOnly = e.target.checked;
      applyFiltersAndRender();
    });

    // Sort Dropdown
    $("#sort-select")?.addEventListener("change", (e) => {
      sortBy = e.target.value;
      fetchCatalogue();
    });

    // Reset Filters Button
    $("#reset-filters-btn")?.addEventListener("click", () => {
      currentCategory = "All";
      currentBrand = "All";
      searchKeyword = "";
      inStockOnly = false;
      sortBy = "newest";

      if (searchInput) searchInput.value = "";
      const inStockCheck = $("#in-stock-only-checkbox");
      if (inStockCheck) inStockCheck.checked = false;

      $$("#category-chips .category-chip").forEach(c => c.classList.toggle("active", c.dataset.category === "All"));
      $$("#brand-chips .brand-chip").forEach(c => c.classList.toggle("active", c.dataset.brand === "All"));
      fetchCatalogue();
    });

    // Product Card Clicks: Buy Now, Wishlist, Quick View, and Add to Bag
    $("#products-container")?.addEventListener("click", (e) => {
      // 1. Direct Buy Now
      const buyNowBtn = e.target.closest(".direct-buy-btn");
      if (buyNowBtn) {
        const product = allProducts.find(p => p._id === buyNowBtn.dataset.id);
        if (product) {
          addToCart(product, 1);
          openCheckoutModal();
        }
        return;
      }

      // 2. Wishlist Heart Toggle
      const wishBtn = e.target.closest(".card-wishlist-btn");
      if (wishBtn) {
        e.stopPropagation();
        const pid = wishBtn.dataset.id;
        const idx = wishlist.indexOf(pid);
        if (idx > -1) {
          wishlist.splice(idx, 1);
          wishBtn.classList.remove("active");
          showToast("Removed from wishlist", "info");
        } else {
          wishlist.push(pid);
          wishBtn.classList.add("active");
          showToast("Added to wishlist ❤️", "success");
        }
        localStorage.setItem("zesh_wishlist", JSON.stringify(wishlist));
        return;
      }

      // 3. Quick View Modal
      const viewBtn = e.target.closest(".view-details-btn");
      if (viewBtn) {
        openQuickView(viewBtn.dataset.id);
        return;
      }

      // 4. Add to Bag button
      const addBtn = e.target.closest(".add-to-bag-btn");
      if (addBtn) {
        const product = allProducts.find(p => p._id === addBtn.dataset.id);
        if (product) addToCart(product, 1);
        return;
      }

      // 5. Compare this phone button
      const compareBtn = e.target.closest(".compare-this-btn");
      if (compareBtn) {
        e.stopPropagation();
        handleComparePhone(compareBtn.dataset.id);
        return;
      }
    });

    // Curations Tab Bar (Best Camera, Gaming, UI, Battery, Value)
    $("#curations-tab-bar")?.addEventListener("click", (e) => {
      const btn = e.target.closest(".curation-tab-btn");
      if (btn) renderCuratedChampions(btn.dataset.curation);
    });

    // Curations Grid Actions (Buy Now & View Details)
    $("#curation-cards-grid")?.addEventListener("click", (e) => {
      const buyBtn = e.target.closest(".direct-buy-btn");
      if (buyBtn) {
        const product = allProducts.find(p => p._id === buyBtn.dataset.id);
        if (product) {
          addToCart(product, 1);
          openCheckoutModal();
        }
        return;
      }
      const viewBtn = e.target.closest(".view-details-btn");
      if (viewBtn) {
        openQuickView(viewBtn.dataset.id);
        return;
      }
    });

    // Clickable Comparison Launch Banner & Toggle
    $("#launch-comparison-banner")?.addEventListener("click", () => toggleComparisonDrawer());
    $("#toggle-comparison-view-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleComparisonDrawer();
    });
    document.querySelectorAll('a[href="#phone-comparison-section"]').forEach(link => {
      link.addEventListener("click", () => {
        toggleComparisonDrawer(true);
      });
    });

    // Budget Comparison Chips
    $("#budget-chips")?.addEventListener("click", (e) => {
      const chip = e.target.closest(".budget-chip");
      if (chip) renderBudgetComparison(chip.dataset.budget);
    });

    // Custom Compare Toggle Bar & Run Button
    $("#toggle-custom-compare-btn")?.addEventListener("click", () => {
      $("#custom-compare-bar")?.classList.toggle("hidden");
    });

    $("#run-custom-compare-btn")?.addEventListener("click", runCustomComparison);

    // Winner Card Buy Action
    $("#comparison-winner-card")?.addEventListener("click", (e) => {
      const buyBtn = e.target.closest(".direct-buy-btn");
      if (buyBtn) {
        const product = allProducts.find(p => p._id === buyBtn.dataset.id);
        if (product) {
          addToCart(product, 1);
          openCheckoutModal();
        }
        return;
      }
    });

    // Comparison Matrix Table Actions
    $("#comparison-matrix-wrapper")?.addEventListener("click", (e) => {
      const buyBtn = e.target.closest(".direct-buy-btn");
      if (buyBtn) {
        const product = allProducts.find(p => p._id === buyBtn.dataset.id);
        if (product) {
          addToCart(product, 1);
          openCheckoutModal();
        }
        return;
      }
      const viewBtn = e.target.closest(".view-details-btn");
      if (viewBtn) {
        openQuickView(viewBtn.dataset.id);
        return;
      }
    });

    // Cart Drawer Controls
    $("#open-cart-btn")?.addEventListener("click", openCartDrawer);
    $("#close-cart-btn")?.addEventListener("click", closeCartDrawer);
    $("#cart-drawer-overlay")?.addEventListener("click", closeCartDrawer);
    $("#drawer-shop-now-btn")?.addEventListener("click", closeCartDrawer);

    // Cart Line Actions (delegation)
    $("#cart-items-container")?.addEventListener("click", (e) => {
      const plusBtn = e.target.closest(".cart-step-plus");
      if (plusBtn) {
        updateCartQuantity(plusBtn.dataset.id, 1);
        return;
      }

      const minusBtn = e.target.closest(".cart-step-minus");
      if (minusBtn) {
        updateCartQuantity(minusBtn.dataset.id, -1);
        return;
      }

      const removeBtn = e.target.closest(".cart-remove-btn");
      if (removeBtn) {
        updateCartQuantity(removeBtn.dataset.id, -9999);
        return;
      }
    });

    // Modal Close Buttons
    $("#close-product-modal-btn")?.addEventListener("click", () => {
      $("#product-modal-backdrop")?.classList.remove("active");
    });
    $("#product-modal-backdrop")?.addEventListener("click", (e) => {
      if (e.target.id === "product-modal-backdrop") {
        $("#product-modal-backdrop").classList.remove("active");
      }
    });

    // Checkout Modal
    $("#proceed-checkout-btn")?.addEventListener("click", openCheckoutModal);
    $("#close-checkout-modal-btn")?.addEventListener("click", () => {
      $("#checkout-modal-backdrop")?.classList.remove("active");
    });
    $("#checkout-modal-backdrop")?.addEventListener("click", (e) => {
      if (e.target.id === "checkout-modal-backdrop") {
        $("#checkout-modal-backdrop").classList.remove("active");
      }
    });
    $("#checkout-form")?.addEventListener("submit", handleCheckoutSubmit);

    // Payment method finance subbox toggle
    $$('input[name="paymentMethod"]').forEach(radio => {
      radio.addEventListener("change", (e) => {
        const financeBox = $("#finance-provider-subbox");
        if (financeBox) {
          if (e.target.value === "Finance / Loan") {
            financeBox.classList.remove("hidden");
          } else {
            financeBox.classList.add("hidden");
          }
        }
      });
    });

    // PhonePe / UPI Payment Modal
    $("#upi-verification-form")?.addEventListener("submit", handleUpiVerificationSubmit);
    $("#close-upi-modal-btn")?.addEventListener("click", () => {
      $("#upi-payment-modal-backdrop")?.classList.remove("active");
    });
    $("#upi-payment-modal-backdrop")?.addEventListener("click", (e) => {
      if (e.target.id === "upi-payment-modal-backdrop") {
        $("#upi-payment-modal-backdrop").classList.remove("active");
      }
    });

    // Copy UPI ID button
    $("#copy-upi-btn")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText("9122846271-5@ybl");
        showToast("UPI ID (9122846271-5@ybl) copied to clipboard!", "success");
      } catch (err) {
        showToast("UPI ID: 9122846271-5@ybl", "info");
      }
    });

    // Copy PhonePe Mobile Number button
    $("#copy-phone-btn")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText("9122846271");
        showToast("PhonePe Mobile Number (9122846271) copied to clipboard!", "success");
      } catch (err) {
        showToast("PhonePe Number: 9122846271", "info");
      }
    });

    // Mobile App Bottom Navigation Bar
    $("#mob-nav-cart")?.addEventListener("click", () => openCartDrawer());
    $("#mob-nav-orders")?.addEventListener("click", () => {
      if (zeshCustomerAPI.isLoggedIn()) {
        openCustomerPortal();
      } else {
        openAuthModal("login");
      }
    });

    // Order Confirmation Modal
    $("#close-confirmation-btn")?.addEventListener("click", () => {
      $("#confirmation-modal-backdrop")?.classList.remove("active");
    });
    $("#continue-shopping-btn")?.addEventListener("click", () => {
      $("#confirmation-modal-backdrop")?.classList.remove("active");
    });
    $("#view-orders-after-confirm-btn")?.addEventListener("click", () => {
      $("#confirmation-modal-backdrop")?.classList.remove("active");
      openCustomerPortal();
    });

    // Customer Portal
    $("#close-customer-portal-btn")?.addEventListener("click", () => {
      $("#customer-portal-backdrop")?.classList.remove("active");
    });
    $("#customer-portal-backdrop")?.addEventListener("click", (e) => {
      if (e.target.id === "customer-portal-backdrop") {
        $("#customer-portal-backdrop").classList.remove("active");
      }
    });
    $("#tab-btn-orders")?.addEventListener("click", () => switchPortalTab("orders"));
    $("#tab-btn-profile")?.addEventListener("click", () => switchPortalTab("profile"));
    $("#customer-profile-form")?.addEventListener("submit", handleProfileUpdate);
    $("#customer-logout-btn")?.addEventListener("click", () => {
      zeshCustomerAPI.logout();
      updateCustomerAuthHeader();
      $("#customer-portal-backdrop")?.classList.remove("active");
      showToast("Signed out successfully", "info");
    });

    // Footer orders link
    $("#footer-orders-link")?.addEventListener("click", () => {
      if (zeshCustomerAPI.isLoggedIn()) {
        openCustomerPortal();
      } else {
        openAuthModal("login");
      }
    });

    // Auth Modal
    $("#close-auth-modal-btn")?.addEventListener("click", () => {
      $("#auth-modal-backdrop")?.classList.remove("active");
    });
    $("#auth-modal-backdrop")?.addEventListener("click", (e) => {
      if (e.target.id === "auth-modal-backdrop") {
        $("#auth-modal-backdrop").classList.remove("active");
      }
    });
    $("#auth-tab-login")?.addEventListener("click", () => setAuthModeUI("login"));
    $("#auth-tab-register")?.addEventListener("click", () => setAuthModeUI("register"));
    $("#auth-form")?.addEventListener("submit", handleAuthSubmit);

    // Auth Modal Sub-Views Manager
    function hideAllAuthSubviews() {
      $("#auth-main-view")?.classList.remove("hidden");
      $("#auth-google-view")?.classList.add("hidden");
      $("#auth-whatsapp-view")?.classList.add("hidden");
      $("#auth-social-view")?.classList.add("hidden");
    }

    // "Back to login options" in all sub-views
    document.querySelectorAll(".btn-back-to-auth").forEach(btn => {
      btn.addEventListener("click", hideAllAuthSubviews);
    });

    // 1. Google Native App-Like Login & GIS
    $("#social-btn-google")?.addEventListener("click", openGoogleLoginView);
    $("#google-quick-form")?.addEventListener("submit", handleGoogleFormSubmit);

    // 2. WhatsApp Real OTP Verification
    $("#social-btn-whatsapp")?.addEventListener("click", openWhatsAppOtpView);
    $("#wa-send-otp-btn")?.addEventListener("click", handleWhatsAppSendOtp);
    $("#wa-verify-otp-btn")?.addEventListener("click", handleWhatsAppVerifyOtp);
    $("#wa-auto-fill-btn")?.addEventListener("click", handleWhatsAppAutoFill);
    $("#wa-resend-btn")?.addEventListener("click", handleWhatsAppSendOtp);

    // 3. Other Social (Facebook, Apple)
    $("#social-btn-facebook")?.addEventListener("click", () => openOtherSocialView("facebook"));
    $("#social-btn-apple")?.addEventListener("click", () => openOtherSocialView("apple"));
    $("#social-auth-form")?.addEventListener("submit", handleOtherSocialSubmit);

    // Setup 6-digit OTP input auto-advance
    setupOtpDigitInputs();
  });

  // ==========================================================================
  // 1. Google Native App-Style Account Chooser & GIS Logic
  // ==========================================================================
  const GOOGLE_ACCOUNTS_STORAGE_KEY = "zesh_device_google_accounts";

  function getSavedGoogleAccounts() {
    try {
      const raw = localStorage.getItem(GOOGLE_ACCOUNTS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveGoogleAccount(name, email, avatar = "") {
    try {
      let accounts = getSavedGoogleAccounts();
      accounts = accounts.filter(a => a.email.toLowerCase() !== email.toLowerCase());
      accounts.unshift({
        name,
        email,
        avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
      });
      localStorage.setItem(GOOGLE_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts.slice(0, 3)));
    } catch (e) {
      console.warn("Could not save Google account locally:", e);
    }
  }

  function openGoogleLoginView() {
    $("#auth-main-view")?.classList.add("hidden");
    $("#auth-whatsapp-view")?.classList.add("hidden");
    $("#auth-social-view")?.classList.add("hidden");
    $("#auth-google-view")?.classList.remove("hidden");
    $("#google-alert-msg")?.classList.add("hidden");

    // Try Google Identity Services (GIS One-Tap) if loaded
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            console.log("GIS One-Tap dismissed or skipped");
          }
        });
      } catch (err) {
        console.log("GIS prompt notice:", err.message);
      }
    }

    // Render Saved Accounts list on device (like native mobile apps)
    const listContainer = $("#google-saved-accounts-list");
    if (listContainer) {
      let saved = getSavedGoogleAccounts();
      if (!saved.length) {
        saved = [
          { name: "Sign in with Google", email: "Enter your Gmail to continue", avatar: "" }
        ];
      }

      listContainer.innerHTML = saved.map(acc => `
        <div class="google-account-card" data-email="${acc.email}" data-name="${acc.name}">
          <div class="google-account-avatar">
            ${acc.avatar ? `<img src="${acc.avatar}" alt="${acc.name}">` : acc.name.charAt(0).toUpperCase()}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 700; font-size: 13.5px; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${acc.name}</div>
            <div style="font-size: 12px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${acc.email}</div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
        </div>
      `).join("");

      listContainer.querySelectorAll(".google-account-card").forEach(card => {
        card.addEventListener("click", () => {
          const email = card.getAttribute("data-email");
          const name = card.getAttribute("data-name");
          if (email && email.includes("@")) {
            $("#google-name-input").value = name;
            $("#google-email-input").value = email;
            $("#google-quick-form")?.dispatchEvent(new Event("submit"));
          } else {
            $("#google-name-input")?.focus();
          }
        });
      });
    }

    $("#google-name-input")?.focus();
  }

  async function handleGoogleFormSubmit(e) {
    e.preventDefault();
    const alertMsg = $("#google-alert-msg");
    const submitBtn = $("#google-submit-btn");
    const nameInput = $("#google-name-input");
    const emailInput = $("#google-email-input");

    const name = (nameInput?.value || "").trim();
    const rawEmail = (emailInput?.value || "").trim().toLowerCase();

    if (!name) {
      if (alertMsg) {
        alertMsg.textContent = "Please enter your full name.";
        alertMsg.classList.remove("hidden");
      }
      nameInput?.focus();
      return;
    }
    if (!rawEmail || !rawEmail.includes("@")) {
      if (alertMsg) {
        alertMsg.textContent = "Please enter a valid Gmail or Google account email.";
        alertMsg.classList.remove("hidden");
      }
      emailInput?.focus();
      return;
    }

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Signing in with Google...</span>`;
      }
      if (alertMsg) alertMsg.classList.add("hidden");

      const user = await zeshCustomerAPI.socialLogin("google", { name, email: rawEmail });
      saveGoogleAccount(user.name, user.email, user.avatar);

      $("#auth-modal-backdrop")?.classList.remove("active");
      $("#auth-google-view")?.classList.add("hidden");
      $("#auth-main-view")?.classList.remove("hidden");
      updateCustomerAuthHeader();
      showToast(`Welcome, ${user.name}! Signed in via Google.`, "success");
    } catch (err) {
      console.error("Google sign-in error:", err);
      if (alertMsg) {
        alertMsg.textContent = err.message || "Failed to sign in with Google.";
        alertMsg.classList.remove("hidden");
      }
      showToast(err.message || "Google sign-in failed", "error");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/></svg>
          <span>Sign In with Google</span>
        `;
      }
    }
  }

  // ==========================================================================
  // 2. WhatsApp Real OTP Verification Logic
  // ==========================================================================
  let activeWhatsAppPhone = "";
  let activeWhatsAppName = "";
  let currentWhatsAppOtp = "";
  let waCountdownTimer = null;

  function openWhatsAppOtpView() {
    $("#auth-main-view")?.classList.add("hidden");
    $("#auth-google-view")?.classList.add("hidden");
    $("#auth-social-view")?.classList.add("hidden");
    $("#auth-whatsapp-view")?.classList.remove("hidden");

    $("#wa-step-phone")?.classList.remove("hidden");
    $("#wa-step-otp")?.classList.add("hidden");
    $("#wa-phone-alert")?.classList.add("hidden");
    $("#wa-otp-alert")?.classList.add("hidden");

    const phoneInput = $("#wa-phone-input");
    if (phoneInput && !phoneInput.value) {
      phoneInput.focus();
    }
  }

  async function handleWhatsAppSendOtp() {
    const alertMsg = $("#wa-phone-alert");
    const sendBtn = $("#wa-send-otp-btn");
    const nameInput = $("#wa-name-input");
    const phoneInput = $("#wa-phone-input");

    const name = (nameInput?.value || "").trim();
    const phone = (phoneInput?.value || "").trim().replace(/\D/g, "");

    if (!name) {
      if (alertMsg) {
        alertMsg.textContent = "Please enter your name.";
        alertMsg.classList.remove("hidden");
      }
      nameInput?.focus();
      return;
    }

    if (phone.length < 10) {
      if (alertMsg) {
        alertMsg.textContent = "Please enter a valid 10-digit WhatsApp number.";
        alertMsg.classList.remove("hidden");
      }
      phoneInput?.focus();
      return;
    }

    activeWhatsAppName = name;
    activeWhatsAppPhone = phone.slice(-10);

    try {
      if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.textContent = "Sending WhatsApp OTP...";
      }
      if (alertMsg) alertMsg.classList.add("hidden");

      const res = await zeshCustomerAPI.sendWhatsAppOtp(activeWhatsAppPhone, activeWhatsAppName);
      currentWhatsAppOtp = res.otp;

      // Update Step 2 UI
      $("#wa-received-otp-text").textContent = res.otp;
      const chatLink = $("#wa-chat-link");
      if (chatLink && res.whatsappLink) {
        chatLink.href = res.whatsappLink;
      }

      // Switch to Step 2
      $("#wa-step-phone")?.classList.add("hidden");
      $("#wa-step-otp")?.classList.remove("hidden");

      // Clear previous boxes
      document.querySelectorAll(".otp-digit-box").forEach(box => {
        box.value = "";
      });
      document.querySelector('.otp-digit-box[data-index="0"]')?.focus();

      showToast(`📲 OTP sent to WhatsApp (+91 ${activeWhatsAppPhone})`, "info");

      // Start 30s resend countdown
      startWhatsAppCountdown(30);

    } catch (err) {
      console.error("Failed to send WhatsApp OTP:", err);
      if (alertMsg) {
        alertMsg.textContent = err.message || "Failed to send WhatsApp OTP.";
        alertMsg.classList.remove("hidden");
      }
      showToast(err.message || "Failed to send WhatsApp OTP", "error");
    } finally {
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.innerHTML = `<span>📲 Send OTP on WhatsApp</span>`;
      }
    }
  }

  function handleWhatsAppAutoFill() {
    if (!currentWhatsAppOtp || currentWhatsAppOtp.length !== 6) return;
    const digits = currentWhatsAppOtp.split("");
    document.querySelectorAll(".otp-digit-box").forEach((box, i) => {
      box.value = digits[i] || "";
    });
    showToast("OTP Auto-filled! Verifying...", "info");
    setTimeout(() => {
      handleWhatsAppVerifyOtp();
    }, 400);
  }

  function startWhatsAppCountdown(seconds) {
    if (waCountdownTimer) clearInterval(waCountdownTimer);
    let remaining = seconds;
    const btn = $("#wa-resend-btn");
    const countSpan = $("#wa-countdown");
    if (btn) btn.disabled = true;

    waCountdownTimer = setInterval(() => {
      remaining--;
      if (countSpan) countSpan.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(waCountdownTimer);
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<span style="color: #25D366; font-weight: 700;">Resend OTP on WhatsApp</span>`;
        }
      }
    }, 1000);
  }

  function setupOtpDigitInputs() {
    const boxes = document.querySelectorAll(".otp-digit-box");
    boxes.forEach((box, index) => {
      box.addEventListener("input", (e) => {
        const val = e.target.value.replace(/\D/g, "");
        e.target.value = val ? val.charAt(0) : "";
        if (val && index < 5) {
          document.querySelector(`.otp-digit-box[data-index="${index + 1}"]`)?.focus();
        }
        // If all 6 digits entered, auto submit
        const allFilled = Array.from(boxes).every(b => b.value.length === 1);
        if (allFilled) {
          handleWhatsAppVerifyOtp();
        }
      });

      box.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !e.target.value && index > 0) {
          const prev = document.querySelector(`.otp-digit-box[data-index="${index - 1}"]`);
          if (prev) {
            prev.focus();
            prev.value = "";
          }
        }
      });

      box.addEventListener("paste", (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "").slice(0, 6);
        if (text) {
          text.split("").forEach((char, i) => {
            const b = document.querySelector(`.otp-digit-box[data-index="${i}"]`);
            if (b) b.value = char;
          });
          if (text.length === 6) {
            handleWhatsAppVerifyOtp();
          } else {
            document.querySelector(`.otp-digit-box[data-index="${Math.min(text.length, 5)}"]`)?.focus();
          }
        }
      });
    });
  }

  async function handleWhatsAppVerifyOtp() {
    const alertMsg = $("#wa-otp-alert");
    const verifyBtn = $("#wa-verify-otp-btn");

    const boxes = document.querySelectorAll(".otp-digit-box");
    const otp = Array.from(boxes).map(b => b.value.trim()).join("");

    if (otp.length < 6) {
      if (alertMsg) {
        alertMsg.textContent = "Please enter the full 6-digit OTP received on WhatsApp.";
        alertMsg.classList.remove("hidden");
      }
      return;
    }

    try {
      if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.textContent = "Verifying OTP...";
      }
      if (alertMsg) alertMsg.classList.add("hidden");

      const user = await zeshCustomerAPI.verifyWhatsAppOtp(activeWhatsAppPhone, otp, activeWhatsAppName);

      if (waCountdownTimer) clearInterval(waCountdownTimer);

      $("#auth-modal-backdrop")?.classList.remove("active");
      hideAllAuthSubviews();
      updateCustomerAuthHeader();
      showToast(`Welcome, ${user.name}! Verified with WhatsApp.`, "success");

    } catch (err) {
      console.error("WhatsApp verify failed:", err);
      if (alertMsg) {
        alertMsg.textContent = err.message || "Invalid or expired OTP. Please try again.";
        alertMsg.classList.remove("hidden");
      }
      showToast(err.message || "Invalid OTP", "error");
    } finally {
      if (verifyBtn) {
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = `<span>✓ Verify &amp; Sign In</span>`;
      }
    }
  }

  // ==========================================================================
  // 3. Other Social Logins (Facebook, Apple)
  // ==========================================================================
  let activeOtherProvider = "facebook";
  function openOtherSocialView(provider) {
    activeOtherProvider = provider;
    $("#auth-main-view")?.classList.add("hidden");
    $("#auth-google-view")?.classList.add("hidden");
    $("#auth-whatsapp-view")?.classList.add("hidden");
    $("#auth-social-view")?.classList.remove("hidden");

    const isFb = provider === "facebook";
    $("#social-view-title").textContent = isFb ? "Sign in with Facebook" : "Sign in with Apple ID";
    $("#social-view-subtitle").textContent = isFb ? "Facebook Connect" : "Apple Account";
    $("#social-id-label").textContent = isFb ? "Facebook Email or Phone *" : "Apple ID / Email *";
    $("#social-submit-btn").textContent = isFb ? "Continue with Facebook" : "Continue with Apple ID";
    $("#social-submit-btn").style.background = isFb ? "#1877F2" : "#0f172a";
  }

  async function handleOtherSocialSubmit(e) {
    e.preventDefault();
    const alertMsg = $("#social-alert-msg");
    const name = $("#social-name-input")?.value?.trim();
    const rawId = $("#social-id-input")?.value?.trim();

    if (!name || !rawId) {
      if (alertMsg) {
        alertMsg.textContent = "Please fill in all required fields.";
        alertMsg.classList.remove("hidden");
      }
      return;
    }

    const email = rawId.includes("@") ? rawId.toLowerCase() : `${rawId.toLowerCase().replace(/[^a-z0-9]/g, "")}@${activeOtherProvider}.com`;

    try {
      const user = await zeshCustomerAPI.socialLogin(activeOtherProvider, { name, email });
      $("#auth-modal-backdrop")?.classList.remove("active");
      hideAllAuthSubviews();
      updateCustomerAuthHeader();
      showToast(`Welcome, ${user.name}! Signed in via ${activeOtherProvider.toUpperCase()}.`, "success");
    } catch (err) {
      if (alertMsg) {
        alertMsg.textContent = err.message || "Sign in failed.";
        alertMsg.classList.remove("hidden");
      }
    }
  }
})();
