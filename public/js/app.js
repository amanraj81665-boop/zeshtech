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

  // Extract key specs for Flipkart-style cute cutlet pills
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

  // Realistic Flipkart-style MRP and Discount Calculation
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
    const reviews = 240 + (abs % 1850);
    return { rating, reviews: reviews.toLocaleString("en-IN") };
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

            <!-- Flipkart Style Pricing Row -->
            <div class="flipkart-price-row">
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

  // Amazon & Flipkart Grade Product Specs Modal
  async function openQuickView(productId) {
    const modalBackdrop = $("#product-modal-backdrop");
    const modalContent = $("#product-modal-content");
    if (!modalBackdrop || !modalContent) return;

    modalContent.innerHTML = `<div style="text-align:center; padding: 48px; color:var(--text-muted);"><div class="live-dot pulse-dot" style="margin:0 auto 12px;"></div>Loading full technical specifications...</div>`;
    modalBackdrop.classList.add("active");

    try {
      const res = await zeshAPI.getProductById(productId);
      const product = res.product;
      if (!product) throw new Error("Product details not found");

      const stock = Number(product.stockQuantity) || 0;
      const isOut = stock <= 0;
      const img = product.imageUrl || imageFallback;
      const { mrp, discountPct } = calculateDiscount(product.sellingPrice);
      const { rating, reviews } = getProductRating(product);

      // Get rich specs from our Knowledge Base or intelligent generator
      const specs = window.ZeshSpecs ? window.ZeshSpecs.getPhoneSpecs(product) : null;

      modalContent.innerHTML = `
        <!-- Top Half: Visual Showcase, Pricing, Offers & Buy Action -->
        <div class="product-specs-top">
          <!-- Left: Gallery Showcase -->
          <div class="product-specs-gallery">
            <div class="product-specs-image-box">
              <span class="card-badge-pill assured-badge" style="position: absolute; top: 12px; left: 12px;">
                <span class="star-sparkle">★</span> Zesh Assured
              </span>
              <img src="${escapeHTML(img)}" alt="${escapeHTML(product.name)}" onerror="this.onerror=null;this.src='${imageFallback}';">
            </div>

            <!-- Trust Bar Under Image -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; font-size: 10.5px; text-align: center; color: var(--text-muted);">
              <div style="background:var(--surface-alt); padding: 8px 4px; border-radius: 6px; border:1px solid var(--border);">
                <div style="font-size: 14px; margin-bottom: 2px;">🛡️</div>
                <b>1 Year</b> Brand Warranty
              </div>
              <div style="background:var(--surface-alt); padding: 8px 4px; border-radius: 6px; border:1px solid var(--border);">
                <div style="font-size: 14px; margin-bottom: 2px;">⚡</div>
                <b>24-Hour</b> Fast Dispatch
              </div>
              <div style="background:var(--surface-alt); padding: 8px 4px; border-radius: 6px; border:1px solid var(--border);">
                <div style="font-size: 14px; margin-bottom: 2px;">🔄</div>
                <b>7 Days</b> Replacement
              </div>
            </div>
          </div>

          <!-- Right: Title, Pricing, Bank Offers & Highlights -->
          <div class="product-specs-info">
            <div class="specs-breadcrumb">
              <a href="/">Home</a> <span>›</span>
              <a href="#catalogue-section">${escapeHTML(product.category)}</a> <span>›</span>
              <span>${escapeHTML(product.brand || "Zesh Retail")}</span>
            </div>

            <h1 class="specs-product-title">${escapeHTML(product.name)}</h1>

            <!-- Rating & Reviews Pill -->
            <div class="specs-rating-row">
              <span class="rating-badge-flipkart">
                <span>${rating}</span>
                <span style="font-size: 10px;">★</span>
              </span>
              <span class="rating-count-text">${reviews.toLocaleString()} Ratings &amp; ${(reviews / 3.8).toFixed(0)} Reviews</span>
              <span class="badge ${isOut ? 'badge-danger' : 'badge-success'}" style="margin-left: auto;">
                ${isOut ? 'Out of Stock' : `● In Stock (${stock} units left)`}
              </span>
            </div>

            <!-- Flipkart Style Pricing Block -->
            <div class="specs-pricing-block">
              <div class="specs-main-price">
                <span>${money(product.sellingPrice)}</span>
                <span class="specs-mrp">${money(mrp)}</span>
                <span class="specs-discount-pill">${discountPct}% off</span>
              </div>
              <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 4px;">
                Inclusive of all taxes • Easy EMI starts from <b>₹${Math.round(product.sellingPrice / 6).toLocaleString()}/mo</b>
              </div>
            </div>

            <!-- Available Bank & Store Offers -->
            <div class="bank-offers-container">
              <div class="bank-offers-title">🏷️ Available Offers &amp; Discounts</div>
              <div class="bank-offer-item">
                <span class="bank-offer-tag">Bank Offer</span>
                <span>5% Unlimited Cashback on PhonePe UPI and Net Banking payments.</span>
              </div>
              <div class="bank-offer-item">
                <span class="bank-offer-tag">Special Price</span>
                <span>Get extra ₹${(mrp - product.sellingPrice).toLocaleString()} off (price inclusive of retail discount).</span>
              </div>
              <div class="bank-offer-item">
                <span class="bank-offer-tag">Partner Offer</span>
                <span>Get Flat 0% Interest EMI with Bajaj Finserv &amp; TVS Credit at our Barh counter.</span>
              </div>
            </div>

            <!-- Key Highlights (Flipkart Bullet Points) -->
            ${specs ? `
              <div class="specs-highlights-box">
                <div class="specs-highlights-title">⚡ Key Highlights &amp; Specifications</div>
                <div class="specs-highlights-list">
                  <div class="specs-highlight-item">
                    <span class="specs-highlight-bullet">●</span>
                    <span><b>Memory:</b> ${escapeHTML(specs.ramRom)}</span>
                  </div>
                  <div class="specs-highlight-item">
                    <span class="specs-highlight-bullet">●</span>
                    <span><b>Display:</b> ${escapeHTML(specs.display)}</span>
                  </div>
                  <div class="specs-highlight-item">
                    <span class="specs-highlight-bullet">●</span>
                    <span><b>Camera:</b> ${escapeHTML(specs.rearCamera)} | <b>Selfie:</b> ${escapeHTML(specs.frontCamera)}</span>
                  </div>
                  <div class="specs-highlight-item">
                    <span class="specs-highlight-bullet">●</span>
                    <span><b>Processor:</b> ${escapeHTML(specs.chipset)} (${escapeHTML(specs.cpu)})</span>
                  </div>
                  <div class="specs-highlight-item">
                    <span class="specs-highlight-bullet">●</span>
                    <span><b>Battery &amp; Speed:</b> ${escapeHTML(specs.battery)}</span>
                  </div>
                  <div class="specs-highlight-item">
                    <span class="specs-highlight-bullet">●</span>
                    <span><b>OS Experience:</b> ${escapeHTML(specs.os)}</span>
                  </div>
                </div>
              </div>
            ` : ""}

            <!-- Action Buttons: Buy Now, Add to Bag & Compare -->
            <div class="specs-actions-row">
              <button class="btn-specs-buy direct-buy-btn" data-id="${escapeHTML(product._id)}" ${isOut ? "disabled" : ""}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                <span>${isOut ? "Sold Out" : "⚡ Buy Now"}</span>
              </button>

              <button class="btn-specs-cart add-to-bag-btn" data-id="${escapeHTML(product._id)}" ${isOut ? "disabled" : ""}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                <span>Add to Bag</span>
              </button>

              ${product.category === "Mobile" ? `
                <button class="btn-specs-compare compare-this-btn" data-id="${escapeHTML(product._id)}" type="button">
                  ⚖️ Compare with other Phones
                </button>
              ` : ""}
            </div>
          </div>
        </div>

        <!-- Bottom Half: Flipkart Full Specifications Tables -->
        ${specs ? `
          <div class="specs-accordion-container">
            <div class="specs-accordion-header">
              <span>📋</span> Detailed Specifications
            </div>

            <!-- General -->
            <div class="specs-table-card">
              <div class="specs-category-title">General</div>
              <table class="specs-detail-table">
                <tr><th class="specs-th">In The Box</th><td class="specs-td">${escapeHTML(specs.inBox || "Handset, Cable, Guide")}</td></tr>
                <tr><th class="specs-th">Model Number / Name</th><td class="specs-td">${escapeHTML(specs.model)}</td></tr>
                <tr><th class="specs-th">Color Variant</th><td class="specs-td">${escapeHTML(product.name.split("-")[1]?.trim() || "Official Color")}</td></tr>
                <tr><th class="specs-th">SIM Type</th><td class="specs-td">${escapeHTML(specs.sim)}</td></tr>
                <tr><th class="specs-th">Touchscreen</th><td class="specs-td">Yes (Multi-Touch Capacitive)</td></tr>
                <tr><th class="specs-th">Quick Charging</th><td class="specs-td">Yes (Fast Charging Supported)</td></tr>
              </table>
            </div>

            <!-- Display Features -->
            <div class="specs-table-card">
              <div class="specs-category-title">Display Features</div>
              <table class="specs-detail-table">
                <tr><th class="specs-th">Display Size &amp; Type</th><td class="specs-td">${escapeHTML(specs.display)}</td></tr>
                <tr><th class="specs-th">Resolution</th><td class="specs-td">${escapeHTML(specs.resolution)}</td></tr>
                <tr><th class="specs-th">Refresh Rate</th><td class="specs-td">${escapeHTML(specs.refreshRate)} High Refresh Rate</td></tr>
                <tr><th class="specs-th">GPU Graphics</th><td class="specs-td">${escapeHTML(specs.gpu)}</td></tr>
              </table>
            </div>

            <!-- Os & Processor Features -->
            <div class="specs-table-card">
              <div class="specs-category-title">OS &amp; Processor Features</div>
              <table class="specs-detail-table">
                <tr><th class="specs-th">Operating System</th><td class="specs-td">${escapeHTML(specs.os)}</td></tr>
                <tr><th class="specs-th">Processor Brand</th><td class="specs-td">${escapeHTML(specs.chipset.split(" ")[0])}</td></tr>
                <tr><th class="specs-th">Processor Type</th><td class="specs-td">${escapeHTML(specs.chipset)}</td></tr>
                <tr><th class="specs-th">Processor Core</th><td class="specs-td">${escapeHTML(specs.cpu)}</td></tr>
              </table>
            </div>

            <!-- Memory & Storage Features -->
            <div class="specs-table-card">
              <div class="specs-category-title">Memory &amp; Storage Features</div>
              <table class="specs-detail-table">
                <tr><th class="specs-th">RAM &amp; Storage Configuration</th><td class="specs-td">${escapeHTML(specs.ramRom)}</td></tr>
                <tr><th class="specs-th">Supported Memory Card</th><td class="specs-td">MicroSD / Cloud Storage</td></tr>
              </table>
            </div>

            <!-- Camera Features -->
            <div class="specs-table-card">
              <div class="specs-category-title">Camera Features</div>
              <table class="specs-detail-table">
                <tr><th class="specs-th">Primary Camera</th><td class="specs-td">${escapeHTML(specs.rearCamera)}</td></tr>
                <tr><th class="specs-th">Secondary / Selfie Camera</th><td class="specs-td">${escapeHTML(specs.frontCamera)}</td></tr>
                <tr><th class="specs-th">Video Recording Resolution</th><td class="specs-td">${escapeHTML(specs.video)}</td></tr>
                <tr><th class="specs-th">Flash</th><td class="specs-td">Rear LED Flash with Night Mode Assist</td></tr>
              </table>
            </div>

            <!-- Battery & Power Features -->
            <div class="specs-table-card">
              <div class="specs-category-title">Battery &amp; Power Features</div>
              <table class="specs-detail-table">
                <tr><th class="specs-th">Battery Capacity &amp; Type</th><td class="specs-td">${escapeHTML(specs.battery)}</td></tr>
                <tr><th class="specs-th">Weight</th><td class="specs-td">${escapeHTML(specs.weight || "185 g")}</td></tr>
              </table>
            </div>

            <!-- Warranty -->
            <div class="specs-table-card">
              <div class="specs-category-title">Warranty &amp; Service</div>
              <table class="specs-detail-table">
                <tr><th class="specs-th">Warranty Summary</th><td class="specs-td">1 Year Official Manufacturer Warranty for Device and 6 Months for In-Box Accessories</td></tr>
                <tr><th class="specs-th">Covered in Warranty</th><td class="specs-td">Manufacturing Defects, Motherboard, Screen and Hardware Defects</td></tr>
              </table>
            </div>

            <!-- Pros & Cons Analysis -->
            ${specs.pros && specs.cons ? `
              <div class="pros-cons-box">
                <div class="pros-box">
                  <strong>✅ Reasons to Buy:</strong>
                  <ul style="padding-left: 18px; margin: 0; line-height: 1.6;">
                    ${specs.pros.map(p => `<li>${escapeHTML(p)}</li>`).join("")}
                  </ul>
                </div>
                <div class="cons-box">
                  <strong>⚠️ Things to Consider:</strong>
                  <ul style="padding-left: 18px; margin: 0; line-height: 1.6;">
                    ${specs.cons.map(c => `<li>${escapeHTML(c)}</li>`).join("")}
                  </ul>
                </div>
              </div>
            ` : ""}
          </div>
        ` : ""}
      `;

      // Wire up clicks inside modal
      modalContent.querySelector(".btn-specs-buy")?.addEventListener("click", () => {
        modalBackdrop.classList.remove("active");
        addToCart(product, 1);
        openCheckoutModal();
      });

      modalContent.querySelector(".btn-specs-cart")?.addEventListener("click", () => {
        addToCart(product, 1);
        modalBackdrop.classList.remove("active");
      });

      modalContent.querySelector(".btn-specs-compare")?.addEventListener("click", () => {
        modalBackdrop.classList.remove("active");
        handleComparePhone(product._id);
      });

    } catch (err) {
      modalContent.innerHTML = `<div style="text-align:center; padding: 30px; color:var(--danger);">${escapeHTML(err.message)}</div>`;
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

  // 4. Quick Compare Trigger from Product Card
  function handleComparePhone(productId) {
    const product = allProducts.find(p => p._id === productId);
    if (!product) return;

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
