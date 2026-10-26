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
  let searchKeyword = "";
  let inStockOnly = false;
  let sortBy = "newest";
  let authMode = "login"; // 'login' or 'register'

  // Load cart from localStorage
  try {
    const saved = localStorage.getItem("zesh_customer_cart");
    if (saved) cart = JSON.parse(saved);
  } catch (e) {
    cart = [];
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

  function applyFiltersAndRender() {
    const container = $("#products-container");
    const noProductsView = $("#no-products-view");
    if (!container) return;

    let filtered = [...allProducts];

    // Search filter
    if (searchKeyword) {
      const q = searchKeyword.toLowerCase();
      filtered = filtered.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.model && p.model.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
      );
    }

    // In stock only filter
    if (inStockOnly) {
      filtered = filtered.filter(p => (p.stockQuantity || 0) > 0);
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
      const isLow = !isOut && stock <= (product.lowStockThreshold || 5);

      let badgeHtml = "";
      if (isOut) {
        badgeHtml = `<span class="badge badge-danger card-tag">Out of Stock</span>`;
      } else if (isLow) {
        badgeHtml = `<span class="badge badge-warning card-tag">Low Stock (${stock} left)</span>`;
      } else {
        badgeHtml = `<span class="badge badge-success card-tag">In Stock</span>`;
      }

      const img = product.imageUrl || imageFallback;

      return `
        <article class="product-card" data-product-id="${escapeHTML(product._id)}">
          <div class="product-thumbnail-box">
            ${badgeHtml}
            <img src="${escapeHTML(img)}" alt="${escapeHTML(product.name)}" loading="lazy" onerror="this.onerror=null;this.src='${imageFallback}';">
          </div>

          <div class="product-content">
            <div class="product-meta">
              <span class="product-category-text">${escapeHTML(product.category)}</span>
              ${product.brand ? `<span style="font-size:11px; color:var(--text-muted); font-weight:600;">${escapeHTML(product.brand)}</span>` : ""}
            </div>

            <h3 class="product-title" title="${escapeHTML(product.name)}">${escapeHTML(product.name)}</h3>

            ${product.model ? `<div class="product-brand-line">Model: ${escapeHTML(product.model)}</div>` : `<div class="product-brand-line">Genuine Brand Product</div>`}

            <div class="product-footer">
              <div class="price-block">
                <span class="price-amount">${money(product.sellingPrice)}</span>
                <span class="price-sub">GST Inclusive</span>
              </div>

              <div style="display:flex; gap:6px;">
                <button class="btn btn-secondary btn-small view-details-btn" data-id="${escapeHTML(product._id)}" title="Quick View">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
                <button class="btn btn-primary btn-small add-to-bag-btn" data-id="${escapeHTML(product._id)}" ${isOut ? "disabled" : ""}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                  <span>${isOut ? "Sold Out" : "Add"}</span>
                </button>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  // Quick View Modal
  async function openQuickView(productId) {
    const modalBackdrop = $("#product-modal-backdrop");
    const modalContent = $("#product-modal-content");
    if (!modalBackdrop || !modalContent) return;

    modalContent.innerHTML = `<div style="text-align:center; padding: 40px; color:var(--text-muted);">Loading details...</div>`;
    modalBackdrop.classList.add("active");

    try {
      const res = await zeshAPI.getProductById(productId);
      const product = res.product;
      if (!product) throw new Error("Product details not found");

      const stock = Number(product.stockQuantity) || 0;
      const isOut = stock <= 0;
      const img = product.imageUrl || imageFallback;

      modalContent.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 28px; align-items: start;">
          <div style="background: var(--surface-alt); border-radius: var(--radius-lg); padding: 20px; display:flex; align-items:center; justify-content:center; max-height:360px;">
            <img src="${escapeHTML(img)}" alt="${escapeHTML(product.name)}" style="max-height: 320px; object-fit: contain;">
          </div>

          <div>
            <div style="display: flex; gap: 8px; margin-bottom: 10px;">
              <span class="badge badge-info">${escapeHTML(product.category)}</span>
              ${isOut ? `<span class="badge badge-danger">Out of Stock</span>` : `<span class="badge badge-success">In Stock (${stock} units)</span>`}
            </div>

            <h2 style="font-size: 22px; margin-bottom: 8px; line-height: 1.3;">${escapeHTML(product.name)}</h2>

            <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">
              ${product.brand ? `Brand: <b>${escapeHTML(product.brand)}</b> &nbsp;•&nbsp; ` : ""}
              ${product.model ? `Model: <b>${escapeHTML(product.model)}</b>` : ""}
            </div>

            <div style="font-size: 26px; font-weight: 800; color: var(--primary); font-family: var(--font-heading); margin-bottom: 18px;">
              ${money(product.sellingPrice)}
              <small style="font-size: 12px; font-weight: 500; color: var(--text-muted);">MRP (All Taxes Included)</small>
            </div>

            ${product.description ? `<p style="font-size: 13px; line-height: 1.6; color: var(--text-body); margin-bottom: 20px;">${escapeHTML(product.description)}</p>` : ""}

            <div style="background: var(--surface-alt); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 14px; margin-bottom: 24px; font-size: 12px; display: grid; gap: 6px;">
              <div>🛡️ <b>Warranty:</b> 1 Year Official Replacement / Service Warranty</div>
              <div>⚡ <b>Delivery:</b> Dispatches within 24 Hours via Express Air</div>
              <div>💰 <b>Payment:</b> Cash on Delivery available at checkout</div>
            </div>

            <div style="display: flex; align-items: center; gap: 14px;">
              <div class="quantity-stepper">
                <button type="button" id="modal-qty-minus">-</button>
                <span id="modal-qty-val">1</span>
                <button type="button" id="modal-qty-plus">+</button>
              </div>

              <button class="btn btn-primary btn-large" style="flex:1;" id="modal-add-cart-btn" ${isOut ? "disabled" : ""}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                <span>${isOut ? "Out of Stock" : "Add to Bag"}</span>
              </button>
            </div>
          </div>
        </div>
      `;

      let selectedQty = 1;
      const minusBtn = $("#modal-qty-minus");
      const plusBtn = $("#modal-qty-plus");
      const qtyVal = $("#modal-qty-val");
      const addBtn = $("#modal-add-cart-btn");

      minusBtn?.addEventListener("click", () => {
        if (selectedQty > 1) {
          selectedQty--;
          qtyVal.textContent = selectedQty;
        }
      });

      plusBtn?.addEventListener("click", () => {
        if (selectedQty < stock) {
          selectedQty++;
          qtyVal.textContent = selectedQty;
        } else {
          showToast(`Maximum available stock is ${stock}`, "warning");
        }
      });

      addBtn?.addEventListener("click", () => {
        addToCart(product, selectedQty);
        modalBackdrop.classList.remove("active");
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
      searchKeyword = "";
      inStockOnly = false;
      sortBy = "newest";

      if (searchInput) searchInput.value = "";
      const inStockCheck = $("#in-stock-only-checkbox");
      if (inStockCheck) inStockCheck.checked = false;

      $$("#category-chips .category-chip").forEach(c => c.classList.toggle("active", c.dataset.category === "All"));
      fetchCatalogue();
    });

    // Product Card Clicks: Quick View and Add to Bag
    $("#products-container")?.addEventListener("click", (e) => {
      const viewBtn = e.target.closest(".view-details-btn");
      if (viewBtn) {
        openQuickView(viewBtn.dataset.id);
        return;
      }

      const addBtn = e.target.closest(".add-to-bag-btn");
      if (addBtn) {
        const product = allProducts.find(p => p._id === addBtn.dataset.id);
        if (product) addToCart(product, 1);
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
