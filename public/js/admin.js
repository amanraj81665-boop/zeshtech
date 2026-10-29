"use strict";

/* ==========================================================================
   ZESH-TECH — Executive Owner Dashboard & POS Billing Terminal
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

  function numberToIndianWords(number) {
    const n = Math.round(Number(number) || 0);
    if (n === 0) return "Zero Rupees Only";
    const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    function inWords(num) {
      if (num === 0) return "";
      if (num < 20) return a[num] + " ";
      if (num < 100) return b[Math.floor(num / 10)] + (num % 10 !== 0 ? " " + a[num % 10] : "") + " ";
      if (num < 1000) return inWords(Math.floor(num / 100)) + "Hundred " + (num % 100 !== 0 ? inWords(num % 100) : "");
      if (num < 100000) return inWords(Math.floor(num / 1000)) + "Thousand " + (num % 1000 !== 0 ? inWords(num % 1000) : "");
      if (num < 10000000) return inWords(Math.floor(num / 100000)) + "Lakh " + (num % 100000 !== 0 ? inWords(num % 100000) : "");
      return inWords(Math.floor(num / 10000000)) + "Crore " + (num % 10000000 !== 0 ? inWords(num % 10000000) : "");
    }

    return inWords(n).trim() + " Only";
  }

  const imageFallback = "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80";

  // Application State
  let currentTab = "overview";
  let inventoryList = [];
  let posProducts = [];
  let posCart = [];
  let posCategory = "All";
  let recentCustomersList = [];
  let heldTickets = [];
  let activeBillForPrint = null;
  let printFormat = "a4"; // 'a4' or 'thermal'
  let currentStockFilter = "all";

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

  /* ==========================================================================
     Authentication Check & Login Gate
     ========================================================================== */

  async function checkAdminAuth() {
    const loginScreen = $("#admin-login-screen");
    const appShell = $("#admin-app-shell");

    if (zeshAPI.token) {
      try {
        const user = zeshAPI.getUser();
        if (user) {
          $("#admin-user-name").textContent = user.name || "Admin";
          $("#admin-user-email").textContent = user.email || "";
        }
        loginScreen?.classList.add("hidden");
        appShell?.classList.remove("hidden");
        loadOverview();
        loadRecentCustomers();
      } catch (e) {
        showLoginScreen();
      }
    } else {
      showLoginScreen();
    }
  }

  function showLoginScreen() {
    $("#admin-login-screen")?.classList.remove("hidden");
    $("#admin-app-shell")?.classList.add("hidden");
  }

  async function handleAdminLogin(e) {
    e.preventDefault();
    const email = $("#admin-email").value.trim();
    const password = $("#admin-password").value;
    const remember = $("#admin-remember").checked;
    const btn = $("#admin-login-btn");
    const errBox = $("#admin-login-error");

    try {
      btn.disabled = true;
      btn.textContent = "Authenticating...";
      if (errBox) errBox.classList.add("hidden");

      const user = await zeshAPI.login(email, password, remember);
      showToast(`Welcome back, ${user.name}!`, "success");

      $("#admin-user-name").textContent = user.name || "Admin";
      $("#admin-user-email").textContent = user.email || "";

      $("#admin-login-screen")?.classList.add("hidden");
      $("#admin-app-shell")?.classList.remove("hidden");

      loadOverview();
      loadRecentCustomers();
    } catch (err) {
      console.error("Admin login failed:", err);
      if (errBox) {
        errBox.textContent = err.message || "Invalid email or admin password.";
        errBox.classList.remove("hidden");
      }
      showToast(err.message || "Authentication failed", "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = `
        <span>Authenticate &amp; Launch Console</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
      `;
    }
  }

  function handleAdminLogout() {
    zeshAPI.logout();
    showToast("Admin session ended", "info");
    showLoginScreen();
  }

  /* ==========================================================================
     Forgot Password Handlers
     ========================================================================== */
  let forgotPasswordEmail = "";

  function setupForgotPassword() {
    const openBtn = $("#open-admin-forgot-btn");
    const closeBtn = $("#close-admin-forgot-btn");
    const loginForm = $("#admin-login-form");
    const forgotCard = $("#admin-forgot-card");
    const step1Form = $("#admin-forgot-step1-form");
    const step2Form = $("#admin-forgot-step2-form");

    openBtn?.addEventListener("click", () => {
      loginForm?.classList.add("hidden");
      forgotCard?.classList.remove("hidden");
      step1Form?.classList.remove("hidden");
      step2Form?.classList.add("hidden");
      $("#forgot-step1-error")?.classList.add("hidden");
      $("#forgot-step2-error")?.classList.add("hidden");
      $("#forgot-step2-success")?.classList.add("hidden");
    });

    closeBtn?.addEventListener("click", () => {
      forgotCard?.classList.add("hidden");
      loginForm?.classList.remove("hidden");
    });

    // Step 1: Send OTP
    step1Form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = $("#forgot-admin-email").value.trim();
      const btn = $("#forgot-send-otp-btn");
      const errBox = $("#forgot-step1-error");

      if (!email) return;

      try {
        btn.disabled = true;
        btn.textContent = "Sending OTP...";
        errBox?.classList.add("hidden");

        const res = await zeshAPI.sendForgotPasswordOtp(email);
        forgotPasswordEmail = email;

        showToast("Password reset OTP generated!", "success");

        // Display OTP on screen & wire WhatsApp link
        if ($("#forgot-otp-display")) {
          $("#forgot-otp-display").textContent = res.otp || "Sent via WhatsApp";
        }
        if ($("#forgot-whatsapp-link") && res.whatsappLink) {
          $("#forgot-whatsapp-link").href = res.whatsappLink;
        }

        step1Form.classList.add("hidden");
        step2Form.classList.remove("hidden");
      } catch (err) {
        console.error("Forgot password OTP error:", err);
        if (errBox) {
          errBox.textContent = err.message || "Could not generate OTP. Check your email.";
          errBox.classList.remove("hidden");
        }
        showToast(err.message || "Failed to send OTP", "error");
      } finally {
        btn.disabled = false;
        btn.innerHTML = `
          <span>Send Verification OTP</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        `;
      }
    });

    // Step 2: Reset Password
    step2Form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const otp = $("#forgot-otp-input").value.trim();
      const newPass = $("#forgot-new-password").value;
      const confirmPass = $("#forgot-confirm-password").value;
      const btn = $("#forgot-submit-btn");
      const errBox = $("#forgot-step2-error");
      const successBox = $("#forgot-step2-success");

      errBox?.classList.add("hidden");
      successBox?.classList.add("hidden");

      if (newPass !== confirmPass) {
        if (errBox) {
          errBox.textContent = "Passwords do not match. Please re-enter.";
          errBox.classList.remove("hidden");
        }
        return;
      }

      if (newPass.length < 8) {
        if (errBox) {
          errBox.textContent = "Password must be at least 8 characters.";
          errBox.classList.remove("hidden");
        }
        return;
      }

      try {
        btn.disabled = true;
        btn.textContent = "Updating Password...";

        const res = await zeshAPI.resetPasswordWithOtp(forgotPasswordEmail, otp, newPass);
        showToast("Password reset successful!", "success");

        if (successBox) {
          successBox.textContent = res.message || "Password updated! Redirecting to login...";
          successBox.classList.remove("hidden");
        }

        setTimeout(() => {
          $("#admin-password").value = newPass;
          $("#admin-email").value = forgotPasswordEmail;
          forgotCard.classList.add("hidden");
          loginForm.classList.remove("hidden");
        }, 1500);
      } catch (err) {
        console.error("Reset password error:", err);
        if (errBox) {
          errBox.textContent = err.message || "Failed to reset password. Please check your OTP.";
          errBox.classList.remove("hidden");
        }
        showToast(err.message || "Failed to reset password", "error");
      } finally {
        btn.disabled = false;
        btn.textContent = "Update Password & Log In";
      }
    });
  }

  /* ==========================================================================
     Tab Navigation & Mobile Drawer
     ========================================================================== */

  function openMobileDrawer() {
    $(".admin-sidebar")?.classList.add("open");
    $("#admin-sidebar-overlay")?.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeMobileDrawer() {
    $(".admin-sidebar")?.classList.remove("open");
    $("#admin-sidebar-overlay")?.classList.remove("active");
    document.body.style.overflow = "";
  }

  function switchTab(tabName) {
    currentTab = tabName;

    // Update active nav button (desktop sidebar)
    $$(".admin-nav-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });

    // Update active nav button (mobile bottom bar)
    $$(".admin-bottom-btn[data-tab]").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });

    // Close mobile drawer if it was open
    closeMobileDrawer();

    // Hide all view sections
    const views = ["overview", "pos", "inventory", "orders", "bills", "users"];
    views.forEach(v => {
      const el = $(`#view-${v}`);
      if (el) el.classList.toggle("hidden", v !== tabName);
    });

    // Update page title
    const titles = {
      overview: "Overview & Business Analytics",
      pos: "Point of Sale (POS) Counter",
      inventory: "Inventory & Valuation",
      orders: "Customer Orders & Dispatch",
      bills: "Sales & Tax Invoices History",
      users: "Staff & User Permissions"
    };
    const titleEl = $("#admin-page-title");
    if (titleEl) titleEl.textContent = titles[tabName] || "Dashboard";

    // Scroll workspace to top smoothly
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Load tab-specific data
    if (tabName === "overview") loadOverview();
    if (tabName === "pos") loadPosView();
    if (tabName === "inventory") loadInventoryView();
    if (tabName === "orders") loadOrdersView();
    if (tabName === "bills") loadBillsView();
    if (tabName === "users") loadUsersView();
  }

  /* ==========================================================================
     TAB 1: Executive Overview & Analytics
     ========================================================================== */

  async function loadOverview() {
    try {
      // Parallel loading of bill stats, inventory valuation stats, low-stock, and orders
      const [statsRes, invStatsRes, lowStockRes, ordersRes] = await Promise.all([
        zeshAPI.getBillStats().catch(() => ({ stats: {} })),
        zeshAPI.getInventoryStats().catch(() => ({ stats: {} })),
        zeshAPI.getLowStock().catch(() => ({ products: [] })),
        zeshAPI.getOrders({ limit: 6 }).catch(() => ({ orders: [] }))
      ]);

      const stats = statsRes.stats || {};
      const invStats = invStatsRes.stats || {};
      const lowStock = lowStockRes.products || [];
      const orders = ordersRes.orders || [];

      // Update 4 Executive KPI Cards
      $("#kpi-today-sales").textContent = money(stats.todayRevenue || 0);
      $("#kpi-today-bills").textContent = stats.todayBills || 0;
      $("#kpi-vs-yesterday").textContent = `Yesterday: ${money(stats.yesterdayRevenue || 0)}`;

      $("#kpi-total-revenue").textContent = money(stats.totalRevenue || 0);
      $("#kpi-total-bills").textContent = stats.totalBills || 0;
      $("#kpi-aov-val").textContent = money(stats.avgOrderValue || 0);

      $("#kpi-total-profit").textContent = money(stats.totalProfit || 0);
      $("#kpi-margin-percent").textContent = `${stats.grossMarginPercent || 0}%`;

      $("#kpi-orders-count").textContent = orders.length;
      const pendingOrders = orders.filter(o => o.status === "Placed" || o.status === "Processing").length;
      $("#kpi-pending-orders").textContent = pendingOrders;

      const sidebarBadge = $("#sidebar-pending-orders-badge");
      if (sidebarBadge) {
        if (pendingOrders > 0) {
          sidebarBadge.textContent = pendingOrders;
          sidebarBadge.style.display = "inline-flex";
        } else {
          sidebarBadge.style.display = "none";
        }
      }

      // Render 7-Day Interactive Sales Chart
      const chartContainer = $("#overview-trend-chart");
      if (chartContainer) {
        const trend = stats.dailyTrend || [];
        if (trend.length === 0) {
          chartContainer.innerHTML = `<div style="margin: auto; color: var(--dark-text-muted); font-size: 12px;">Sales chart will visualize dynamically as transactions occur.</div>`;
        } else {
          const maxRev = Math.max(...trend.map(d => d.revenue), 1000);
          chartContainer.innerHTML = trend.map(d => {
            const heightPercent = Math.max(14, Math.round((d.revenue / maxRev) * 100));
            const dayLabel = d._id ? d._id.slice(5) : "";
            return `
              <div class="chart-bar-col" title="${d._id}: ${money(d.revenue)} (${d.count} bills)">
                <span style="font-size: 10px; color: #94a3b8; font-weight: 700;">${money(d.revenue)}</span>
                <div class="chart-bar-pillar" style="height: ${heightPercent}%;"></div>
                <span style="font-size: 10px; color: var(--dark-text-muted); font-family: var(--font-mono);">${dayLabel}</span>
              </div>
            `;
          }).join("");
        }
      }

      // Render Payment Breakdown
      const paymentContainer = $("#overview-payment-breakdown");
      if (paymentContainer) {
        const modes = stats.paymentModeStats || [];
        const totalAmount = modes.reduce((acc, m) => acc + m.amount, 0) || 1;

        if (modes.length === 0) {
          paymentContainer.innerHTML = `<div style="color:var(--dark-text-muted); font-size:12px;">No transactions recorded.</div>`;
        } else {
          paymentContainer.innerHTML = modes.map(m => {
            const percent = Math.round((m.amount / totalAmount) * 100);
            return `
              <div>
                <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                  <span style="color:white; font-weight:600;">${escapeHTML(m._id || 'Cash')}</span>
                  <span style="color:#94a3b8;">${money(m.amount)} (${percent}%)</span>
                </div>
                <div style="height:6px; background:#080c16; border-radius:99px; overflow:hidden;">
                  <div style="height:100%; width:${percent}%; background:linear-gradient(90deg, #3b82f6, #60a5fa); border-radius:99px;"></div>
                </div>
              </div>
            `;
          }).join("");
        }
      }

      // Render Top Selling Products Leaderboard
      const topProductsContainer = $("#overview-top-products-list");
      if (topProductsContainer) {
        const top = stats.topSellingProducts || [];
        if (top.length === 0) {
          topProductsContainer.innerHTML = `<div style="color:var(--dark-text-muted); font-size:12px;">Leaderboard will populate as items sell.</div>`;
        } else {
          topProductsContainer.innerHTML = top.map((tp, idx) => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#0f1627; padding:10px 14px; border-radius:var(--radius-md); border:1px solid var(--dark-border);">
              <div style="display:flex; align-items:center; gap:10px;">
                <span style="width:22px; height:22px; border-radius:50%; background:#1e293b; color:#60a5fa; display:grid; place-items:center; font-size:11px; font-weight:800;">${idx + 1}</span>
                <div>
                  <strong style="color:white; font-size:13px; display:block;">${escapeHTML(tp.name)}</strong>
                  <small style="color:var(--dark-text-muted); font-size:10px;">${escapeHTML(tp.sku)}</small>
                </div>
              </div>
              <div style="text-align:right;">
                <strong style="color:#10b981; font-size:13px; display:block;">${money(tp.revenue)}</strong>
                <small style="color:var(--dark-text-muted); font-size:11px;">${tp.unitsSold} units sold</small>
              </div>
            </div>
          `).join("");
        }
      }

      // Render Critical Stock Alerts
      const lowStockContainer = $("#overview-lowstock-list");
      if (lowStockContainer) {
        if (lowStock.length === 0) {
          lowStockContainer.innerHTML = `<div style="color: #10b981; font-size: 12px; padding: 12px 0;">✓ All inventory items are adequately stocked.</div>`;
        } else {
          lowStockContainer.innerHTML = lowStock.map(p => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#0e1526; padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--dark-border);">
              <div>
                <strong style="color:white; font-size:12px; display:block;">${escapeHTML(p.name)}</strong>
                <small style="color:var(--dark-text-muted); font-size:10px;">SKU: ${escapeHTML(p.sku || "")}</small>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="badge ${p.stockQuantity === 0 ? 'badge-danger' : 'badge-warning'}">${p.stockQuantity} in stock</span>
                <button class="btn btn-dark btn-small quick-restock-btn" data-id="${p._id}" data-name="${escapeHTML(p.name)}" data-stock="${p.stockQuantity}">Restock</button>
              </div>
            </div>
          `).join("");
        }
      }

      // Render Recent Online Orders
      const ordersTbody = $("#overview-recent-orders-tbody");
      if (ordersTbody) {
        if (orders.length === 0) {
          ordersTbody.innerHTML = `<tr><td colspan="6" style="padding:24px; text-align:center; color:var(--dark-text-muted);">No online customer orders placed yet.</td></tr>`;
        } else {
          ordersTbody.innerHTML = orders.map(o => {
            const dateStr = new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
            const custName = o.customer ? o.customer.name : "Customer";
            let badgeClass = "badge-info";
            if (o.status === "Delivered") badgeClass = "badge-success";
            if (o.status === "Cancelled") badgeClass = "badge-danger";
            if (o.status === "Processing" || o.status === "Shipped") badgeClass = "badge-warning";

            return `
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
                <td style="padding: 10px; font-family: var(--font-mono); color: #60a5fa; font-weight:600;">${escapeHTML(o.orderNumber)}</td>
                <td style="padding: 10px; color: white;">${escapeHTML(custName)}</td>
                <td style="padding: 10px; color: var(--dark-text-muted);">${dateStr}</td>
                <td style="padding: 10px; color: var(--dark-text-muted);">${o.items.length} item(s)</td>
                <td style="padding: 10px; font-weight: 700; color: white;">${money(o.total)}</td>
                <td style="padding: 10px;"><span class="badge ${badgeClass}">${escapeHTML(o.status)}</span></td>
              </tr>
            `;
          }).join("");
        }
      }

    } catch (err) {
      console.error("Failed to load overview data:", err);
      showToast("Could not load dashboard statistics", "error");
    }
  }

  /* ==========================================================================
     TAB 2: Point of Sale (POS) Retail Counter
     ========================================================================== */

  async function loadRecentCustomers() {
    try {
      const res = await zeshAPI.getRecentCustomers();
      recentCustomersList = res.customers || [];
    } catch (e) {
      recentCustomersList = [];
    }
  }

  async function loadPosView() {
    const grid = $("#pos-products-grid");
    if (!grid) return;

    grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 24px; color:var(--dark-text-muted);">Loading retail catalogue...</div>`;

    try {
      const res = await zeshAPI.getProducts({ limit: 100 });
      posProducts = res.products || [];
      renderPosProducts();
      renderPosBill();
      setupPosBarcodeScan();
    } catch (err) {
      grid.innerHTML = `<div style="color:var(--danger); padding:20px;">${escapeHTML(err.message)}</div>`;
    }
  }

  function renderPosProducts() {
    const grid = $("#pos-products-grid");
    const searchVal = ($("#pos-search-input")?.value || "").toLowerCase().trim();
    if (!grid) return;

    let filtered = [...posProducts];

    if (posCategory && posCategory !== "All") {
      filtered = filtered.filter(p => p.category === posCategory);
    }

    if (searchVal) {
      filtered = filtered.filter(p =>
        (p.name && p.name.toLowerCase().includes(searchVal)) ||
        (p.sku && p.sku.toLowerCase().includes(searchVal)) ||
        (p.barcode && p.barcode.toLowerCase().includes(searchVal))
      );
    }

    if (filtered.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 24px; color:var(--dark-text-muted);">No products match your search.</div>`;
      return;
    }

    grid.innerHTML = filtered.map(p => {
      const stock = Number(p.stockQuantity) || 0;
      const isOut = stock <= 0;

      return `
        <div class="pos-product-item ${isOut ? 'opacity-50' : ''}" data-pos-add-id="${p._id}">
          <div style="display: flex; gap: 8px; margin-bottom: 6px;">
            <img src="${p.imageUrl || '/images/logo.png'}" alt="" style="width: 38px; height: 38px; object-fit: cover; border-radius: 4px; background: #090d16; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.06);" onerror="this.src='/images/logo.png'">
            <div style="overflow: hidden;">
              <div style="font-size: 10px; color: #60a5fa; font-weight: 700; margin-bottom: 2px;">${escapeHTML(p.category)}</div>
              <strong style="color: white; font-size: 12px; line-height: 1.25; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${escapeHTML(p.name)}</strong>
            </div>
          </div>
          <div style="font-size: 10px; color: var(--dark-text-muted); font-family: var(--font-mono); margin-bottom: 6px;">SKU: ${escapeHTML(p.sku || "N/A")}</div>
          <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: center;">
            <strong style="color: #10b981; font-size: 13px;">${money(p.sellingPrice)}</strong>
            <span class="badge ${isOut ? 'badge-danger' : 'badge-neutral'}" style="font-size: 9px; padding: 2px 6px;">${stock} stock</span>
          </div>
        </div>
      `;
    }).join("");
  }

  // Barcode / SKU Scan Instant Add
  function setupPosBarcodeScan() {
    const input = $("#pos-search-input");
    if (!input || input.dataset.scanBound) return;
    input.dataset.scanBound = "true";

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const code = input.value.trim().toUpperCase();
        if (!code) return;

        // Try exact SKU or barcode match first
        const match = posProducts.find(p =>
          (p.sku && p.sku.toUpperCase() === code) ||
          (p.barcode && p.barcode === code)
        );

        if (match) {
          addProductToPosBill(match._id);
          showToast(`Scanned: ${match.name}`, "success");
          input.value = "";
          renderPosProducts();
        } else {
          // If 1 item currently matches filtered search, add it
          const searchVal = code.toLowerCase();
          const filtered = posProducts.filter(p =>
            (p.name && p.name.toLowerCase().includes(searchVal)) ||
            (p.sku && p.sku.toLowerCase().includes(searchVal))
          );
          if (filtered.length === 1) {
            addProductToPosBill(filtered[0]._id);
            showToast(`Added: ${filtered[0].name}`, "success");
            input.value = "";
            renderPosProducts();
          }
        }
      }
    });
  }

  function addProductToPosBill(productId) {
    const product = posProducts.find(p => p._id === productId);
    if (!product) return;

    const availableStock = Number(product.stockQuantity) || 0;
    if (availableStock <= 0) {
      showToast(`"${product.name}" is out of stock!`, "warning");
      return;
    }

    const existing = posCart.find(it => it.productId === productId);
    if (existing) {
      if (existing.quantity + 1 > availableStock) {
        showToast(`Stock limit reached for ${product.name} (Only ${availableStock} available)`, "warning");
        return;
      }
      existing.price = Number(product.sellingPrice) || 0;
      existing.name = product.name;
      existing.stock = availableStock;
      existing.quantity += 1;
    } else {
      posCart.push({
        productId: product._id,
        name: product.name,
        sku: product.sku || "",
        hsn: "8517",
        price: Number(product.sellingPrice) || 0,
        stock: availableStock,
        quantity: 1
      });
    }

    // Auto pre-fill POS Device Details card and multi-unit handset selector
    const handsetWrap = $("#pos-handset-selector-wrap");
    const handsetSelect = $("#pos-handset-unit-select");
    const handsetBadge = $("#pos-handset-stock-badge");

    const availableUnits = Array.isArray(product.imeiRecords) && product.imeiRecords.length > 0
      ? product.imeiRecords.filter(r => r.status === "In Stock")
      : (product.imei1 ? [{ imei1: product.imei1, imei2: product.imei2, serialNumber: product.serialNumber, status: "In Stock" }] : []);

    if (availableUnits.length > 0 && handsetWrap && handsetSelect) {
      handsetWrap.style.display = "block";
      if (handsetBadge) handsetBadge.textContent = `${availableUnits.length} In Stock`;
      handsetSelect.innerHTML = `
        <option value="">-- Choose Stock Handset (${availableUnits.length} available) --</option>
        ${availableUnits.map((u, i) => `
          <option value="${i}" data-imei1="${escapeHTML(u.imei1 || '')}" data-imei2="${escapeHTML(u.imei2 || '')}" data-sn="${escapeHTML(u.serialNumber || '')}" ${i === 0 ? 'selected' : ''}>
            Handset #${i + 1} — IMEI: ${escapeHTML(u.imei1 || "N/A")} ${u.serialNumber ? `(S/N: ${escapeHTML(u.serialNumber)})` : ''}
          </option>
        `).join("")}
      `;

      // Set initial unit values
      const initial = availableUnits[0];
      if (initial) {
        if ($("#pos-imei1")) $("#pos-imei1").value = initial.imei1 || "";
        if ($("#pos-imei2")) $("#pos-imei2").value = initial.imei2 || "";
        if ($("#pos-serial-no") && initial.serialNumber) $("#pos-serial-no").value = initial.serialNumber;
      }

      handsetSelect.onchange = () => {
        const opt = handsetSelect.options[handsetSelect.selectedIndex];
        if (opt && opt.value !== "") {
          if ($("#pos-imei1")) $("#pos-imei1").value = opt.getAttribute("data-imei1") || "";
          if ($("#pos-imei2")) $("#pos-imei2").value = opt.getAttribute("data-imei2") || "";
          if ($("#pos-serial-no")) $("#pos-serial-no").value = opt.getAttribute("data-sn") || "";
        }
      };
    } else if (handsetWrap) {
      handsetWrap.style.display = "none";
    }

    const serialField = $("#pos-serial-no");
    if (serialField && product.serialNumber && !serialField.value) {
      serialField.value = product.serialNumber;
    }
    const imei1Field = $("#pos-imei1");
    if (imei1Field && product.imei1 && !imei1Field.value) {
      imei1Field.value = product.imei1;
    }
    const imei2Field = $("#pos-imei2");
    if (imei2Field && product.imei2 && !imei2Field.value) {
      imei2Field.value = product.imei2;
    }
    const modelField = $("#pos-model-no");
    if (modelField && product.model && !modelField.value) {
      modelField.value = product.model;
    }

    renderPosBill();
  }

  function updatePosCartQuantity(productId, delta) {
    const item = posCart.find(it => it.productId === productId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      posCart = posCart.filter(it => it.productId !== productId);
    } else if (newQty > item.stock) {
      showToast(`Cannot exceed current stock (${item.stock} available)`, "warning");
      return;
    } else {
      item.quantity = newQty;
    }

    renderPosBill();
  }

  function removePosCartItem(productId) {
    posCart = posCart.filter(it => it.productId !== productId);
    renderPosBill();
  }

  function renderPosBill() {
    const tbody = $("#pos-bill-tbody");
    const emptyMsg = $("#pos-empty-cart-msg");
    const subtotalEl = $("#pos-subtotal-val");
    const taxEl = $("#pos-tax-val");
    const grandTotalEl = $("#pos-grand-total-val");
    const taxRate = parseFloat($("#pos-tax-rate")?.value || 18);
    const discount = parseFloat($("#pos-discount")?.value || 0);

    if (!tbody) return;

    if (posCart.length === 0) {
      tbody.innerHTML = "";
      emptyMsg?.classList.remove("hidden");
      if (subtotalEl) subtotalEl.textContent = "₹0.00";
      if (taxEl) taxEl.textContent = "₹0.00";
      if (grandTotalEl) grandTotalEl.textContent = "₹0.00";
      updateCashTenderCalculation(0);
      return;
    }

    emptyMsg?.classList.add("hidden");

    let subtotal = 0;
    tbody.innerHTML = posCart.map(it => {
      const lineTotal = it.price * it.quantity;
      subtotal += lineTotal;

      return `
        <tr>
          <td>
            <strong style="color: white; display:block;">${escapeHTML(it.name)}</strong>
            <small style="color: var(--dark-text-muted); font-family: var(--font-mono);">${escapeHTML(it.sku)}</small>
          </td>
          <td style="color: white;">${money(it.price)}</td>
          <td>
            <div class="quantity-stepper" style="border-color: var(--dark-border); background: #080c16;">
              <button type="button" class="pos-qty-minus" data-id="${it.productId}" style="color:white;">-</button>
              <span style="color:white;">${it.quantity}</span>
              <button type="button" class="pos-qty-plus" data-id="${it.productId}" style="color:white;">+</button>
            </div>
          </td>
          <td style="color: white; font-weight: 700;">${money(lineTotal)}</td>
          <td>
            <button type="button" class="pos-remove-item" data-id="${it.productId}" style="color: #f87171; cursor:pointer;" title="Remove">✕</button>
          </td>
        </tr>
      `;
    }).join("");

    const calculatedTax = taxRate > 0 ? Math.round(subtotal * (taxRate / 100) * 100) / 100 : 0;
    const finalDiscount = Math.max(0, Math.min(discount, subtotal));
    const isExchangeOn = $("#pos-exchange-toggle")?.checked || false;
    const exchangeVal = isExchangeOn ? Math.max(0, parseFloat($("#pos-exchange-value")?.value) || 0) : 0;
    const valDisplay = $("#pos-exchange-val-display");
    if (valDisplay) {
      valDisplay.textContent = exchangeVal > 0 ? `-${money(exchangeVal)} Off` : "";
    }
    const grandTotal = Math.max(0, Math.round((subtotal + calculatedTax - finalDiscount - exchangeVal) * 100) / 100);

    if (subtotalEl) subtotalEl.textContent = money(subtotal);
    if (taxEl) taxEl.textContent = money(calculatedTax);
    if (grandTotalEl) grandTotalEl.textContent = money(grandTotal);

    updateCashTenderCalculation(grandTotal);
  }

  // Cash Tender Change Return Calculator
  function updateCashTenderCalculation(grandTotal) {
    const input = $("#pos-cash-tendered-input");
    const pill = $("#pos-change-return-pill");
    if (!input || !pill) return;

    const tendered = parseFloat(input.value) || 0;
    if (tendered > 0 && grandTotal > 0) {
      const change = tendered - grandTotal;
      if (change >= 0) {
        pill.textContent = `Return: ${money(change)}`;
        pill.style.color = "#10b981";
      } else {
        pill.textContent = `Due: ${money(Math.abs(change))}`;
        pill.style.color = "#f87171";
      }
    } else {
      pill.textContent = "Change: ₹0";
      pill.style.color = "#94a3b8";
    }
  }

  // Multi-Ticket Hold & Resume
  function handleHoldBill() {
    if (posCart.length === 0) {
      showToast("Cannot hold empty bill", "warning");
      return;
    }

    heldTickets.push({
      cart: [...posCart],
      custName: $("#pos-cust-name").value,
      custPhone: $("#pos-cust-phone").value,
      discount: $("#pos-discount").value,
      ticketNumber: heldTickets.length + 1
    });

    posCart = [];
    $("#pos-cust-name").value = "";
    $("#pos-cust-phone").value = "";
    $("#pos-discount").value = "0";

    $("#pos-active-ticket-badge").textContent = `Ticket #${heldTickets.length + 1}`;
    $("#pos-resume-bill-btn").style.display = "inline-flex";
    $("#pos-resume-bill-btn").textContent = `Resume Ticket #${heldTickets.length} (${heldTickets[heldTickets.length - 1].cart.length} items)`;

    renderPosBill();
    showToast("Bill held on ticket buffer", "info");
  }

  function handleResumeBill() {
    if (heldTickets.length === 0) return;

    const ticket = heldTickets.pop();
    posCart = ticket.cart;
    $("#pos-cust-name").value = ticket.custName;
    $("#pos-cust-phone").value = ticket.custPhone;
    $("#pos-discount").value = ticket.discount;

    $("#pos-active-ticket-badge").textContent = `Ticket #${ticket.ticketNumber}`;

    if (heldTickets.length === 0) {
      $("#pos-resume-bill-btn").style.display = "none";
    } else {
      $("#pos-resume-bill-btn").textContent = `Resume Ticket #${heldTickets.length}`;
    }

    renderPosBill();
    showToast("Held ticket resumed", "success");
  }

  // Customer Autocomplete for POS
  function setupCustomerAutocomplete() {
    const input = $("#pos-cust-phone");
    const list = $("#pos-customer-autocomplete");
    if (!input || !list) return;

    input.addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (q.length < 2) {
        list.classList.add("hidden");
        return;
      }

      const matches = recentCustomersList.filter(c =>
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.name && c.name.toLowerCase().includes(q))
      );

      if (matches.length === 0) {
        list.classList.add("hidden");
        return;
      }

      list.innerHTML = matches.map(c => `
        <div class="customer-autocomplete-item" data-cust-phone="${escapeHTML(c.phone)}" data-cust-name="${escapeHTML(c.name || '')}" data-cust-addr="${escapeHTML(c.address || '')}">
          <strong>${escapeHTML(c.name || 'Customer')}</strong>
          <small style="color:#94a3b8; display:block;">${escapeHTML(c.phone)} • ${c.totalPurchases || 1} purchases</small>
        </div>
      `).join("");

      list.classList.remove("hidden");
    });

    list.addEventListener("click", (e) => {
      const item = e.target.closest(".customer-autocomplete-item");
      if (item) {
        $("#pos-cust-phone").value = item.dataset.custPhone || "";
        $("#pos-cust-name").value = item.dataset.custName || "";
        list.classList.add("hidden");
        showToast(`Selected: ${item.dataset.custName}`, "info");
      }
    });

    document.addEventListener("click", (e) => {
      if (!input.contains(e.target) && !list.contains(e.target)) {
        list.classList.add("hidden");
      }
    });
  }

  async function handleCompletePosBill() {
    if (posCart.length === 0) {
      showToast("Cannot complete bill: no items added.", "warning");
      return;
    }

    const btn = $("#pos-complete-bill-btn");
    const customerName = $("#pos-cust-name")?.value.trim() || "Walk-in Customer";
    const customerPhone = $("#pos-cust-phone")?.value.trim() || "";
    const paymentMode = $("#pos-payment-mode")?.value || "Cash";
    const taxRate = parseFloat($("#pos-tax-rate")?.value || 18);
    const discount = parseFloat($("#pos-discount")?.value || 0);

    try {
      btn.disabled = true;
      btn.textContent = "Recording Sale in MongoDB...";

      const billPayload = {
        customerName,
        customerPhone,
        customerAddress: $("#pos-cust-address")?.value.trim() || "",
        paymentMode,
        financier: $("#pos-financier")?.value.trim() || "",
        loanReference: $("#pos-loan-ref")?.value.trim() || "",
        imei1: $("#pos-imei1")?.value.trim() || "",
        imei2: $("#pos-imei2")?.value.trim() || "",
        modelNumber: $("#pos-model-no")?.value.trim() || "",
        serialNumber: $("#pos-serial-no")?.value.trim() || "",
        taxRate,
        discount,
        exchangePhone: ($("#pos-exchange-toggle")?.checked) ? {
          model: $("#pos-exchange-model")?.value.trim() || "",
          imei: $("#pos-exchange-imei")?.value.trim() || "",
          valuation: Math.max(0, parseFloat($("#pos-exchange-value")?.value) || 0)
        } : null,
        items: posCart.map(it => ({
          productId: it.productId,
          name: it.name,
          sku: it.sku,
          price: it.price,
          quantity: it.quantity,
          hsn: it.hsn || "8517"
        }))
      };

      const res = await zeshAPI.createBill(billPayload);
      const createdBill = res.bill;

      showToast(`Sale completed! Invoice #${createdBill.invoiceNumber}`, "success");

      // Reset bill cart and form inputs
      posCart = [];
      $("#pos-cust-name").value = "";
      $("#pos-cust-phone").value = "";
      if ($("#pos-cust-address")) $("#pos-cust-address").value = "";
      if ($("#pos-imei1")) $("#pos-imei1").value = "";
      if ($("#pos-imei2")) $("#pos-imei2").value = "";
      if ($("#pos-model-no")) $("#pos-model-no").value = "";
      if ($("#pos-serial-no")) $("#pos-serial-no").value = "";
      if ($("#pos-handset-selector-wrap")) $("#pos-handset-selector-wrap").style.display = "none";
      if ($("#pos-handset-unit-select")) $("#pos-handset-unit-select").innerHTML = "";
      if ($("#pos-exchange-toggle")) $("#pos-exchange-toggle").checked = false;
      if ($("#pos-exchange-fields")) $("#pos-exchange-fields").style.display = "none";
      if ($("#pos-exchange-model")) $("#pos-exchange-model").value = "";
      if ($("#pos-exchange-imei")) $("#pos-exchange-imei").value = "";
      if ($("#pos-exchange-value")) $("#pos-exchange-value").value = "";
      if ($("#pos-exchange-val-display")) $("#pos-exchange-val-display").textContent = "";
      if ($("#pos-financier")) $("#pos-financier").value = "";
      if ($("#pos-loan-ref")) $("#pos-loan-ref").value = "";
      $("#pos-discount").value = "0";
      $("#pos-cash-tendered-input").value = "";
      renderPosBill();

      // Refresh product catalogue & recent buyers
      loadPosView();
      loadRecentCustomers();

      // Open Tax Invoice Print Modal
      openTaxInvoicePrintModal(createdBill);

    } catch (err) {
      console.error("Sale completion error:", err);
      showToast(err.message || "Failed to complete POS sale", "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Generate Bill & Print";
    }
  }

  /* ==========================================================================
     Dual Tax Invoice Print Engine (A4 & 80mm Thermal Receipt)
     ========================================================================== */

  function openTaxInvoicePrintModal(bill) {
    activeBillForPrint = bill;
    printFormat = "a4";
    document.body.classList.remove("print-thermal-mode");

    $("#toggle-print-a4").style.background = "white";
    $("#toggle-print-a4").style.color = "black";
    $("#toggle-print-thermal").style.background = "transparent";
    $("#toggle-print-thermal").style.color = "#64748b";

    renderPrintContent();
    $("#invoice-print-modal")?.classList.add("active");
  }

  function handleSendWhatsAppInvoice() {
    if (!activeBillForPrint) {
      showToast("No active bill selected", "warning");
      return;
    }

    const bill = activeBillForPrint;
    let phone = (bill.customerPhone || "").trim().replace(/\D/g, "");

    if (!phone || phone.length < 10) {
      const input = prompt("Please enter customer's 10-digit WhatsApp number:", phone || "");
      if (!input) return;
      phone = input.trim().replace(/\D/g, "");
    }

    if (phone.length === 10) {
      phone = "91" + phone;
    } else if (phone.length === 12 && phone.startsWith("91")) {
      // Valid international Indian format
    } else {
      showToast("Please enter a valid 10-digit mobile number", "error");
      return;
    }

    const dateStr = new Date(bill.createdAt || Date.now()).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    const itemsText = (bill.items || []).map((it, idx) => {
      const total = (it.total || it.price * it.quantity || 0).toLocaleString("en-IN");
      return `  ${idx + 1}. *${it.name}* (x${it.quantity}) — ₹${total}`;
    }).join("\n");

    const grandTotal = (bill.grandTotal || 0).toLocaleString("en-IN");
    const mode = bill.paymentMode || "Cash";

    const msg =
`🧾 *TAX INVOICE — ZESH TECH RETAIL*
━━━━━━━━━━━━━━━━━━━━
📄 *Invoice No:* #${bill.invoiceNumber}
📅 *Date:* ${dateStr}
👤 *Customer:* ${bill.customerName || "Valued Customer"}
💳 *Payment Mode:* ${mode}
━━━━━━━━━━━━━━━━━━━━
🛍️ *Purchased Items:*
${itemsText}
━━━━━━━━━━━━━━━━━━━━
💰 *Grand Total:* ₹${grandTotal}
_(Inclusive of GST & Official Brand Pack Sealing)_
━━━━━━━━━━━━━━━━━━━━
📍 *Store:* ZESH TECH, Station Road, Barh (Patna), Bihar - 803213
📞 *Store Support:* +91 7903746116 / 9122846271
✅ *100% Genuine Sealed Stock & Warranty Support*
🙏 *Thank you for shopping at Zesh Tech!*`;

    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
    showToast(`WhatsApp Invoice opened for ${bill.customerName || "customer"}!`, "success");
  }

  function renderPrintContent() {
    const printArea = $("#invoice-print-area");
    if (!printArea || !activeBillForPrint) return;

    const bill = activeBillForPrint;
    const dateStr = new Date(bill.createdAt || Date.now()).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    if (printFormat === "thermal") {
      // 80mm Thermal POS Slip
      printArea.innerHTML = `
        <div class="thermal-receipt">
          <div style="text-align: center; margin-bottom: 8px;">
            <div style="font-size: 15px; font-weight: 800;">ZESH-TECH RETAIL</div>
            <div>Smart Electronics &amp; Mobile Accessories</div>
            <div>GSTIN: 07AAAFZ8166J1ZK</div>
            <div>Support: +91 98765 43210</div>
          </div>

          <div class="thermal-divider"></div>
          <div>INVOICE: ${escapeHTML(bill.invoiceNumber)}</div>
          <div>DATE: ${dateStr}</div>
          <div>CUSTOMER: ${escapeHTML(bill.customerName || 'Walk-in')}</div>
          ${bill.customerPhone ? `<div>PHONE: ${escapeHTML(bill.customerPhone)}</div>` : ''}
          <div>MODE: ${escapeHTML(bill.paymentMode || 'Cash')}</div>
          <div class="thermal-divider"></div>

          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="border-bottom: 1px dashed #000;">
                <th style="text-align: left;">ITEM</th>
                <th style="text-align: center;">QTY</th>
                <th style="text-align: right;">AMT</th>
              </tr>
            </thead>
            <tbody>
              ${(bill.items || []).map(it => `
                <tr>
                  <td style="padding: 2px 0;">${escapeHTML(it.name)}</td>
                  <td style="text-align: center;">${it.quantity}</td>
                  <td style="text-align: right;">${money(it.total || it.price * it.quantity)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="thermal-divider"></div>
          <div style="display: flex; justify-content: space-between;">
            <span>TAXABLE:</span>
            <span>${money(bill.taxableValue || 0)}</span>
          </div>
          ${bill.cgst > 0 ? `
            <div style="display: flex; justify-content: space-between;">
              <span>CGST:</span>
              <span>${money(bill.cgst)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>SGST:</span>
              <span>${money(bill.sgst)}</span>
            </div>
          ` : ''}
          ${bill.discount > 0 ? `
            <div style="display: flex; justify-content: space-between;">
              <span>DISCOUNT:</span>
              <span>-${money(bill.discount)}</span>
            </div>
          ` : ''}
          <div class="thermal-divider"></div>
          <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 800;">
            <span>GRAND TOTAL:</span>
            <span>${money(bill.grandTotal)}</span>
          </div>
          <div class="thermal-divider"></div>

          <div style="text-align: center; margin-top: 10px; font-size: 10px;">
            <div>Thank You For Shopping!</div>
            <div>Goods covered under manufacturer warranty.</div>
            <div>www.zeshtech.com</div>
          </div>
        </div>
      `;
    } else {
      // Official ZESH TECH TAX INVOICE (Matching Uploaded Official Format)
      const rawDate = new Date(bill.createdAt || Date.now());
      const invDateStr = `${String(rawDate.getDate()).padStart(2, "0")}-${String(rawDate.getMonth() + 1).padStart(2, "0")}-${rawDate.getFullYear()}`;

      const totalAmountVal = bill.grandTotal || 0;
      const taxableAmountVal = bill.taxableValue || (totalAmountVal / 1.18);
      const cgstVal = bill.cgst || (taxableAmountVal * 0.09);
      const sgstVal = bill.sgst || (taxableAmountVal * 0.09);
      const totalUnits = (bill.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0);
      const wordsAmount = numberToIndianWords(totalAmountVal);

      const itemsRows = (bill.items || []).map((it, idx) => {
        const itTaxable = it.taxableValue || (it.price * it.quantity / 1.18);
        const itCgst = it.cgst || (itTaxable * 0.09);
        const itSgst = it.sgst || (itTaxable * 0.09);
        const itTotal = it.total || (it.price * it.quantity);

        return `
          <tr style="border-bottom: 1px solid #000;">
            <td style="padding: 6px 8px; vertical-align: top; border-right: 1px solid #000;">
              <div style="font-weight: 700; font-size: 11px; text-transform: uppercase;">${idx + 1}. ${escapeHTML(it.name)}</div>
              <div style="font-size: 9.5px; font-family: monospace; margin-top: 3px; line-height: 1.4; color: #111;">
                ${bill.imei1 || it.imei1 ? `<div>IMEI 1 &nbsp;: ${escapeHTML(bill.imei1 || it.imei1)}</div>` : ""}
                ${bill.imei2 || it.imei2 ? `<div>IMEI 2 &nbsp;: ${escapeHTML(bill.imei2 || it.imei2)}</div>` : ""}
                ${bill.modelNumber || it.modelNumber ? `<div>Model No. : ${escapeHTML(bill.modelNumber || it.modelNumber)}</div>` : ""}
                ${bill.serialNumber || it.serialNumber ? `<div>Serial No. : ${escapeHTML(bill.serialNumber || it.serialNumber)}</div>` : ""}
                <div>HSN Code : ${escapeHTML(it.hsn || "8517")}</div>
              </div>
            </td>
            <td style="text-align: center; border-right: 1px solid #000; font-size: 10px;">${escapeHTML(it.hsn || "8517")}</td>
            <td style="text-align: center; border-right: 1px solid #000; font-size: 11px;">${it.quantity}</td>
            <td style="text-align: right; border-right: 1px solid #000; font-size: 10.5px;">${itTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="text-align: center; border-right: 1px solid #000; font-size: 10px;">
              <div>9%</div>
              <div style="font-size: 9px; color: #333;">${itCgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </td>
            <td style="text-align: center; border-right: 1px solid #000; font-size: 10px;">
              <div>9%</div>
              <div style="font-size: 9px; color: #333;">${itSgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </td>
            <td style="text-align: center; border-right: 1px solid #000; font-size: 10px;">--</td>
            <td style="text-align: right; font-weight: 700; font-size: 11px;">${itTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        `;
      }).join("");

      printArea.innerHTML = `
        <div class="official-tax-invoice" style="border: 2px solid #000; background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.35; margin: 0 auto;">
          
          <!-- TOP HEADER: 3 Columns -->
          <div style="display: grid; grid-template-columns: 1.3fr 1.2fr 1fr; border-bottom: 1.5px solid #000;">
            <!-- Column 1: Store Details -->
            <div style="padding: 10px 12px; border-right: 1.5px solid #000;">
              <div style="font-size: 26px; font-weight: 900; color: #a11414; letter-spacing: 0.5px; line-height: 1.1;">ZESH TECH</div>
              <div style="font-size: 11px; font-weight: 700; margin-bottom: 6px;">A Unit of ZESH TECH</div>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 4px;">
                <tr><td style="border: none; padding: 1px 0; font-weight: 600; width: 75px;">GSTIN No.</td><td style="border: none; padding: 1px 0;">: 10GURPS1052R1ZZ</td></tr>
                <tr><td style="border: none; padding: 1px 0; font-weight: 600;">Shop Name</td><td style="border: none; padding: 1px 0;">: ZESH TECH</td></tr>
                <tr><td style="border: none; padding: 1px 0; font-weight: 600; vertical-align: top;">Address</td><td style="border: none; padding: 1px 0;">: STATION ROAD, BAZIDPUR,<br>(NEAR HAPPY MARRIAGE HALL)<br>BARH, PATNA (BIHAR) 803213</td></tr>
                <tr><td style="border: none; padding: 1px 0; font-weight: 600;">Mobile No.</td><td style="border: none; padding: 1px 0;">: 7903746116, 9122846271</td></tr>
              </table>
            </div>

            <!-- Column 2: Tax Invoice & QR Code -->
            <div style="padding: 10px 12px; border-right: 1.5px solid #000; display: flex; flex-direction: column;">
              <div style="text-align: center; font-size: 15px; font-weight: 800; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 8px;">TAX INVOICE</div>
              
              <div style="display: grid; grid-template-columns: 1fr 90px; gap: 8px; flex: 1;">
                <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                  <tr><td style="border: none; padding: 1px 0; font-weight: 600; width: 95px;">Invoice No.</td><td style="border: none; padding: 1px 0;">: ${escapeHTML(bill.invoiceNumber)}</td></tr>
                  <tr><td style="border: none; padding: 1px 0; font-weight: 600;">Invoice Date</td><td style="border: none; padding: 1px 0;">: ${invDateStr}</td></tr>
                  <tr><td style="border: none; padding: 1px 0; font-weight: 600;">Place of Supply</td><td style="border: none; padding: 1px 0;">: Bihar (10)</td></tr>
                  <tr><td style="border: none; padding: 1px 0; font-weight: 600;">Reverse Charge</td><td style="border: none; padding: 1px 0;">: N</td></tr>
                  <tr><td style="border: none; padding: 1px 0; font-weight: 600;">GR/RR No.</td><td style="border: none; padding: 1px 0;">: --</td></tr>
                  <tr><td style="border: none; padding: 1px 0; font-weight: 600;">Transport</td><td style="border: none; padding: 1px 0;">: --</td></tr>
                  <tr><td style="border: none; padding: 1px 0; font-weight: 600;">Vehicle No.</td><td style="border: none; padding: 1px 0;">: --</td></tr>
                </table>

                <div style="text-align: center;">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=85x85&data=${encodeURIComponent('https://zeshtech.com/invoice/' + bill.invoiceNumber)}" alt="QR Code" style="width: 76px; height: 76px; border: 1px solid #000; padding: 2px;">
                  <div style="font-size: 8px; line-height: 1.2; margin-top: 2px;">Scan this QR code<br>to view invoice details</div>
                </div>
              </div>
            </div>

            <!-- Column 3: BillBook / Admin Contact -->
            <div style="padding: 10px 12px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                <tr><td style="border: none; padding: 1px 0; font-weight: 600; width: 85px;">Email</td><td style="border: none; padding: 1px 0;">: zishanshafique8@gmail.com</td></tr>
                <tr><td style="border: none; padding: 1px 0; font-weight: 600;">BillBook Name</td><td style="border: none; padding: 1px 0;">: ZESH TECH</td></tr>
                <tr><td style="border: none; padding: 1px 0; font-weight: 600;">BillBook GSTIN</td><td style="border: none; padding: 1px 0;">: 10GURPS1052R1ZZ</td></tr>
                <tr><td style="border: none; padding: 1px 0; font-weight: 600; vertical-align: top;">Address</td><td style="border: none; padding: 1px 0;">: STATION ROAD,<br>BAZIDPUR BARH,<br>PATNA, BIHAR 803213</td></tr>
              </table>
            </div>
          </div>

          <!-- ROW 2: BILL TO & SHIPPING DETAILS -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1.5px solid #000;">
            <!-- BILL TO -->
            <div style="padding: 6px 12px; border-right: 1.5px solid #000;">
              <div style="font-weight: 800; text-decoration: underline; margin-bottom: 4px; font-size: 11px;">BILL TO :</div>
              <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                <tr><td style="border: none; padding: 1px 0; font-weight: 600; width: 105px;">Customer Name</td><td style="border: none; padding: 1px 0;">: ${escapeHTML(bill.customerName || "Walk-in Customer")}</td></tr>
                <tr><td style="border: none; padding: 1px 0; font-weight: 600;">Address</td><td style="border: none; padding: 1px 0;">: ${escapeHTML(bill.customerAddress || "Barh, Patna, Bihar 803213")}</td></tr>
                <tr><td style="border: none; padding: 1px 0; font-weight: 600;">Mobile No.</td><td style="border: none; padding: 1px 0;">: ${escapeHTML(bill.customerPhone || "--")}</td></tr>
                <tr><td style="border: none; padding: 1px 0; font-weight: 600;">Email</td><td style="border: none; padding: 1px 0;">: --</td></tr>
                <tr><td style="border: none; padding: 1px 0; font-weight: 600;">State</td><td style="border: none; padding: 1px 0;">: Bihar</td></tr>
                <tr><td style="border: none; padding: 1px 0; font-weight: 600;">GSTIN</td><td style="border: none; padding: 1px 0;">: --</td></tr>
              </table>
            </div>

            <!-- SHIPPING DETAILS -->
            <div style="padding: 6px 12px;">
              <div style="font-weight: 800; text-decoration: underline; margin-bottom: 4px; font-size: 11px;">SHIPPING DETAILS :</div>
              <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                <tr><td style="border: none; padding: 1px 0; font-weight: 600; width: 105px;">Name</td><td style="border: none; padding: 1px 0;">: ${escapeHTML(bill.customerName || "Walk-in Customer")}</td></tr>
                <tr><td style="border: none; padding: 1px 0; font-weight: 600;">Address</td><td style="border: none; padding: 1px 0;">: ${escapeHTML(bill.customerAddress || "Barh, Patna, Bihar 803213")}</td></tr>
                <tr><td style="border: none; padding: 1px 0; font-weight: 600;">Mobile No.</td><td style="border: none; padding: 1px 0;">: ${escapeHTML(bill.customerPhone || "--")}</td></tr>
                <tr><td style="border: none; padding: 1px 0; font-weight: 600;">State</td><td style="border: none; padding: 1px 0;">: Bihar</td></tr>
                <tr><td style="border: none; padding: 1px 0; font-weight: 600;">GSTIN</td><td style="border: none; padding: 1px 0;">: --</td></tr>
              </table>
            </div>
          </div>

          <!-- ROW 3: PAYMENT DETAILS (LEFT) & PRODUCT DETAILS (RIGHT) -->
          <div style="display: grid; grid-template-columns: 240px 1fr; border-bottom: 1.5px solid #000;">
            <!-- Left: PAYMENT DETAILS -->
            <div style="border-right: 1.5px solid #000; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="text-align: center; font-weight: 800; border-bottom: 1px solid #000; padding: 4px 6px; font-size: 11px;">PAYMENT DETAILS</div>
                <div style="padding: 6px 8px;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                    <tr><td style="border: none; padding: 2px 0; font-weight: 600; width: 95px;">Payment Type</td><td style="border: none; padding: 2px 0;">: Sale</td></tr>
                    <tr><td style="border: none; padding: 2px 0; font-weight: 600;">Payment Mode</td><td style="border: none; padding: 2px 0;">: ${escapeHTML(bill.paymentMode || "Cash")}</td></tr>
                    <tr><td style="border: none; padding: 2px 0; font-weight: 600;">Bank Name</td><td style="border: none; padding: 2px 0;">: ${escapeHTML(bill.bankName || (bill.financier ? bill.financier : "--"))}</td></tr>
                    <tr><td style="border: none; padding: 2px 0; font-weight: 600;">Card / UPI / Ref</td><td style="border: none; padding: 2px 0;">: ${escapeHTML(bill.cardRefNo || (bill.loanReference ? bill.loanReference : "--"))}</td></tr>
                    <tr><td style="border: none; padding: 2px 0; font-weight: 600;">Transaction ID</td><td style="border: none; padding: 2px 0;">: ${escapeHTML(bill.transactionId || "--")}</td></tr>
                    <tr><td style="border: none; padding: 2px 0; font-weight: 600;">Date</td><td style="border: none; padding: 2px 0;">: ${invDateStr}</td></tr>
                    <tr><td style="border: none; padding: 2px 0; font-weight: 600;">Amount</td><td style="border: none; padding: 2px 0; font-weight: 700;">: ₹ ${totalAmountVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
                  </table>
                </div>
              </div>

              <!-- Amount in words box -->
              <div style="border-top: 1px solid #000; padding: 6px 8px; background: #fafafa;">
                <div style="font-weight: 700; font-size: 9.5px; margin-bottom: 2px;">Amount (in words)</div>
                <div style="font-size: 10px; font-weight: 700; color: #111;">${wordsAmount}</div>
              </div>
            </div>

            <!-- Right: PRODUCT DETAILS TABLE -->
            <div style="display: flex; flex-direction: column;">
              <table style="width: 100%; border-collapse: collapse; font-size: 10px; flex: 1;">
                <thead>
                  <tr style="border-bottom: 1px solid #000; font-weight: 800; text-align: center; background: #fafafa;">
                    <th style="padding: 5px 6px; text-align: center; border-right: 1px solid #000;">PRODUCT DETAILS</th>
                    <th style="padding: 5px 4px; width: 45px; border-right: 1px solid #000;">HSN</th>
                    <th style="padding: 5px 4px; width: 35px; border-right: 1px solid #000;">Qty</th>
                    <th style="padding: 5px 6px; width: 90px; border-right: 1px solid #000;">TAXABLE VALUE</th>
                    <th style="padding: 5px 4px; width: 65px; border-right: 1px solid #000;">CGST</th>
                    <th style="padding: 5px 4px; width: 65px; border-right: 1px solid #000;">SGST</th>
                    <th style="padding: 5px 4px; width: 45px; border-right: 1px solid #000;">IGST</th>
                    <th style="padding: 5px 6px; width: 85px;">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRows}
                  <!-- Table TOTAL row -->
                  <tr style="border-top: 1.5px solid #000; font-weight: 800;">
                    <td style="padding: 5px 6px; text-align: center; border-right: 1px solid #000;">TOTAL</td>
                    <td style="border-right: 1px solid #000;"></td>
                    <td style="text-align: center; border-right: 1px solid #000;">${totalUnits}</td>
                    <td style="text-align: right; border-right: 1px solid #000;">${taxableAmountVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style="text-align: center; border-right: 1px solid #000;">${cgstVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style="text-align: center; border-right: 1px solid #000;">${sgstVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style="text-align: center; border-right: 1px solid #000;">0.00</td>
                    <td style="text-align: right;">${totalAmountVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- ROW 4: WORDS, TERMS & GRAND TOTAL SUMMARY -->
          <div style="display: grid; grid-template-columns: 1fr 270px; border-bottom: 1.5px solid #000;">
            <!-- Left: Words & E.&O.E. -->
            <div style="padding: 8px 12px; border-right: 1.5px solid #000;">
              <div style="font-size: 10.5px; margin-bottom: 8px;">
                <strong>TOTAL IN WORDS : </strong> ${wordsAmount}
              </div>
              <div style="font-size: 10px; margin-bottom: 8px;">
                Cheque/DD in favour of <strong>"ZESH TECH"</strong> payable at PATNA
              </div>
              <div style="font-size: 9.5px; color: #111; line-height: 1.4;">
                <strong>E. & O.E.</strong><br>
                1. Goods once sold will not be taken back or exchanged.<br>
                2. Warranty / Guarantee if given by manufacturer only.
              </div>
            </div>

            <!-- Right: Tax & Grand Total Table -->
            <div>
              <table style="width: 100%; border-collapse: collapse; font-size: 10.5px;">
                <tr>
                  <td style="border: none; border-bottom: 1px solid #ddd; padding: 3px 8px; font-weight: 600;">Taxable Amount</td>
                  <td style="border: none; border-bottom: 1px solid #ddd; padding: 3px 8px; text-align: right; font-weight: 700;">₹ ${taxableAmountVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td style="border: none; border-bottom: 1px solid #ddd; padding: 3px 8px;">CGST @ 9%</td>
                  <td style="border: none; border-bottom: 1px solid #ddd; padding: 3px 8px; text-align: right;">₹ ${cgstVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td style="border: none; border-bottom: 1px solid #ddd; padding: 3px 8px;">SGST @ 9%</td>
                  <td style="border: none; border-bottom: 1px solid #ddd; padding: 3px 8px; text-align: right;">₹ ${sgstVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td style="border: none; border-bottom: 1px solid #ddd; padding: 3px 8px;">IGST @ 0%</td>
                  <td style="border: none; border-bottom: 1px solid #ddd; padding: 3px 8px; text-align: right;">₹ 0.00</td>
                </tr>
                ${bill.exchangePhone && bill.exchangePhone.valuation > 0 ? `
                  <tr>
                    <td style="border: none; border-bottom: 1px solid #ddd; padding: 3px 8px; color: #059669; font-weight: 700;">Less: Old Phone Trade-In (${escapeHTML(bill.exchangePhone.model || 'Device')})</td>
                    <td style="border: none; border-bottom: 1px solid #ddd; padding: 3px 8px; text-align: right; color: #059669; font-weight: 700;">- ₹ ${Number(bill.exchangePhone.valuation).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ` : ""}
                <tr>
                  <td style="border: none; border-bottom: 1.5px solid #000; padding: 3px 8px;">Round Off</td>
                  <td style="border: none; border-bottom: 1.5px solid #000; padding: 3px 8px; text-align: right;">₹ 0.00</td>
                </tr>
                <tr style="background: #fafafa;">
                  <td style="border: none; padding: 6px 8px; font-size: 12px; font-weight: 900;">GRAND TOTAL</td>
                  <td style="border: none; padding: 6px 8px; text-align: right; font-size: 13px; font-weight: 900;">₹ ${totalAmountVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              </table>
            </div>
          </div>

          <!-- ROW 5: BOTTOM FOOTER STRIP -->
          <div style="display: grid; grid-template-columns: 210px 1fr 200px; padding: 8px 12px; align-items: center;">
            <!-- Social / Contact -->
            <div>
              <div style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; margin-bottom: 3px;">Connect Us on:</div>
              <div style="display: flex; flex-direction: column; gap: 2px; font-size: 9.5px; font-weight: 600;">
                <div>📸 zeshtechbarh</div>
                <div>💬 7903746116</div>
                <div>📞 9122846271</div>
              </div>
            </div>

            <!-- Disclaimer & Thank you -->
            <div style="text-align: center; font-size: 9.5px; color: #222; line-height: 1.4;">
              <div>This is computer generated invoice does not require signature.</div>
              <div style="font-weight: 800; margin-top: 2px;">Thank You! Visit Again !!</div>
              <div style="font-size: 8px; color: #64748b; margin-top: 3px;">Engineered by Aman Raj • ZeshTech v4.4</div>
            </div>

            <!-- Authorized Signatory -->
            <div style="text-align: right;">
              <div style="font-size: 10px; font-weight: 600; margin-bottom: 4px;">Authorised Signatory</div>
              <div style="font-size: 17px; font-weight: 900; color: #a11414; letter-spacing: 0.5px;">ZESH TECH</div>
            </div>
          </div>

        </div>
      `;
    }
  }

  /* ==========================================================================
     Daily Cash Register & Galla Closing Summary Engine
     ========================================================================== */

  let currentDailyRegisterData = null;

  async function openDailyRegisterModal() {
    const modal = $("#modal-daily-register");
    if (!modal) return;
    modal.classList.add("active");

    const tbody = $("#galla-bills-tbody");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 12px; color: #94a3b8;">Loading today's cash & sales register...</td></tr>`;
    }

    try {
      const res = await zeshAPI.getDailyRegister();
      if (!res.success) {
        throw new Error(res.message || "Failed to load register");
      }
      currentDailyRegisterData = res;
      const s = res.summary || {};

      if ($("#galla-report-date-label")) {
        const todayStr = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
        $("#galla-report-date-label").textContent = `Date: ${todayStr}`;
      }

      if ($("#galla-cash-total")) $("#galla-cash-total").textContent = money(s.cashTotal || 0);
      if ($("#galla-upi-total")) $("#galla-upi-total").textContent = money(s.upiTotal || 0);
      if ($("#galla-card-total")) $("#galla-card-total").textContent = money(s.cardTotal || 0);
      if ($("#galla-finance-total")) $("#galla-finance-total").textContent = money(s.financeTotal || 0);

      if ($("#galla-units-total")) $("#galla-units-total").textContent = `${s.totalHandsetsSold || 0} Units`;
      if ($("#galla-bills-count")) $("#galla-bills-count").textContent = `${s.totalBills || 0} Invoices`;
      if ($("#galla-exchange-total")) $("#galla-exchange-total").textContent = `₹${(s.totalExchangeVal || 0).toLocaleString("en-IN")} Deducted`;
      if ($("#galla-gross-revenue")) $("#galla-gross-revenue").textContent = money(s.grossRevenue || 0);

      if (tbody) {
        if (!res.bills || res.bills.length === 0) {
          tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 16px; color: #64748b;">No bills generated today yet.</td></tr>`;
        } else {
          tbody.innerHTML = res.bills.map(b => {
            const timeStr = new Date(b.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
            return `
              <tr style="border-bottom: 1px solid #1e293b;">
                <td style="padding: 6px 10px; color: #38bdf8; font-weight: 700;">${escapeHTML(b.invoiceNumber)}</td>
                <td style="padding: 6px 10px; color: #e2e8f0;">${escapeHTML(b.customerName || 'Walk-in')} <span style="color:#64748b; font-size:10px;">(${timeStr})</span></td>
                <td style="padding: 6px 10px; color: #94a3b8;"><span style="background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; font-size: 10px;">${escapeHTML(b.paymentMode || 'Cash')}</span></td>
                <td style="padding: 6px 10px; text-align: right; color: #4ade80; font-weight: 700;">₹${Number(b.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            `;
          }).join("");
        }
      }
    } catch (err) {
      console.error("Failed to load daily register:", err);
      showToast(err.message || "Failed to load register", "error");
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 12px; color: #ef4444;">Error loading report: ${escapeHTML(err.message)}</td></tr>`;
      }
    }
  }

  function handleSendGallaWhatsApp() {
    if (!currentDailyRegisterData || !currentDailyRegisterData.summary) {
      showToast("No register summary available to send", "warning");
      return;
    }

    const s = currentDailyRegisterData.summary;
    const todayStr = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const ownerPhone = "917903746116"; // Zeeshan Telecom Owner WhatsApp

    const msg = 
`📊 *ZEESHAN TELECOM - DAILY GALLA CLOSING REPORT*
📅 *Date:* ${todayStr}

💵 *Cash in Galla:* ₹${Number(s.cashTotal || 0).toLocaleString("en-IN")}
📱 *UPI / PhonePe:* ₹${Number(s.upiTotal || 0).toLocaleString("en-IN")}
💳 *Card Swipes:* ₹${Number(s.cardTotal || 0).toLocaleString("en-IN")}
🏦 *Finance / Bajaj / TVS:* ₹${Number(s.financeTotal || 0).toLocaleString("en-IN")}
------------------------------
🏷️ *Total Sales Revenue:* ₹${Number(s.grossRevenue || 0).toLocaleString("en-IN")}
📦 *Total Handsets/Items Sold:* ${s.totalHandsetsSold || 0} Units
🧾 *Total Invoices Generated:* ${s.totalBills || 0}
🔄 *Old Phone Exchanges:* ₹${Number(s.totalExchangeVal || 0).toLocaleString("en-IN")}
------------------------------
_Automated Galla Report from ZeshTech Retail POS Engine_`;

    const encoded = encodeURIComponent(msg);
    const waUrl = `https://api.whatsapp.com/send?phone=${ownerPhone}&text=${encoded}`;
    window.open(waUrl, "_blank");
    showToast("Opening WhatsApp with Daily Galla summary...", "success");
  }

  /* ==========================================================================
     TAB 3: Inventory & Valuation Management
     ========================================================================== */

  async function loadInventoryView() {
    const tbody = $("#inventory-tbody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" style="padding:24px; text-align:center; color:var(--dark-text-muted);">Loading catalogue inventory &amp; asset valuation...</td></tr>`;

    try {
      const [res, statsRes] = await Promise.all([
        zeshAPI.getProducts({ limit: 100 }),
        zeshAPI.getInventoryStats().catch(() => ({ stats: {} }))
      ]);

      inventoryList = res.products || [];
      const stats = statsRes.stats || {};

      // Update Inventory Valuation Strip
      $("#val-total-items").textContent = `${stats.totalItems || inventoryList.length} items`;
      $("#val-total-units").textContent = `${stats.totalStockUnits || 0} units`;
      $("#val-cost-total").textContent = money(stats.costValuation || 0);
      $("#val-retail-total").textContent = money(stats.retailValuation || 0);

      renderInventoryTable();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" style="padding:24px; color:var(--danger);">${escapeHTML(err.message)}</td></tr>`;
    }
  }

  function renderInventoryTable() {
    const tbody = $("#inventory-tbody");
    const searchVal = ($("#inv-search-input")?.value || "").toLowerCase().trim();
    const categoryVal = $("#inv-category-select")?.value || "All";
    if (!tbody) return;

    let filtered = [...inventoryList];

    // Category filter
    if (categoryVal !== "All") {
      filtered = filtered.filter(p => p.category === categoryVal);
    }

    // Stock Health tab filter
    if (currentStockFilter === "in-stock") {
      filtered = filtered.filter(p => p.stockQuantity > 0);
    } else if (currentStockFilter === "low-stock") {
      filtered = filtered.filter(p => p.stockQuantity > 0 && p.stockQuantity <= (p.lowStockThreshold || 5));
    } else if (currentStockFilter === "out-of-stock") {
      filtered = filtered.filter(p => p.stockQuantity <= 0);
    }

    // Keyword search
    if (searchVal) {
      filtered = filtered.filter(p =>
        (p.name && p.name.toLowerCase().includes(searchVal)) ||
        (p.sku && p.sku.toLowerCase().includes(searchVal)) ||
        (p.barcode && p.barcode.toLowerCase().includes(searchVal))
      );
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="padding:30px; text-align:center; color:var(--dark-text-muted);">No products found matching filters.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(p => {
      const stock = Number(p.stockQuantity) || 0;
      const isOut = stock <= 0;
      const isLow = !isOut && stock <= (p.lowStockThreshold || 5);
      const cost = Number(p.purchasePrice) || 0;
      const price = Number(p.sellingPrice) || 0;
      const margin = price - cost;
      const marginPercent = price > 0 ? Math.round((margin / price) * 100) : 0;

      let stockBadge = `<span class="badge badge-success">${stock} in stock</span>`;
      if (isOut) stockBadge = `<span class="badge badge-danger">Out of Stock (0)</span>`;
      else if (isLow) stockBadge = `<span class="badge badge-warning">Low Stock (${stock})</span>`;

      return `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
          <td style="padding: 12px 10px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="position:relative; flex-shrink:0;">
                <img src="${p.imageUrl || '/images/logo.png'}" alt="" style="width: 42px; height: 42px; object-fit: contain; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); background: #020617; padding: 2px;" onerror="this.src='/images/logo.png'">
                ${(Array.isArray(p.images) && p.images.length > 1) ? `<span style="position:absolute; bottom:-3px; right:-3px; font-size:8.5px; background:#2563eb; color:#fff; border-radius:4px; padding:0 3px; font-weight:700;">${p.images.length}</span>` : ""}
              </div>
              <div>
                <strong style="color: white; font-size: 13px; display:block;">${escapeHTML(p.name)}</strong>
                <span style="font-family: var(--font-mono); font-size: 11px; color: var(--dark-text-muted);">SKU: ${escapeHTML(p.sku)}</span>
                ${(Array.isArray(p.images) && p.images.length > 1) ? `<span style="font-size: 10px; color: #38bdf8; font-weight: 700; margin-left: 6px;">• 📷 ${p.images.length} Photos</span>` : ""}
                ${p.serialNumber ? `<span style="font-family: var(--font-mono); font-size: 10px; color: #38bdf8; margin-left: 6px; font-weight: 700;">• S/N: ${escapeHTML(p.serialNumber)}</span>` : ""}
                ${(Array.isArray(p.imeiRecords) && p.imeiRecords.length > 1)
                  ? `<span style="font-family: var(--font-mono); font-size: 10px; color: #38bdf8; margin-left: 6px; font-weight: 700;">• 📱 ${p.imeiRecords.filter(r => r.status === 'In Stock').length} of ${p.imeiRecords.length} IMEIs in Stock</span>`
                  : (p.imei1 ? `<span style="font-family: var(--font-mono); font-size: 10px; color: #94a3b8; margin-left: 6px;">• IMEI: ${escapeHTML(p.imei1)}</span>` : "")}
              </div>
            </div>
          </td>
          <td style="padding: 12px 10px; color: #94a3b8;">${escapeHTML(p.category)}</td>
          <td style="padding: 12px 10px; color: var(--dark-text-muted);">${money(cost)}</td>
          <td style="padding: 12px 10px; font-weight: 700; color: white;">${money(price)}</td>
          <td style="padding: 12px 10px; color: ${margin >= 0 ? '#10b981' : '#f87171'}; font-weight:600;">
            ${money(margin)} (${marginPercent}%)
          </td>
          <td style="padding: 12px 10px;">${stockBadge}</td>
          <td style="padding: 12px 10px; text-align: right;">
            <div style="display:flex; justify-content:flex-end; gap:6px;">
              <button class="btn btn-dark btn-small stock-adjust-trigger" data-id="${p._id}" data-name="${escapeHTML(p.name)}" data-stock="${stock}" title="Adjust Stock">
                +/- Stock
              </button>
              <button class="btn btn-dark btn-small product-edit-trigger" data-id="${p._id}" title="Edit Product Details">
                Edit
              </button>
              <button class="btn btn-dark btn-small product-delete-trigger" data-id="${p._id}" data-name="${escapeHTML(p.name)}" style="color:#f87171;" title="Deactivate Product">
                ✕
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  // CSV Exporter Helper
  function exportToCsv(filename, rows) {
    const processRow = (row) =>
      row.map(val => {
        let text = (val === null || val === undefined) ? "" : String(val);
        text = text.replace(/"/g, '""');
        return `"${text}"`;
      }).join(",");

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(processRow).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filename}`, "success");
  }

  function exportInventoryCsv() {
    if (inventoryList.length === 0) {
      showToast("No inventory items to export", "warning");
      return;
    }

    const rows = [
      ["SKU", "Product Name", "Category", "Brand", "Model", "Purchase Price (CP)", "Selling Price (MRP)", "Stock Units", "Total Cost Value", "Total Retail Value"]
    ];

    inventoryList.forEach(p => {
      const cost = p.purchasePrice || 0;
      const price = p.sellingPrice || 0;
      const stock = p.stockQuantity || 0;
      rows.push([
        p.sku,
        p.name,
        p.category,
        p.brand,
        p.model,
        cost,
        price,
        stock,
        cost * stock,
        price * stock
      ]);
    });

    exportToCsv(`zeshtech-inventory-${Date.now()}.csv`, rows);
  }

  // Stock Adjustment Modal
  function openStockModal(productId, productName, currentStock) {
    $("#stock-modal-prod-id").value = productId;
    $("#stock-modal-prod-name").textContent = `Adjust Stock: ${productName}`;
    $("#stock-modal-current-qty").textContent = currentStock;
    $("#stock-adjust-amount").value = "5";
    $("#admin-stock-modal")?.classList.add("active");
  }

  async function handleStockAdjustSubmit(e) {
    e.preventDefault();
    const btn = $("#stock-adjust-submit-btn");
    const id = $("#stock-modal-prod-id").value;
    const action = $("#stock-adjust-action").value;
    const amount = parseInt($("#stock-adjust-amount").value, 10);

    if (!amount || amount <= 0) {
      showToast("Please enter a valid whole number", "warning");
      return;
    }

    const change = action === "add" ? amount : -amount;

    try {
      btn.disabled = true;
      btn.textContent = "Updating MongoDB...";

      await zeshAPI.updateStock(id, change);
      showToast("Stock updated successfully!", "success");

      $("#admin-stock-modal")?.classList.remove("active");
      loadInventoryView();
      loadOverview();
    } catch (err) {
      showToast(err.message || "Failed to update stock", "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Apply Stock Adjustment";
    }
  }

  // Image File Management State for Admin
  let addProductImageFiles = [];
  let editProductImageFiles = [];
  let editProductExistingImages = [];

  // Multi-Unit Handset IMEI State for Multi-Stock Inventory
  let addProdExtraUnits = [];
  let editProdExtraUnits = [];

  function renderAddProductImeiUnits() {
    const container = $("#add-prod-extra-units-container");
    const summary = $("#add-prod-units-summary");
    if (!container) return;

    if (addProdExtraUnits.length === 0) {
      container.innerHTML = "";
      if (summary) summary.textContent = "1 Handset configured (Unit #1)";
      return;
    }

    if (summary) {
      summary.textContent = `${1 + addProdExtraUnits.length} Handsets configured (${1 + addProdExtraUnits.length} Units)`;
    }

    container.innerHTML = addProdExtraUnits.map((u, idx) => `
      <div class="extra-unit-card" style="background:#070c18; border:1px solid #1e293b; border-radius:8px; padding:8px 10px; margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <div style="font-size:11.5px; font-weight:700; color:#38bdf8; display:flex; align-items:center; gap:6px;">
            <span>📱 Handset Unit #${idx + 2}</span>
            <span class="badge badge-success" style="font-size:9px; padding:1px 5px;">In Stock</span>
          </div>
          <button type="button" class="btn btn-dark btn-small remove-add-unit-btn" data-id="${u.id}" style="color:#f87171; font-size:11px; padding:2px 6px;">✕ Remove</button>
        </div>
        <div class="form-row-3" style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px;">
          <div class="field" style="margin-bottom:0;">
            <label style="color:#cbd5e1; font-size:10px; display:flex; justify-content:space-between;">
              <span>Serial (S/N)</span>
              <span class="btn-scan-field" data-target="add-unit-${u.id}-serial" data-label="Unit #${idx + 2} S/N" style="color:#38bdf8; cursor:pointer; font-size:10px;">📷 Scan</span>
            </label>
            <div style="display:flex; gap:4px;">
              <input type="text" id="add-unit-${u.id}-serial" value="${escapeHTML(u.serialNumber || '')}" placeholder="Unit #${idx + 2} S/N" style="background:#090d16; border-color:var(--dark-border); color:#38bdf8; font-family:var(--font-mono); font-size:11px; flex:1;">
              <button type="button" class="btn btn-secondary btn-scan-field" data-target="add-unit-${u.id}-serial" data-label="Unit #${idx + 2} S/N" style="padding:0 7px; background:#1e293b; border-color:#38bdf8; color:#38bdf8; font-size:11px;">📷</button>
            </div>
          </div>
          <div class="field" style="margin-bottom:0;">
            <label style="color:#cbd5e1; font-size:10px; display:flex; justify-content:space-between;">
              <span>IMEI 1</span>
              <span class="btn-scan-field" data-target="add-unit-${u.id}-imei1" data-label="Unit #${idx + 2} IMEI 1" style="color:#60a5fa; cursor:pointer; font-size:10px;">📷 Scan</span>
            </label>
            <div style="display:flex; gap:4px;">
              <input type="text" id="add-unit-${u.id}-imei1" value="${escapeHTML(u.imei1 || '')}" placeholder="Unit #${idx + 2} IMEI 1" style="background:#090d16; border-color:var(--dark-border); color:white; font-family:var(--font-mono); font-size:11px; flex:1;">
              <button type="button" class="btn btn-secondary btn-scan-field" data-target="add-unit-${u.id}-imei1" data-label="Unit #${idx + 2} IMEI 1" style="padding:0 7px; background:#1e293b; border-color:#3b82f6; color:#60a5fa; font-size:11px;">📷</button>
            </div>
          </div>
          <div class="field" style="margin-bottom:0;">
            <label style="color:#cbd5e1; font-size:10px; display:flex; justify-content:space-between;">
              <span>IMEI 2</span>
              <span class="btn-scan-field" data-target="add-unit-${u.id}-imei2" data-label="Unit #${idx + 2} IMEI 2" style="color:#60a5fa; cursor:pointer; font-size:10px;">📷 Scan</span>
            </label>
            <div style="display:flex; gap:4px;">
              <input type="text" id="add-unit-${u.id}-imei2" value="${escapeHTML(u.imei2 || '')}" placeholder="Unit #${idx + 2} IMEI 2" style="background:#090d16; border-color:var(--dark-border); color:white; font-family:var(--font-mono); font-size:11px; flex:1;">
              <button type="button" class="btn btn-secondary btn-scan-field" data-target="add-unit-${u.id}-imei2" data-label="Unit #${idx + 2} IMEI 2" style="padding:0 7px; background:#1e293b; border-color:#3b82f6; color:#60a5fa; font-size:11px;">📷</button>
            </div>
          </div>
        </div>
      </div>
    `).join("");

    container.querySelectorAll(".remove-add-unit-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const uid = btn.dataset.id;
        addProdExtraUnits = addProdExtraUnits.filter(u => u.id !== uid);
        renderAddProductImeiUnits();
      });
    });
  }

  function renderEditProductImeiUnits() {
    const container = $("#edit-prod-extra-units-container");
    const summary = $("#edit-prod-units-summary");
    if (!container) return;

    if (editProdExtraUnits.length === 0) {
      container.innerHTML = "";
      if (summary) summary.textContent = "1 Handset configured (Unit #1)";
      return;
    }

    if (summary) {
      summary.textContent = `${1 + editProdExtraUnits.length} Handsets configured (${1 + editProdExtraUnits.length} Units)`;
    }

    container.innerHTML = editProdExtraUnits.map((u, idx) => {
      const isSold = u.status === "Sold";
      return `
        <div class="extra-unit-card" style="background:#070c18; border:1px solid ${isSold ? 'rgba(239, 68, 68, 0.4)' : '#1e293b'}; border-radius:8px; padding:8px 10px; margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <div style="font-size:11.5px; font-weight:700; color:#38bdf8; display:flex; align-items:center; gap:6px;">
              <span>📱 Handset Unit #${idx + 2}</span>
              ${isSold
                ? `<span class="badge badge-danger" style="font-size:9px; padding:1px 5px; background:#ef4444; color:#fff;">Sold on Bill #${escapeHTML(u.soldBillNumber || 'N/A')}</span>`
                : `<span class="badge badge-success" style="font-size:9px; padding:1px 5px;">In Stock</span>`}
            </div>
            ${!isSold ? `
              <button type="button" class="btn btn-dark btn-small remove-edit-unit-btn" data-id="${u.id}" style="color:#f87171; font-size:11px; padding:2px 6px;">✕ Remove</button>
            ` : `<span style="font-size:10px; color:#94a3b8;">Locked (Sold)</span>`}
          </div>
          <div class="form-row-3" style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px;">
            <div class="field" style="margin-bottom:0;">
              <label style="color:#cbd5e1; font-size:10px; display:flex; justify-content:space-between;">
                <span>Serial (S/N)</span>
                ${!isSold ? `<span class="btn-scan-field" data-target="edit-unit-${u.id}-serial" data-label="Unit #${idx + 2} S/N" style="color:#38bdf8; cursor:pointer; font-size:10px;">📷 Scan</span>` : ''}
              </label>
              <div style="display:flex; gap:4px;">
                <input type="text" id="edit-unit-${u.id}-serial" value="${escapeHTML(u.serialNumber || '')}" ${isSold ? 'readonly style="background:#111827; opacity:0.7;"' : 'style="background:#090d16;"'} placeholder="Unit #${idx + 2} S/N" style="border-color:var(--dark-border); color:#38bdf8; font-family:var(--font-mono); font-size:11px; flex:1;">
                ${!isSold ? `<button type="button" class="btn btn-secondary btn-scan-field" data-target="edit-unit-${u.id}-serial" data-label="Unit #${idx + 2} S/N" style="padding:0 7px; background:#1e293b; border-color:#38bdf8; color:#38bdf8; font-size:11px;">📷</button>` : ''}
              </div>
            </div>
            <div class="field" style="margin-bottom:0;">
              <label style="color:#cbd5e1; font-size:10px; display:flex; justify-content:space-between;">
                <span>IMEI 1</span>
                ${!isSold ? `<span class="btn-scan-field" data-target="edit-unit-${u.id}-imei1" data-label="Unit #${idx + 2} IMEI 1" style="color:#60a5fa; cursor:pointer; font-size:10px;">📷 Scan</span>` : ''}
              </label>
              <div style="display:flex; gap:4px;">
                <input type="text" id="edit-unit-${u.id}-imei1" value="${escapeHTML(u.imei1 || '')}" ${isSold ? 'readonly style="background:#111827; opacity:0.7;"' : 'style="background:#090d16;"'} placeholder="Unit #${idx + 2} IMEI 1" style="border-color:var(--dark-border); color:white; font-family:var(--font-mono); font-size:11px; flex:1;">
                ${!isSold ? `<button type="button" class="btn btn-secondary btn-scan-field" data-target="edit-unit-${u.id}-imei1" data-label="Unit #${idx + 2} IMEI 1" style="padding:0 7px; background:#1e293b; border-color:#3b82f6; color:#60a5fa; font-size:11px;">📷</button>` : ''}
              </div>
            </div>
            <div class="field" style="margin-bottom:0;">
              <label style="color:#cbd5e1; font-size:10px; display:flex; justify-content:space-between;">
                <span>IMEI 2</span>
                ${!isSold ? `<span class="btn-scan-field" data-target="edit-unit-${u.id}-imei2" data-label="Unit #${idx + 2} IMEI 2" style="color:#60a5fa; cursor:pointer; font-size:10px;">📷 Scan</span>` : ''}
              </label>
              <div style="display:flex; gap:4px;">
                <input type="text" id="edit-unit-${u.id}-imei2" value="${escapeHTML(u.imei2 || '')}" ${isSold ? 'readonly style="background:#111827; opacity:0.7;"' : 'style="background:#090d16;"'} placeholder="Unit #${idx + 2} IMEI 2" style="border-color:var(--dark-border); color:white; font-family:var(--font-mono); font-size:11px; flex:1;">
                ${!isSold ? `<button type="button" class="btn btn-secondary btn-scan-field" data-target="edit-unit-${u.id}-imei2" data-label="Unit #${idx + 2} IMEI 2" style="padding:0 7px; background:#1e293b; border-color:#3b82f6; color:#60a5fa; font-size:11px;">📷</button>` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join("");

    container.querySelectorAll(".remove-edit-unit-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const uid = btn.dataset.id;
        editProdExtraUnits = editProdExtraUnits.filter(u => u.id !== uid);
        renderEditProductImeiUnits();
      });
    });
  }

  function renderAddProductImagesPreview() {
    const previewBox = $("#add-product-files-preview");
    const countLabel = $("#add-prod-file-count");
    const clearBtn = $("#add-prod-clear-files-btn");
    const urlInput = $("#add-product-img-url");
    if (!previewBox) return;
    previewBox.innerHTML = "";

    if (countLabel) {
      countLabel.textContent = `${addProductImageFiles.length} photo${addProductImageFiles.length === 1 ? "" : "s"} selected`;
    }
    if (clearBtn) {
      clearBtn.style.display = addProductImageFiles.length > 0 ? "inline-block" : "none";
    }

    addProductImageFiles.forEach((file, index) => {
      const wrap = document.createElement("div");
      wrap.style.cssText = "position:relative; width:72px; height:72px; border-radius:10px; overflow:hidden; border:2px solid " + (index === 0 ? "#3b82f6" : "#334155") + "; background:#020617; flex-shrink:0; cursor:pointer; box-shadow:0 4px 10px rgba(0,0,0,0.3);";
      wrap.title = index === 0 ? "Cover Photo (Primary)" : "Click to set as Cover Photo";

      const isPrimary = index === 0;

      const img = document.createElement("img");
      img.style.cssText = "width:100%; height:100%; object-fit:contain; padding:4px;";
      const reader = new FileReader();
      reader.onload = (ev) => { img.src = ev.target.result; };
      reader.readAsDataURL(file);

      // Click to make this image Cover photo
      wrap.onclick = () => {
        if (index > 0) {
          const [selected] = addProductImageFiles.splice(index, 1);
          addProductImageFiles.unshift(selected);
          renderAddProductImagesPreview();
          showToast(`Photo #${index + 1} set as Primary Cover Photo`, "info");
        }
      };

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.textContent = "✕";
      delBtn.title = "Remove this photo";
      delBtn.style.cssText = "position:absolute; top:3px; right:3px; width:20px; height:20px; border-radius:50%; background:#ef4444; color:#fff; border:none; font-size:11px; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; line-height:1; z-index:3;";
      delBtn.onclick = (e) => {
        e.stopPropagation();
        addProductImageFiles.splice(index, 1);
        renderAddProductImagesPreview();
      };

      const badge = document.createElement("span");
      badge.textContent = isPrimary ? "★ Cover" : `#${index + 1}`;
      badge.style.cssText = `position:absolute; bottom:3px; left:3px; font-size:9px; background:${isPrimary ? '#2563eb' : 'rgba(15,23,42,0.85)'}; color:#fff; padding:1px 5px; border-radius:4px; font-weight:700; z-index:2;`;

      wrap.appendChild(img);
      wrap.appendChild(delBtn);
      wrap.appendChild(badge);
      previewBox.appendChild(wrap);
    });
  }

  function renderEditProductImagesPreview() {
    const existingBox = $("#edit-product-existing-preview");
    const newBox = $("#edit-product-files-preview");
    const countLabel = $("#edit-prod-file-count");
    const clearBtn = $("#edit-prod-clear-files-btn");

    if (countLabel) {
      countLabel.textContent = `${editProductImageFiles.length} new photo(s)`;
    }
    if (clearBtn) {
      clearBtn.style.display = editProductImageFiles.length > 0 ? "inline-block" : "none";
    }

    if (existingBox) {
      existingBox.innerHTML = "";
      if (editProductExistingImages.length === 0) {
        existingBox.innerHTML = `<span style="font-size:11px; color:#64748b;">No stored photos</span>`;
      } else {
        editProductExistingImages.forEach((imgUrl, index) => {
          const wrap = document.createElement("div");
          wrap.style.cssText = "position:relative; width:68px; height:68px; border-radius:10px; overflow:hidden; border:2px solid " + (index === 0 ? "#2563eb" : "#334155") + "; background:#020617; flex-shrink:0; cursor:pointer;";
          wrap.title = index === 0 ? "Cover Photo" : "Click to make Cover Photo";
          wrap.innerHTML = `
            <img src="${escapeHTML(imgUrl)}" style="width:100%; height:100%; object-fit:contain; padding:4px;" onerror="this.src='/images/logo.png'">
            <span style="position:absolute; bottom:3px; left:3px; font-size:9px; background:${index === 0 ? '#2563eb' : 'rgba(15,23,42,0.85)'}; color:#fff; padding:1px 4px; border-radius:4px; font-weight:700;">${index === 0 ? '★ Cover' : '#' + (index + 1)}</span>
          `;

          wrap.onclick = () => {
            if (index > 0) {
              const [selected] = editProductExistingImages.splice(index, 1);
              editProductExistingImages.unshift(selected);
              if ($("#edit-prod-image")) $("#edit-prod-image").value = selected;
              renderEditProductImagesPreview();
              showToast(`Photo #${index + 1} set as Primary Cover Photo`, "info");
            }
          };

          const delBtn = document.createElement("button");
          delBtn.type = "button";
          delBtn.textContent = "✕";
          delBtn.title = "Delete this image";
          delBtn.style.cssText = "position:absolute; top:3px; right:3px; width:18px; height:18px; border-radius:50%; background:#ef4444; color:#fff; border:none; font-size:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; z-index:3;";
          delBtn.onclick = (e) => {
            e.stopPropagation();
            editProductExistingImages.splice(index, 1);
            if ($("#edit-prod-image")) {
              $("#edit-prod-image").value = editProductExistingImages[0] || "";
            }
            renderEditProductImagesPreview();
          };
          wrap.appendChild(delBtn);
          existingBox.appendChild(wrap);
        });
      }
    }

    if (newBox) {
      newBox.innerHTML = "";
      editProductImageFiles.forEach((file, index) => {
        const wrap = document.createElement("div");
        wrap.style.cssText = "position:relative; width:68px; height:68px; border-radius:10px; overflow:hidden; border:2px dashed #38bdf8; background:#020617; flex-shrink:0;";
        const img = document.createElement("img");
        img.style.cssText = "width:100%; height:100%; object-fit:contain; padding:4px;";
        const reader = new FileReader();
        reader.onload = (ev) => { img.src = ev.target.result; };
        reader.readAsDataURL(file);

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.textContent = "✕";
        delBtn.style.cssText = "position:absolute; top:3px; right:3px; width:18px; height:18px; border-radius:50%; background:#ef4444; color:#fff; border:none; font-size:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; z-index:3;";
        delBtn.onclick = (e) => {
          e.stopPropagation();
          editProductImageFiles.splice(index, 1);
          renderEditProductImagesPreview();
        };

        const badge = document.createElement("span");
        badge.textContent = "+New";
        badge.style.cssText = "position:absolute; bottom:3px; left:3px; font-size:9px; background:#10b981; color:#fff; padding:1px 4px; border-radius:4px; font-weight:700;";

        wrap.appendChild(img);
        wrap.appendChild(delBtn);
        wrap.appendChild(badge);
        newBox.appendChild(wrap);
      });
    }
  }

  // Add Product Form
  async function handleAddProductSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const btn = $("#add-product-submit-btn");
    const errBox = $("#add-product-error");

    if (!zeshAPI.getToken()) {
      showToast("Please log in to your Admin account first", "error");
      showLoginScreen();
      return;
    }

    const formData = new FormData(form);
    const productPayload = {
      name: formData.get("name")?.trim(),
      sku: formData.get("sku")?.trim().toUpperCase(),
      category: formData.get("category"),
      brand: formData.get("brand")?.trim() || "",
      model: formData.get("model")?.trim() || "",
      serialNumber: formData.get("serialNumber")?.trim() || "",
      imei1: formData.get("imei1")?.trim() || "",
      imei2: formData.get("imei2")?.trim() || "",
      purchasePrice: parseFloat(formData.get("purchasePrice")),
      sellingPrice: parseFloat(formData.get("sellingPrice")),
      stockQuantity: parseInt(formData.get("stockQuantity"), 10),
      description: formData.get("description")?.trim() || "",
      imageUrl: formData.get("imageUrl")?.trim() || "",
      images: []
    };

    // Multi-unit IMEI collection for multi-stock phones
    const allImeis = [];
    const u1_imei1 = formData.get("imei1")?.trim() || "";
    const u1_imei2 = formData.get("imei2")?.trim() || "";
    const u1_sn = formData.get("serialNumber")?.trim() || "";
    if (u1_imei1 || u1_imei2 || u1_sn) {
      allImeis.push({ imei1: u1_imei1, imei2: u1_imei2, serialNumber: u1_sn, status: "In Stock" });
    }
    addProdExtraUnits.forEach(u => {
      const i1 = $(`#add-unit-${u.id}-imei1`)?.value.trim() || "";
      const i2 = $(`#add-unit-${u.id}-imei2`)?.value.trim() || "";
      const sn = $(`#add-unit-${u.id}-serial`)?.value.trim() || "";
      if (i1 || i2 || sn) {
        allImeis.push({ imei1: i1, imei2: i2, serialNumber: sn, status: "In Stock" });
      }
    });
    if (allImeis.length > 0) {
      productPayload.imeiRecords = allImeis;
    }

    if (!productPayload.name) {
      showToast("Product name is required", "error");
      return;
    }
    if (!productPayload.sku) {
      showToast("SKU is required", "error");
      return;
    }
    if (isNaN(productPayload.sellingPrice)) {
      showToast("Valid retail price is required", "error");
      return;
    }

    try {
      btn.disabled = true;
      btn.textContent = "Saving to Catalogue...";
      if (errBox) errBox.classList.add("hidden");

      // Check if user selected photos via the multi-file manager or file input
      if (addProductImageFiles.length > 0) {
        btn.textContent = `Uploading ${addProductImageFiles.length} photo(s)...`;
        const uploadRes = await zeshAPI.uploadProductImages(addProductImageFiles);
        if (uploadRes && uploadRes.imageUrls && uploadRes.imageUrls.length > 0) {
          productPayload.images = uploadRes.imageUrls;
          if (!productPayload.imageUrl || productPayload.imageUrl.startsWith("blob:")) {
            productPayload.imageUrl = uploadRes.imageUrls[0];
          }
        }
      } else {
        const fileInput = $("#add-product-file-input");
        if (fileInput && fileInput.files && fileInput.files.length > 0) {
          btn.textContent = `Uploading ${fileInput.files.length} photo(s)...`;
          const uploadRes = await zeshAPI.uploadProductImages(fileInput.files);
          if (uploadRes && uploadRes.imageUrls && uploadRes.imageUrls.length > 0) {
            productPayload.images = uploadRes.imageUrls;
            if (!productPayload.imageUrl || productPayload.imageUrl.startsWith("blob:")) {
              productPayload.imageUrl = uploadRes.imageUrls[0];
            }
          }
        }
      }

      // Ensure imageUrl and images array are in sync
      if (productPayload.imageUrl) {
        if (!productPayload.images.includes(productPayload.imageUrl)) {
          productPayload.images.unshift(productPayload.imageUrl);
        }
      } else if (productPayload.images.length > 0) {
        productPayload.imageUrl = productPayload.images[0];
      }

      await zeshAPI.addProduct(productPayload);
      showToast(`Product "${productPayload.name}" created!`, "success");

      form.reset();
      addProductImageFiles = [];
      addProdExtraUnits = [];
      renderAddProductImagesPreview();
      renderAddProductImeiUnits();
      $("#admin-add-product-modal")?.classList.remove("active");
      loadInventoryView();
      loadOverview();

    } catch (err) {
      console.error("Add product failed:", err);
      if (errBox) {
        errBox.textContent = err.message || "Failed to add product.";
        errBox.classList.remove("hidden");
      }
      showToast(err.message || "Failed to add product", "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Save to Catalogue";
    }
  }

  function openEditProductModal(productId) {
    const product = inventoryList.find(p => p._id === productId);
    if (!product) return;

    $("#edit-product-id").value = product._id;
    $("#edit-prod-name").value = product.name || "";
    $("#edit-prod-sku").value = product.sku || "";
    $("#edit-prod-category").value = product.category || "Mobile";
    $("#edit-prod-brand").value = product.brand || "";
    $("#edit-prod-model").value = product.model || "";
    if ($("#edit-prod-serial")) $("#edit-prod-serial").value = product.serialNumber || "";
    if ($("#edit-prod-imei1")) $("#edit-prod-imei1").value = product.imei1 || "";
    if ($("#edit-prod-imei2")) $("#edit-prod-imei2").value = product.imei2 || "";
    $("#edit-prod-cost").value = product.purchasePrice || 0;
    $("#edit-prod-price").value = product.sellingPrice || 0;
    $("#edit-prod-image").value = product.imageUrl || "";
    $("#edit-prod-desc").value = product.description || "";

    // Load existing images (include both images array and imageUrl)
    const combined = [
      product.imageUrl,
      ...(Array.isArray(product.images) ? product.images : [])
    ].filter(Boolean);
    editProductExistingImages = Array.from(new Set(combined));
    editProductImageFiles = [];
    renderEditProductImagesPreview();

    // Multi-unit IMEI loading
    editProdExtraUnits = [];
    if (Array.isArray(product.imeiRecords) && product.imeiRecords.length > 0) {
      const first = product.imeiRecords[0];
      if ($("#edit-prod-imei1")) $("#edit-prod-imei1").value = first.imei1 || "";
      if ($("#edit-prod-imei2")) $("#edit-prod-imei2").value = first.imei2 || "";
      if ($("#edit-prod-serial")) $("#edit-prod-serial").value = first.serialNumber || "";

      for (let i = 1; i < product.imeiRecords.length; i++) {
        const r = product.imeiRecords[i];
        editProdExtraUnits.push({
          id: "edit_u_" + Date.now() + "_" + i,
          imei1: r.imei1 || "",
          imei2: r.imei2 || "",
          serialNumber: r.serialNumber || "",
          status: r.status || "In Stock",
          soldBillNumber: r.soldBillNumber || null,
          soldDate: r.soldDate || null
        });
      }
    }
    renderEditProductImeiUnits();

    $("#admin-edit-product-modal")?.classList.add("active");
  }

  async function handleEditProductSubmit(e) {
    e.preventDefault();
    const btn = $("#edit-product-submit-btn");
    const id = $("#edit-product-id").value;

    if (!zeshAPI.getToken()) {
      showToast("Please log in to your Admin account first", "error");
      showLoginScreen();
      return;
    }

    const updates = {
      name: $("#edit-prod-name").value.trim(),
      category: $("#edit-prod-category").value,
      brand: $("#edit-prod-brand").value.trim(),
      model: $("#edit-prod-model").value.trim(),
      serialNumber: $("#edit-prod-serial")?.value.trim() || "",
      imei1: $("#edit-prod-imei1")?.value.trim() || "",
      imei2: $("#edit-prod-imei2")?.value.trim() || "",
      purchasePrice: parseFloat($("#edit-prod-cost").value) || 0,
      sellingPrice: parseFloat($("#edit-prod-price").value) || 0,
      imageUrl: $("#edit-prod-image").value.trim(),
      description: $("#edit-prod-desc").value.trim(),
      images: [...editProductExistingImages]
    };

    // Reconstruct full multi-unit imeiRecords array
    const imeiRecords = [];
    const u1_imei1 = $("#edit-prod-imei1")?.value.trim() || "";
    const u1_imei2 = $("#edit-prod-imei2")?.value.trim() || "";
    const u1_sn = $("#edit-prod-serial")?.value.trim() || "";
    const targetProd = inventoryList.find(p => p._id === id);
    const firstRec = (targetProd && targetProd.imeiRecords && targetProd.imeiRecords[0]) ? targetProd.imeiRecords[0] : null;

    if (u1_imei1 || u1_imei2 || u1_sn || firstRec) {
      imeiRecords.push({
        imei1: u1_imei1,
        imei2: u1_imei2,
        serialNumber: u1_sn,
        status: firstRec?.status || "In Stock",
        soldBillNumber: firstRec?.soldBillNumber || null,
        soldDate: firstRec?.soldDate || null
      });
    }

    editProdExtraUnits.forEach(u => {
      const i1 = $(`#edit-unit-${u.id}-imei1`)?.value.trim() || u.imei1 || "";
      const i2 = $(`#edit-unit-${u.id}-imei2`)?.value.trim() || u.imei2 || "";
      const sn = $(`#edit-unit-${u.id}-serial`)?.value.trim() || u.serialNumber || "";
      if (i1 || i2 || sn || u.status === "Sold") {
        imeiRecords.push({
          imei1: i1,
          imei2: i2,
          serialNumber: sn,
          status: u.status || "In Stock",
          soldBillNumber: u.soldBillNumber || null,
          soldDate: u.soldDate || null
        });
      }
    });

    updates.imeiRecords = imeiRecords;

    try {
      btn.disabled = true;
      btn.textContent = "Updating...";

      // Upload newly added files if any
      if (editProductImageFiles.length > 0) {
        btn.textContent = `Uploading ${editProductImageFiles.length} new photo(s)...`;
        const uploadRes = await zeshAPI.uploadProductImages(editProductImageFiles);
        if (uploadRes && uploadRes.imageUrls) {
          updates.images = [...updates.images, ...uploadRes.imageUrls];
        }
      }

      // De-duplicate images
      updates.images = Array.from(new Set(updates.images.filter(Boolean)));

      if (!updates.imageUrl && updates.images.length > 0) {
        updates.imageUrl = updates.images[0];
      }
      if (updates.imageUrl && !updates.images.includes(updates.imageUrl)) {
        updates.images.unshift(updates.imageUrl);
      }

      await zeshAPI.updateProduct(id, updates);
      showToast("Product updated successfully!", "success");

      $("#admin-edit-product-modal")?.classList.remove("active");
      loadInventoryView();
      if (typeof loadPosView === "function") loadPosView();
      if (typeof loadOverview === "function") loadOverview();
    } catch (err) {
      showToast(err.message || "Failed to update product", "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Update Product Information";
    }
  }

  /* ==========================================================================
     Live Camera Barcode & IMEI Scanner Controller (Triple Engine: Native + Quagga2 + Html5Qrcode)
     ========================================================================== */

  // Loud, crisp POS barcode scanner beep (dual WebAudio oscillator + 8-bit WAV audio fallback)
  const POS_BEEP_WAV_BASE64 = "data:audio/wav;base64,UklGRuQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YcADAACA9qUVOdThSQ2S+JINSeHUORWl9oAJWurGKx628m0IbfK2HivG6loJf/alFTnU4UkNkviSDUnh1DkVpfaACVrqxisetvJtCG3yth4rxupaCX/2pRU51OFJDZL4kg1J4dQ5FaX2gAla6sYrHrbybQht8rYeK8bqWgl/9qUVOdThSQ2S+JINSeHUORWl9n8JWurGKx628m0IbfK2HivG6loJf/alFTnU4UkNkviSDUnh1DkVpfaACVrqxisetvJtCG3yth4rxupaCX/2pRU51OFJDZL4kg1J4dQ5FaX2fwla6sYrHrbybQht8rYeK8bqWgl/9qUVOdThSQ2S+JINSeHUORWl9oAJWurGKx628m0IbfK2HivG6loJgPalFTnU4UkNkviSDUnh1DkVpfaACVrqxisetvJtCG3yth4rxupaCX/2pRU51OFJDZL4kg1J4dQ5FaX2gAla6sYrHrbybQht8rYeK8bqWgl/9qUVOdThSQ2S+JINSeHUORWl9oAJWurGKx628m0IbfK2HivG6loJf/alFTnU4UkNkviSDUnh1DkVpfaACVrqxisetvJtCG3yth4rxupaCYD2pRU51OFJDZL4kg1J4dQ5FaX2fwla6sYrHrbybQht8rYeK8bqWgl/9qUVOdThSQ2S+JINSeHUORWl9oAJWurGKx628m0IbfK2HivG6loJf/alFTnU4UkNkviSDUnh1DkVpfaACVrqxisetvJtCG3yth4rxupaCYD2pRU51OFJDZL4kg1J4dQ5FaX2gAla6sYrHrbybQht8rYeK8bqWgl/9qUVOdThSQ2S+JINSeHUORWl9oAJWurGKx628m0IbfK2HivG6loJf/alFTnU4UkNkviSDUnh1DkVpfaACVrqxisetvJtCG3yth4rxupaCX/2pRU51OFJDZL4kg1J4dQ5FaX2gAla6sYrHrbybQht8rYeK8bqWgl/9qUVOdThSQ2S+JINSeHUORWl9oAJWurGKx628m0IbfK2HivG6loJf/alFTnU4UkNkviSDUnh1DkVpfaACVrqxisetvJtCG3yth4rxupaCX/2pRU51OFJDZL4kg1J4dQ5FaX2gAla6sYrHrbybQht8rYeK8bqWgl/9qUVOdThSQ2S+JINSeHUORWl9oAJWurGKx628m0IbfK2HivG6loJgPalFTnU4UkNkviSDUnh1DkVpfZ/CVrqxisetvJtCG3yth4rxupaCYD2pRU51OFJDZL4kg1J4dQ5FaX2gAla6sYrHrbybQht8rYeK8bqWgk=";
  let scanAudioCtx = null;

  function initScanAudio() {
    try {
      if (!scanAudioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) scanAudioCtx = new AudioCtx();
      }
      if (scanAudioCtx && scanAudioCtx.state === "suspended") {
        scanAudioCtx.resume();
      }
    } catch (e) {}
  }

  function playScanBeep() {
    // 1. Web Audio Frequency Chirp (High pitch POS chime)
    try {
      initScanAudio();
      if (scanAudioCtx) {
        const osc = scanAudioCtx.createOscillator();
        const gain = scanAudioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1900, scanAudioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(2500, scanAudioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.5, scanAudioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, scanAudioCtx.currentTime + 0.16);
        osc.connect(gain);
        gain.connect(scanAudioCtx.destination);
        osc.start(scanAudioCtx.currentTime);
        osc.stop(scanAudioCtx.currentTime + 0.16);
      }
    } catch (e) {}

    // 2. Guaranteed Audio Element Fallback
    try {
      const audio = new Audio(POS_BEEP_WAV_BASE64);
      audio.volume = 0.9;
      audio.play().catch(() => {});
    } catch (e) {}

    // 3. Physical Haptic Vibration Feedback on Mobile Devices
    try {
      if (navigator.vibrate) {
        navigator.vibrate([70, 30, 70]);
      }
    } catch (e) {}
  }

  let html5QrCodeScanner = null;
  let currentScannerTargetFieldId = null;
  let currentScannerTargetLabel = "";
  let currentScannerMode = "field"; // "field", "smart-box", or "pos"
  let currentScannerContext = "add"; // "add" or "edit"
  let currentCameraFacing = "environment";
  let isScanningActive = false;

  function getScannerSupportedFormats() {
    if (typeof Html5QrcodeSupportedFormats !== "undefined") {
      return [
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.DATA_MATRIX
      ];
    }
    return undefined;
  }

  function ensureHtml5ScannerInstance() {
    if (html5QrCodeScanner) return html5QrCodeScanner;
    if (typeof Html5Qrcode === "undefined") return null;

    const formats = getScannerSupportedFormats();
    const config = {
      verbose: false,
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true
      }
    };
    if (formats) config.formatsToSupport = formats;

    html5QrCodeScanner = new Html5Qrcode("barcode-scanner-reader", config);
    return html5QrCodeScanner;
  }

  async function openBarcodeScanner(options = {}) {
    initScanAudio();
    const modal = $("#admin-barcode-scanner-modal");
    if (!modal) return;

    currentScannerMode = options.mode || "field";
    currentScannerTargetFieldId = options.targetFieldId || null;
    currentScannerTargetLabel = options.label || (currentScannerMode === "pos" ? "POS Barcode" : "Box Auto-Detect");
    currentScannerContext = options.context || "add";

    const labelEl = $("#scanner-target-label");
    if (labelEl) labelEl.textContent = currentScannerTargetLabel;

    const feedbackEl = $("#scanner-feedback-msg");
    if (feedbackEl) {
      feedbackEl.style.color = "#22c55e";
      feedbackEl.textContent = "";
    }

    const manualInput = $("#scanner-manual-input");
    if (manualInput) manualInput.value = "";

    modal.classList.add("active");
    await startHtml5Scanner();
  }

  async function closeBarcodeScanner() {
    isScanningActive = false;
    if (html5QrCodeScanner) {
      try {
        if (html5QrCodeScanner.isScanning) {
          await html5QrCodeScanner.stop();
        }
        html5QrCodeScanner.clear();
      } catch (e) {}
      html5QrCodeScanner = null;
    }
    $("#admin-barcode-scanner-modal")?.classList.remove("active");
  }

  async function startHtml5Scanner() {
    const readerWrap = document.getElementById("barcode-scanner-reader-wrap");
    const statusBanner = document.getElementById("scanner-status-banner");
    const statusText = document.getElementById("scanner-status-text");
    const switchBtn = document.getElementById("scanner-switch-camera-btn");

    // Check mediaDevices & secure context
    const hasMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const isSecureOrLocal = window.isSecureContext || location.hostname === "localhost" || location.hostname === "127.0.0.1";

    if (!hasMedia || !isSecureOrLocal) {
      if (readerWrap) readerWrap.style.display = "none";
      if (switchBtn) switchBtn.style.display = "none";
      if (statusBanner) {
        statusBanner.style.display = "block";
        if (statusText) {
          statusText.innerHTML = "<strong>Camera Ready:</strong> Tap the blue <strong>📸 Snap Box Photo</strong> button below to open your phone camera and scan instantly!";
        }
      }
      const feedbackEl = $("#scanner-feedback-msg");
      if (feedbackEl) {
        feedbackEl.style.color = "#38bdf8";
        feedbackEl.textContent = "👉 Tap 'Snap Box Photo' to capture box barcode";
      }
      return;
    }

    if (readerWrap) readerWrap.style.display = "block";
    if (statusBanner) statusBanner.style.display = "none";
    if (switchBtn) switchBtn.style.display = "flex";

    if (html5QrCodeScanner) {
      try {
        if (html5QrCodeScanner.isScanning) {
          await html5QrCodeScanner.stop();
        }
        html5QrCodeScanner.clear();
      } catch (e) {}
      html5QrCodeScanner = null;
    }

    ensureHtml5ScannerInstance();
    if (!html5QrCodeScanner) return;

    isScanningActive = true;

    try {
      let cameraToUse = { facingMode: currentCameraFacing };
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          if (currentCameraFacing === "environment") {
            const back = devices.find(d => /back|rear|environment|primary/i.test(d.label));
            cameraToUse = back ? back.id : devices[devices.length - 1].id;
          } else {
            const front = devices.find(d => /front|user|facing/i.test(d.label));
            cameraToUse = front ? front.id : devices[0].id;
          }
        }
      } catch (e) {}

      // Optimized qrbox horizontal slot specifically shaped for phone box barcodes
      const config = {
        fps: 25,
        qrbox: (viewWidth, viewHeight) => {
          const w = Math.min(Math.floor(viewWidth * 0.92), 360);
          const h = Math.min(Math.floor(viewHeight * 0.55), 180);
          return { width: Math.max(w, 220), height: Math.max(h, 90) };
        },
        aspectRatio: 1.333333
      };

      await html5QrCodeScanner.start(
        cameraToUse,
        config,
        (decodedText) => {
          if (!isScanningActive) return;
          handleSuccessfulBarcodeScan(decodedText.trim());
        },
        () => {}
      );
    } catch (err) {
      console.warn("Live camera start failed, switching to photo mode:", err);
      if (readerWrap) readerWrap.style.display = "none";
      if (switchBtn) switchBtn.style.display = "none";
      if (statusBanner) {
        statusBanner.style.display = "block";
        if (statusText) {
          statusText.innerHTML = "Live camera preview unavailable.<br>Tap <strong>📸 Snap Box Photo</strong> below to capture barcode directly!";
        }
      }
      const feedbackEl = $("#scanner-feedback-msg");
      if (feedbackEl) {
        feedbackEl.style.color = "#38bdf8";
        feedbackEl.textContent = "👉 Tap 'Snap Box Photo' to capture barcode";
      }
    }
  }

  function renderTransformedImage(file, { angle = 0, contrast = 1.0, maxDim = 1200 } = {}) {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let origW = img.width;
        let origH = img.height;
        let scale = Math.min(1, maxDim / Math.max(origW, origH));
        let w = Math.round(origW * scale);
        let h = Math.round(origH * scale);

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (angle === 90 || angle === 270) {
          canvas.width = h;
          canvas.height = w;
        } else {
          canvas.width = w;
          canvas.height = h;
        }

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((angle * Math.PI) / 180);
        if (contrast !== 1.0) {
          ctx.filter = `contrast(${contrast})`;
        }
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  async function processBarcodeImage(file) {
    if (!file) return;
    initScanAudio();

    const feedbackEl = $("#scanner-feedback-msg");
    if (feedbackEl) {
      feedbackEl.style.color = "#38bdf8";
      feedbackEl.textContent = "⏳ Analyzing phone box barcode...";
    }
    showToast("Scanning box barcode...", "info");

    // Stop live camera to release device and avoid "Cannot start file scan - ongoing camera scan" error!
    if (html5QrCodeScanner && html5QrCodeScanner.isScanning) {
      try {
        await html5QrCodeScanner.stop();
      } catch (e) {}
    }

    const detectedCodes = [];

    function addDetectedCode(val) {
      if (!val) return;
      const clean = String(val).trim();
      if (clean && !detectedCodes.includes(clean)) {
        detectedCodes.push(clean);
      }
    }

    try {
      // Pass 1: Browser Native BarcodeDetector (Hardware Accelerated)
      if ("BarcodeDetector" in window) {
        try {
          const supported = await window.BarcodeDetector.getSupportedFormats();
          const wanted = ["code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e", "qr_code", "data_matrix"];
          const formatsToUse = wanted.filter(f => supported.includes(f));
          if (formatsToUse.length > 0) {
            const detector = new window.BarcodeDetector({ formats: formatsToUse });
            const bitmap = await createImageBitmap(file);
            const results = await detector.detect(bitmap);
            if (results && results.length > 0) {
              results.forEach(r => addDetectedCode(r.rawValue));
            }
          }
        } catch (bdErr) {
          console.warn("Native BarcodeDetector pass:", bdErr);
        }
      }

      // Pass 2: Quagga2 Dedicated 1D Code 128 & Barcode Locator
      if (typeof Quagga !== "undefined") {
        try {
          const objectUrl = URL.createObjectURL(file);
          const quaggaCode = await new Promise((resolve) => {
            Quagga.decodeSingle({
              src: objectUrl,
              numOfWorkers: 0,
              locate: true,
              locator: {
                patchSize: "medium",
                halfSample: true
              },
              decoder: {
                readers: [
                  "code_128_reader",
                  "code_39_reader",
                  "ean_reader",
                  "upc_reader"
                ]
              }
            }, (res) => {
              URL.revokeObjectURL(objectUrl);
              if (res && res.codeResult && res.codeResult.code) {
                resolve(res.codeResult.code);
              } else {
                resolve(null);
              }
            });
          });
          if (quaggaCode) addDetectedCode(quaggaCode);
        } catch (qErr) {
          console.warn("Quagga pass error:", qErr);
        }
      }

      // Pass 3: Multi-Angle Rotations (0, 90, 270 deg) & High-Contrast ZXing / Quagga
      const angles = [0, 90, 270];
      for (const angle of angles) {
        if (detectedCodes.length >= 2) break; // Found both IMEIs, done!
        try {
          const processedBlob = await renderTransformedImage(file, { angle, contrast: 1.35, maxDim: 1400 });
          if (processedBlob) {
            if (typeof Quagga !== "undefined" && angle !== 0) {
              const rotatedUrl = URL.createObjectURL(processedBlob);
              const qCode = await new Promise((resolve) => {
                Quagga.decodeSingle({
                  src: rotatedUrl,
                  numOfWorkers: 0,
                  locate: true,
                  decoder: { readers: ["code_128_reader", "code_39_reader", "ean_reader"] }
                }, (res) => {
                  URL.revokeObjectURL(rotatedUrl);
                  resolve(res?.codeResult?.code || null);
                });
              });
              if (qCode) addDetectedCode(qCode);
            }

            ensureHtml5ScannerInstance();
            if (html5QrCodeScanner) {
              const pFile = new File([processedBlob], `scan_${angle}.jpg`, { type: "image/jpeg" });
              try {
                const zCode = await html5QrCodeScanner.scanFile(pFile, false);
                if (zCode) addDetectedCode(zCode);
              } catch (e) {}
            }
          }
        } catch (e) {}
      }

      // Pass 4: Direct scanFile with Html5Qrcode (with TRY_HARDER enabled)
      if (detectedCodes.length === 0) {
        ensureHtml5ScannerInstance();
        if (html5QrCodeScanner) {
          try {
            const directCode = await html5QrCodeScanner.scanFile(file, false);
            if (directCode) addDetectedCode(directCode);
          } catch (e) {}
        }
      }

      // Evaluate and auto-fill data!
      if (detectedCodes.length > 0) {
        handleBatchBarcodeResults(detectedCodes);
      } else {
        if (feedbackEl) {
          feedbackEl.style.color = "#f87171";
          feedbackEl.textContent = "❌ Barcode not detected. Please take a closer photo with good lighting or type below.";
        }
        showToast("Barcode not detected. Please try a closer, well-lit photo.", "error");
      }
    } catch (err) {
      console.error("Barcode processing error:", err);
      if (feedbackEl) {
        feedbackEl.style.color = "#f87171";
        feedbackEl.textContent = "❌ Could not process image. Try snapping closer.";
      }
      showToast("Could not read barcode. Please try a closer shot.", "error");
    }
  }

  function handleBatchBarcodeResults(codes) {
    if (!codes || codes.length === 0) return;
    playScanBeep();

    const imeis = [];
    const serials = [];
    const others = [];

    // Classify all detected codes from the box
    codes.forEach(c => {
      const clean = c.replace(/\s+/g, " ").trim();
      // Strip common prefixes found on phone box barcodes (e.g. "S/N: JX...", "IMEI1: 35...", "MEID: ...")
      const stripped = clean.replace(/^(SN|S\/N|SERIAL|IMEI1?|IMEI2?|MEID)[\s:]*/i, "").trim();
      const numOnly = stripped.replace(/\D/g, "");

      if (numOnly.length === 15) {
        // Standard 15-digit IMEI
        if (!imeis.includes(numOnly)) imeis.push(numOnly);
      } else if (/^[A-Za-z0-9]{8,18}$/.test(stripped) && !serials.includes(stripped)) {
        serials.push(stripped);
      } else {
        if (!others.includes(stripped)) others.push(stripped);
      }
    });

    const prefix = currentScannerContext === "edit" ? "edit-prod-" : "add-prod-";
    const sInput = document.getElementById(prefix + "serial");
    const i1Input = document.getElementById(prefix + "imei1");
    const i2Input = document.getElementById(prefix + "imei2");
    const skuInput = document.getElementById(prefix + "sku");

    const feedbackEl = $("#scanner-feedback-msg");
    const reportParts = [];

    // Mode A: Targeted Field Scan (user clicked specific 📷 button next to IMEI 1, S/N, etc.)
    if (currentScannerMode === "field" && currentScannerTargetFieldId) {
      const targetInput = document.getElementById(currentScannerTargetFieldId);
      if (targetInput) {
        let chosenVal = codes[0];
        if (currentScannerTargetFieldId.includes("imei")) {
          chosenVal = imeis[0] || codes[0];
        } else if (currentScannerTargetFieldId.includes("serial")) {
          chosenVal = serials[0] || codes[0];
        }
        targetInput.value = chosenVal;
        targetInput.classList.add("scanned-highlight");
        setTimeout(() => targetInput.classList.remove("scanned-highlight"), 1500);
        showToast(`✓ Scanned ${currentScannerTargetLabel}: ${chosenVal}`, "success");
        if (feedbackEl) {
          feedbackEl.style.color = "#22c55e";
          feedbackEl.textContent = `✓ Scanned ${currentScannerTargetLabel}: ${chosenVal}`;
        }
      }
      setTimeout(closeBarcodeScanner, 400);
      return;
    }

    // Mode B: POS Counter Scan
    if (currentScannerMode === "pos") {
      const codeToMatch = imeis[0] || serials[0] || codes[0];
      handlePosBarcodeScanned(codeToMatch);
      setTimeout(closeBarcodeScanner, 400);
      return;
    }

    // Mode C: Smart Box Quick Scan (Auto-Fills ALL matching box fields at once!)
    if (imeis.length >= 1 && i1Input) {
      i1Input.value = imeis[0];
      i1Input.classList.add("scanned-highlight");
      setTimeout(() => i1Input.classList.remove("scanned-highlight"), 1500);
      reportParts.push(`IMEI 1: ${imeis[0]}`);
    }
    if (imeis.length >= 2 && i2Input) {
      i2Input.value = imeis[1];
      i2Input.classList.add("scanned-highlight");
      setTimeout(() => i2Input.classList.remove("scanned-highlight"), 1500);
      reportParts.push(`IMEI 2: ${imeis[1]}`);
    }
    if (serials.length >= 1 && sInput) {
      sInput.value = serials[0];
      sInput.classList.add("scanned-highlight");
      setTimeout(() => sInput.classList.remove("scanned-highlight"), 1500);
      reportParts.push(`S/N: ${serials[0]}`);
    }
    if (others.length >= 1 && skuInput && !skuInput.value.trim()) {
      skuInput.value = others[0];
      skuInput.classList.add("scanned-highlight");
      setTimeout(() => skuInput.classList.remove("scanned-highlight"), 1500);
      reportParts.push(`Barcode: ${others[0]}`);
    }

    const summary = reportParts.length > 0 ? reportParts.join(" | ") : `Scanned: ${codes[0]}`;
    if (feedbackEl) {
      feedbackEl.style.color = "#22c55e";
      feedbackEl.textContent = `✓ Auto-Filled: ${summary}`;
    }
    showToast(`✓ Box Scanned: ${summary}`, "success");
    setTimeout(closeBarcodeScanner, 500);
  }

  function handleManualBarcodeSubmit() {
    const input = $("#scanner-manual-input");
    if (!input || !input.value.trim()) {
      showToast("Please enter a barcode or IMEI number first", "info");
      return;
    }
    const val = input.value.trim();
    handleSuccessfulBarcodeScan(val);
    input.value = "";
  }

  function handleSuccessfulBarcodeScan(code) {
    if (!code) return;
    isScanningActive = false;
    handleBatchBarcodeResults([code]);
  }

  function handlePosBarcodeScanned(code) {
    if (!code) return;
    const clean = code.trim().toUpperCase();
    const rawClean = code.trim();
    const match = posProducts.find(p =>
      (p.sku && p.sku.toUpperCase() === clean) ||
      (p.barcode && p.barcode.toUpperCase() === clean) ||
      (p.imei1 && p.imei1 === rawClean) ||
      (p.imei2 && p.imei2 === rawClean) ||
      (p.serialNumber && p.serialNumber.toUpperCase() === clean) ||
      (Array.isArray(p.imeiRecords) && p.imeiRecords.some(r => r.imei1 === rawClean || r.imei2 === rawClean || (r.serialNumber && r.serialNumber.toUpperCase() === clean)))
    );

    if (match) {
      addProductToPosBill(match._id);

      // If a specific IMEI unit was matched, auto-select it in POS handset selector
      if (Array.isArray(match.imeiRecords)) {
        const foundIdx = match.imeiRecords.findIndex(r => r.imei1 === rawClean || r.imei2 === rawClean || (r.serialNumber && r.serialNumber.toUpperCase() === clean));
        if (foundIdx > -1) {
          const unit = match.imeiRecords[foundIdx];
          if ($("#pos-imei1")) $("#pos-imei1").value = unit.imei1 || "";
          if ($("#pos-imei2")) $("#pos-imei2").value = unit.imei2 || "";
          if ($("#pos-serial-no") && unit.serialNumber) $("#pos-serial-no").value = unit.serialNumber;
          const select = $("#pos-handset-unit-select");
          if (select) {
            for (let i = 0; i < select.options.length; i++) {
              if (select.options[i].getAttribute("data-imei1") === unit.imei1) {
                select.selectedIndex = i;
                break;
              }
            }
          }
        }
      }

      showToast(`Scanned & Added: ${match.name}`, "success");
      const input = $("#pos-search-input");
      if (input) input.value = "";
      renderPosProducts();
    } else {
      const input = $("#pos-search-input");
      if (input) {
        input.value = clean;
        renderPosProducts();
      }
      showToast(`Scanned code: ${clean} (Not found in inventory)`, "info");
    }
  }

  /* ==========================================================================
     TAB 4: Customer Orders & Dispatch Packing Slip
     ========================================================================== */

  let customerOrdersCache = [];

  async function loadOrdersView() {
    const tbody = $("#orders-tbody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="8" style="padding:24px; text-align:center; color:var(--dark-text-muted);">Loading customer orders...</td></tr>`;

    try {
      const activeStatusBtn = $(".category-chip[data-order-status].active");
      const statusFilter = activeStatusBtn ? activeStatusBtn.dataset.orderStatus : "All";
      const searchVal = ($("#orders-search-input")?.value || "").trim();

      const params = { limit: 100 };
      if (statusFilter !== "All") params.status = statusFilter;
      if (searchVal) params.search = searchVal;

      const res = await zeshAPI.getOrders(params);
      customerOrdersCache = res.orders || [];

      if (customerOrdersCache.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="padding:30px; text-align:center; color:var(--dark-text-muted);">No online orders received matching criteria.</td></tr>`;
        return;
      }

      tbody.innerHTML = customerOrdersCache.map(o => {
        const dateStr = new Date(o.createdAt).toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit"
        });

        const custName = o.customer?.name || "Customer";
        const custEmail = o.customer?.email || "";

        let badgeClass = "badge-info";
        if (o.status === "Delivered") badgeClass = "badge-success";
        if (o.status === "Cancelled") badgeClass = "badge-danger";
        if (o.status === "Processing" || o.status === "Shipped") badgeClass = "badge-warning";

        const itemsSummary = o.items.map(it => `${it.name} (${it.quantity})`).join(", ");

        return `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
            <td style="padding: 12px 10px; font-family: var(--font-mono); color: #60a5fa; font-weight:700;">${escapeHTML(o.orderNumber)}</td>
            <td style="padding: 12px 10px;">
              <strong style="color: white; display:block;">${escapeHTML(custName)}</strong>
              <small style="color: var(--dark-text-muted); font-size:11px;">${escapeHTML(custEmail)}</small>
            </td>
            <td style="padding: 12px 10px; color: var(--dark-text-muted); font-size:11px;">${dateStr}</td>
            <td style="padding: 12px 10px; color: white; max-width:240px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${escapeHTML(itemsSummary)}">
              ${escapeHTML(itemsSummary)}
            </td>
            <td style="padding: 12px 10px;">
              <strong style="color: white; font-size: 13px;">${money(o.total)}</strong>
              <div style="font-size: 10.5px; color: ${o.paymentMethod?.includes('UPI') || o.paymentMethod?.includes('PhonePe') ? '#4ade80' : '#94a3b8'}; font-weight: 600;">
                ${escapeHTML(o.paymentMethod || 'Cash on Delivery')}
              </div>
              ${o.paymentDetails?.transactionId ? `<div style="font-family: var(--font-mono); font-size: 9.5px; color: #38bdf8; margin-top: 2px;">UTR: ${escapeHTML(o.paymentDetails.transactionId)}</div>` : ''}
            </td>
            <td style="padding: 12px 10px;"><span class="badge ${badgeClass}">${escapeHTML(o.status)}</span></td>
            <td style="padding: 12px 10px;">
              <select class="order-status-selector" data-id="${o._id}" style="background:#080c16; border-color:var(--dark-border); color:white; padding:4px 8px; font-size:11px;">
                <option value="Placed" ${o.status === "Placed" ? "selected" : ""}>Placed</option>
                <option value="Processing" ${o.status === "Processing" ? "selected" : ""}>Processing</option>
                <option value="Shipped" ${o.status === "Shipped" ? "selected" : ""}>Shipped</option>
                <option value="Delivered" ${o.status === "Delivered" ? "selected" : ""}>Delivered</option>
                <option value="Cancelled" ${o.status === "Cancelled" ? "selected" : ""}>Cancelled</option>
              </select>
            </td>
            <td style="padding: 12px 10px; text-align: right;">
              <button class="btn btn-dark btn-small order-packing-slip-btn" data-id="${o._id}">
                Slip ↗
              </button>
            </td>
          </tr>
        `;
      }).join("");

    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" style="padding:24px; color:var(--danger);">${escapeHTML(err.message)}</td></tr>`;
    }
  }

  // Open Courier Packing Slip Modal
  function openPackingSlipModal(orderId) {
    const order = customerOrdersCache.find(o => o._id === orderId);
    if (!order) return;

    const modal = $("#packing-slip-modal");
    const container = $("#packing-slip-content");
    if (!modal || !container) return;

    const dateStr = new Date(order.createdAt).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    const custName = order.customer?.name || "Customer";
    const custEmail = order.customer?.email || "";

    container.innerHTML = `
      <div style="border: 2px dashed #000; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #000;">
        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 12px;">
          <div>
            <h2 style="font-size: 20px; font-weight: 800; margin: 0 0 4px;">ZESH-TECH LOGISTICS</h2>
            <div>Courier Dispatch &amp; Package Manifest</div>
          </div>
          <div style="text-align: right;">
            <div style="font-family: monospace; font-size: 14px; font-weight: 800;">ORDER #${escapeHTML(order.orderNumber)}</div>
            <div>Date: ${dateStr}</div>
            <div style="font-weight: 700; color: ${order.paymentMethod?.includes('UPI') || order.paymentMethod?.includes('PhonePe') ? '#16a34a' : '#dc2626'};">
              PAYMENT: ${escapeHTML(order.paymentMethod || 'CASH ON DELIVERY (COD)')}
              ${order.paymentDetails?.transactionId ? `(UTR: ${escapeHTML(order.paymentDetails.transactionId)})` : ''}
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #f8fafc; border: 1px solid #ddd; padding: 12px; border-radius: 4px; margin-bottom: 16px;">
          <div>
            <div style="font-size: 10px; font-weight: 700; color: #555;">DELIVER TO:</div>
            <strong style="font-size: 14px;">${escapeHTML(custName)}</strong>
            <div>Email: ${escapeHTML(custEmail)}</div>
            <div>Payment: Cash on Delivery</div>
          </div>
          <div>
            <div style="font-size: 10px; font-weight: 700; color: #555;">DISPATCHED FROM:</div>
            <strong>ZESH-TECH Central Hub</strong>
            <div>Main Tech Boulevard, Warehouse 4</div>
            <div>Support: +91 98765 43210</div>
          </div>
        </div>

        <div style="margin-bottom: 16px;">
          <h4 style="margin: 0 0 8px;">Order Checklist &amp; Contents:</h4>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background: #000; color: white;">
                <th style="padding: 6px; text-align: left;">Item Description</th>
                <th style="padding: 6px; text-align: center;">SKU</th>
                <th style="padding: 6px; text-align: center;">Qty</th>
                <th style="padding: 6px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(it => `
                <tr style="border-bottom: 1px solid #ddd;">
                  <td style="padding: 6px;">[ ] ${escapeHTML(it.name)}</td>
                  <td style="padding: 6px; text-align: center; font-family: monospace;">${escapeHTML(it.sku || "N/A")}</td>
                  <td style="padding: 6px; text-align: center; font-weight: 700;">${it.quantity}</td>
                  <td style="padding: 6px; text-align: right;">${money(it.lineTotal)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #000; padding-top: 10px; font-size: 14px;">
          <span>Collect Cash on Delivery:</span>
          <strong style="font-size: 18px;">${money(order.total)}</strong>
        </div>
      </div>
    `;

    modal.classList.add("active");
  }

  /* ==========================================================================
     TAB 5: Sales & Tax Bills History
     ========================================================================== */

  let billsCache = [];

  async function loadBillsView() {
    const tbody = $("#bills-tbody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="9" style="padding:24px; text-align:center; color:var(--dark-text-muted);">Loading sales records...</td></tr>`;

    try {
      const searchVal = ($("#bills-search-input")?.value || "").trim();
      const activePeriodBtn = $(".category-chip[data-bill-period].active");
      const period = activePeriodBtn ? activePeriodBtn.dataset.billPeriod : "all";

      const params = { limit: 100 };
      if (period !== "all") params.period = period;
      if (searchVal) params.search = searchVal;

      const res = await zeshAPI.getBills(params);
      billsCache = res.bills || [];

      if (billsCache.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="padding:30px; text-align:center; color:var(--dark-text-muted);">No sales bills match your selection.</td></tr>`;
        return;
      }

      tbody.innerHTML = billsCache.map(b => {
        const dateStr = new Date(b.createdAt).toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit"
        });

        const isCancelled = b.status === "cancelled";

        return `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.04); ${isCancelled ? 'opacity: 0.55;' : ''}">
            <td style="padding: 12px 10px; font-family: var(--font-mono); color: #60a5fa; font-weight:700;">${escapeHTML(b.invoiceNumber)}</td>
            <td style="padding: 12px 10px;">
              <strong style="color: white; display:block;">${escapeHTML(b.customerName)}</strong>
              ${b.customerPhone ? `<small style="color: var(--dark-text-muted);">${escapeHTML(b.customerPhone)}</small>` : ""}
            </td>
            <td style="padding: 12px 10px; color: var(--dark-text-muted); font-size:11px;">${dateStr}</td>
            <td style="padding: 12px 10px; color: white;">${escapeHTML(b.paymentMode || "Cash")}</td>
            <td style="padding: 12px 10px; color: var(--dark-text-muted);">${money(b.taxableValue || 0)}</td>
            <td style="padding: 12px 10px; color: var(--dark-text-muted);">${money((b.cgst || 0) + (b.sgst || 0))}</td>
            <td style="padding: 12px 10px; font-weight: 700; color: white;">${money(b.grandTotal)}</td>
            <td style="padding: 12px 10px;">
              <span class="badge ${isCancelled ? 'badge-danger' : 'badge-success'}">${escapeHTML(b.status || 'completed')}</span>
            </td>
            <td style="padding: 12px 10px; text-align: right;">
              <div style="display:flex; justify-content:flex-end; gap:6px;">
                <button class="btn btn-dark btn-small bill-view-print-btn" data-id="${b._id}">
                  Print
                </button>
                ${!isCancelled ? `
                  <button class="btn btn-dark btn-small bill-cancel-btn" data-id="${b._id}" style="color:#f87171;" title="Cancel bill & restore inventory">
                    Cancel
                  </button>
                ` : ""}
              </div>
            </td>
          </tr>
        `;
      }).join("");

    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="9" style="padding:24px; color:var(--danger);">${escapeHTML(err.message)}</td></tr>`;
    }
  }

  function exportSalesCsv() {
    if (billsCache.length === 0) {
      showToast("No sales records to export", "warning");
      return;
    }

    const rows = [
      ["Invoice Number", "Customer Name", "Customer Phone", "Date", "Payment Mode", "Taxable Value", "CGST", "SGST", "Discount", "Grand Total", "Status"]
    ];

    billsCache.forEach(b => {
      rows.push([
        b.invoiceNumber,
        b.customerName,
        b.customerPhone,
        new Date(b.createdAt).toISOString(),
        b.paymentMode,
        b.taxableValue,
        b.cgst,
        b.sgst,
        b.discount,
        b.grandTotal,
        b.status
      ]);
    });

    exportToCsv(`zeshtech-sales-${Date.now()}.csv`, rows);
  }

  /* ==========================================================================
     TAB 6: Staff & User Management
     ========================================================================== */

  async function loadUsersView() {
    const tbody = $("#users-tbody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" style="padding:24px; text-align:center; color:var(--dark-text-muted);">Loading user accounts...</td></tr>`;

    try {
      const res = await zeshAPI.getUsers();
      const users = res.users || [];

      tbody.innerHTML = users.map(u => {
        const dateStr = new Date(u.createdAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric"
        });

        const isAdmin = u.role === "admin";

        return `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
            <td style="padding: 12px 10px; color: white; font-weight:600;">${escapeHTML(u.name)}</td>
            <td style="padding: 12px 10px; color: var(--dark-text-muted);">${escapeHTML(u.email)}</td>
            <td style="padding: 12px 10px; color: var(--dark-text-muted);">${dateStr}</td>
            <td style="padding: 12px 10px;">
              <span class="badge ${isAdmin ? 'badge-info' : 'badge-neutral'}">${escapeHTML(u.role)}</span>
            </td>
            <td style="padding: 12px 10px; text-align: right;">
              <div style="display:flex; justify-content:flex-end; gap:6px;">
                <button class="btn btn-dark btn-small user-role-toggle-btn" data-id="${u.id}" data-current-role="${u.role}">
                  ${isAdmin ? "Demote to Customer" : "Promote to Admin"}
                </button>
                ${!isAdmin ? `
                  <button class="btn btn-dark btn-small user-delete-btn" data-id="${u.id}" style="color:#f87171;">
                    Delete
                  </button>
                ` : ""}
              </div>
            </td>
          </tr>
        `;
      }).join("");

    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5" style="padding:24px; color:var(--danger);">${escapeHTML(err.message)}</td></tr>`;
    }
  }

  /* ==========================================================================
     Global Listeners & Events
     ========================================================================== */

  document.addEventListener("DOMContentLoaded", () => {
    checkAdminAuth();

    // Authentication form
    $("#admin-login-form")?.addEventListener("submit", handleAdminLogin);
    $("#admin-logout-btn")?.addEventListener("click", handleAdminLogout);
    setupForgotPassword();

    // Sidebar navigation (Desktop)
    $$(".admin-nav-btn").forEach(btn => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });

    // Mobile Bottom Navigation Bar Buttons
    $$(".admin-bottom-btn[data-tab]").forEach(btn => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });

    // Mobile Hamburger & Drawer Toggles
    $("#admin-mobile-menu-btn")?.addEventListener("click", openMobileDrawer);
    $("#mobile-more-menu-btn")?.addEventListener("click", openMobileDrawer);
    $("#admin-close-sidebar-btn")?.addEventListener("click", closeMobileDrawer);
    $("#admin-sidebar-overlay")?.addEventListener("click", closeMobileDrawer);

    // Topbar quick shortcuts
    $("#topbar-new-pos-btn")?.addEventListener("click", () => switchTab("pos"));
    $("#topbar-add-product-btn")?.addEventListener("click", () => {
      $("#admin-add-product-modal")?.classList.add("active");
    });

    // Overview buttons
    $("#overview-view-inventory-btn")?.addEventListener("click", () => switchTab("inventory"));
    $("#overview-view-orders-btn")?.addEventListener("click", () => switchTab("orders"));

    // Quick restock click on overview
    $("#overview-lowstock-list")?.addEventListener("click", (e) => {
      const btn = e.target.closest(".quick-restock-btn");
      if (btn) openStockModal(btn.dataset.id, btn.dataset.name, btn.dataset.stock);
    });

    // POS Product Category filters
    $$("[data-pos-cat]").forEach(btn => {
      btn.addEventListener("click", () => {
        $$("[data-pos-cat]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        posCategory = btn.dataset.posCat;
        renderPosProducts();
      });
    });

    // POS Search input
    $("#pos-search-input")?.addEventListener("input", renderPosProducts);

    // POS Product Click (add to bill)
    $("#pos-products-grid")?.addEventListener("click", (e) => {
      const item = e.target.closest("[data-pos-add-id]");
      if (item) addProductToPosBill(item.dataset.posAddId);
    });

    // POS Bill Table Actions (+, -, remove)
    $("#pos-bill-tbody")?.addEventListener("click", (e) => {
      const plus = e.target.closest(".pos-qty-plus");
      if (plus) {
        updatePosCartQuantity(plus.dataset.id, 1);
        return;
      }
      const minus = e.target.closest(".pos-qty-minus");
      if (minus) {
        updatePosCartQuantity(minus.dataset.id, -1);
        return;
      }
      const rm = e.target.closest(".pos-remove-item");
      if (rm) {
        removePosCartItem(rm.dataset.id);
        return;
      }
    });

    // POS Tax Rate, Discount, and Tender inputs
    $("#pos-tax-rate")?.addEventListener("change", renderPosBill);
    $("#pos-discount")?.addEventListener("input", renderPosBill);
    $("#pos-cash-tendered-input")?.addEventListener("input", () => {
      const grandTotalStr = $("#pos-grand-total-val")?.textContent || "0";
      const num = parseFloat(grandTotalStr.replace(/[^0-9.]/g, "")) || 0;
      updateCashTenderCalculation(num);
    });

    // Multi-Ticket Hold & Resume
    $("#pos-hold-bill-btn")?.addEventListener("click", handleHoldBill);
    $("#pos-resume-bill-btn")?.addEventListener("click", handleResumeBill);

    // Customer Autocomplete in POS
    setupCustomerAutocomplete();

    // POS Clear Bill button
    $("#pos-clear-bill-btn")?.addEventListener("click", () => {
      posCart = [];
      renderPosBill();
      showToast("Current bill cleared", "info");
    });

    // POS Complete Bill button
    $("#pos-complete-bill-btn")?.addEventListener("click", handleCompletePosBill);

    // POS Day-Closing Register & Galla Summary
    $("#pos-open-day-register-btn")?.addEventListener("click", openDailyRegisterModal);
    $("#close-daily-register-modal")?.addEventListener("click", () => {
      $("#modal-daily-register")?.classList.remove("active");
    });
    $("#modal-daily-register")?.addEventListener("click", (e) => {
      if (e.target.id === "modal-daily-register") {
        $("#modal-daily-register").classList.remove("active");
      }
    });
    $("#galla-refresh-btn")?.addEventListener("click", openDailyRegisterModal);
    $("#galla-whatsapp-send-btn")?.addEventListener("click", handleSendGallaWhatsApp);

    // POS Old Phone Exchange Toggle & Input
    $("#pos-exchange-toggle")?.addEventListener("change", (e) => {
      const box = $("#pos-exchange-fields");
      if (box) box.style.display = e.target.checked ? "grid" : "none";
      renderPosBill();
    });
    $("#pos-exchange-value")?.addEventListener("input", renderPosBill);

    // POS Counter PhonePe QR Modal
    $("#pos-show-phonepe-qr-btn")?.addEventListener("click", () => {
      const grandTotalStr = $("#pos-grand-total-val")?.textContent || "₹0.00";
      const modalAmt = $("#pos-qr-modal-amount");
      if (modalAmt) modalAmt.textContent = grandTotalStr;
      const payModeSelect = $("#pos-payment-mode");
      if (payModeSelect) payModeSelect.value = "PhonePe / UPI";
      $("#pos-phonepe-qr-modal")?.classList.add("active");
    });
    $("#pos-close-phonepe-modal-btn")?.addEventListener("click", () => {
      $("#pos-phonepe-qr-modal")?.classList.remove("active");
    });
    $("#pos-done-phonepe-modal-btn")?.addEventListener("click", () => {
      $("#pos-phonepe-qr-modal")?.classList.remove("active");
    });
    $("#pos-phonepe-qr-modal")?.addEventListener("click", (e) => {
      if (e.target.id === "pos-phonepe-qr-modal") {
        $("#pos-phonepe-qr-modal").classList.remove("active");
      }
    });

    // Inventory Health Tabs
    $$("[data-stock-filter]").forEach(btn => {
      btn.addEventListener("click", () => {
        $$("[data-stock-filter]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentStockFilter = btn.dataset.stockFilter;
        renderInventoryTable();
      });
    });

    // Inventory Search & Category filters
    $("#inv-search-input")?.addEventListener("input", renderInventoryTable);
    $("#inv-category-select")?.addEventListener("change", renderInventoryTable);
    $("#inv-export-csv-btn")?.addEventListener("click", exportInventoryCsv);

    // Add Product Modal
    $("#open-add-product-modal-btn")?.addEventListener("click", () => {
      $("#admin-add-product-modal")?.classList.add("active");
    });
    $("#close-add-product-modal")?.addEventListener("click", () => {
      $("#admin-add-product-modal")?.classList.remove("active");
    });
    $("#add-product-form")?.addEventListener("submit", handleAddProductSubmit);

    // Multi-image file accumulation & live preview for Add Product
    $("#add-product-file-input")?.addEventListener("change", (e) => {
      const newFiles = Array.from(e.target.files || []);
      newFiles.forEach((f) => {
        if (!addProductImageFiles.some(existing => existing.name === f.name && existing.size === f.size)) {
          addProductImageFiles.push(f);
        }
      });
      // Clear value so the user can tap Choose Files again to add more photos/camera shots
      e.target.value = "";
      renderAddProductImagesPreview();
    });

    $("#add-prod-clear-files-btn")?.addEventListener("click", () => {
      addProductImageFiles = [];
      renderAddProductImagesPreview();
    });

    // Multi-image file accumulation & live preview for Edit Product
    $("#edit-product-file-input")?.addEventListener("change", (e) => {
      const newFiles = Array.from(e.target.files || []);
      newFiles.forEach((f) => {
        if (!editProductImageFiles.some(existing => existing.name === f.name && existing.size === f.size)) {
          editProductImageFiles.push(f);
        }
      });
      e.target.value = "";
      renderEditProductImagesPreview();
    });

    $("#edit-prod-clear-files-btn")?.addEventListener("click", () => {
      editProductImageFiles = [];
      renderEditProductImagesPreview();
    });

    // Handle session expiration across all admin operations
    window.addEventListener("zesh:auth_expired", () => {
      showToast("Your admin session has expired. Please authenticate to continue.", "error");
      showLoginScreen();
    });

    // Edit Product Modal
    $("#close-edit-product-modal")?.addEventListener("click", () => {
      $("#admin-edit-product-modal")?.classList.remove("active");
    });
    $("#edit-product-form")?.addEventListener("submit", handleEditProductSubmit);

    // Inventory Table actions: Stock Adjust, Edit, Deactivate
    $("#inventory-tbody")?.addEventListener("click", async (e) => {
      const stockBtn = e.target.closest(".stock-adjust-trigger");
      if (stockBtn) {
        openStockModal(stockBtn.dataset.id, stockBtn.dataset.name, stockBtn.dataset.stock);
        return;
      }

      const editBtn = e.target.closest(".product-edit-trigger");
      if (editBtn) {
        openEditProductModal(editBtn.dataset.id);
        return;
      }

      const delBtn = e.target.closest(".product-delete-trigger");
      if (delBtn) {
        if (confirm(`Are you sure you want to deactivate "${delBtn.dataset.name}" from public listing?`)) {
          try {
            await zeshAPI.deactivateProduct(delBtn.dataset.id);
            showToast("Product deactivated", "info");
            loadInventoryView();
            loadOverview();
          } catch (err) {
            showToast(err.message, "error");
          }
        }
        return;
      }
    });

    // Stock Adjustment Modal
    $("#close-stock-modal")?.addEventListener("click", () => {
      $("#admin-stock-modal")?.classList.remove("active");
    });
    $("#stock-adjust-form")?.addEventListener("submit", handleStockAdjustSubmit);

    // Orders Filter Chips
    $$("[data-order-status]").forEach(btn => {
      btn.addEventListener("click", () => {
        $$("[data-order-status]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        loadOrdersView();
      });
    });

    // Orders search input
    $("#orders-search-input")?.addEventListener("input", loadOrdersView);

    // Orders status update & packing slip
    $("#orders-tbody")?.addEventListener("change", async (e) => {
      const sel = e.target.closest(".order-status-selector");
      if (sel) {
        const orderId = sel.dataset.id;
        const newStatus = sel.value;
        try {
          await zeshAPI.updateOrderStatus(orderId, newStatus);
          showToast(`Order status updated to ${newStatus}`, "success");
          loadOrdersView();
          loadOverview();
        } catch (err) {
          showToast(err.message, "error");
        }
      }
    });

    $("#orders-tbody")?.addEventListener("click", (e) => {
      const slipBtn = e.target.closest(".order-packing-slip-btn");
      if (slipBtn) {
        openPackingSlipModal(slipBtn.dataset.id);
      }
    });

    $("#close-packing-slip-btn")?.addEventListener("click", () => {
      $("#packing-slip-modal")?.classList.remove("active");
    });

    // Bills History Period Chips
    $$("[data-bill-period]").forEach(btn => {
      btn.addEventListener("click", () => {
        $$("[data-bill-period]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        loadBillsView();
      });
    });

    // Bills Search input & Export
    $("#bills-search-input")?.addEventListener("input", loadBillsView);
    $("#bills-export-csv-btn")?.addEventListener("click", exportSalesCsv);

    // Bills Table: Print Invoice & Cancel Bill
    $("#bills-tbody")?.addEventListener("click", async (e) => {
      const printBtn = e.target.closest(".bill-view-print-btn");
      if (printBtn) {
        try {
          const res = await zeshAPI.getBillById(printBtn.dataset.id);
          if (res.bill) openTaxInvoicePrintModal(res.bill);
        } catch (err) {
          showToast(err.message, "error");
        }
        return;
      }

      const cancelBtn = e.target.closest(".bill-cancel-btn");
      if (cancelBtn) {
        if (confirm("Cancel this bill? This will restore all line item quantities to inventory.")) {
          try {
            await zeshAPI.cancelBill(cancelBtn.dataset.id);
            showToast("Bill cancelled and inventory restored", "success");
            loadBillsView();
            loadOverview();
          } catch (err) {
            showToast(err.message, "error");
          }
        }
      }
    });

    // Invoice Print Modal Controls (Dual Format Toggle)
    $("#toggle-print-a4")?.addEventListener("click", () => {
      printFormat = "a4";
      document.body.classList.remove("print-thermal-mode");
      $("#toggle-print-a4").style.background = "white";
      $("#toggle-print-a4").style.color = "black";
      $("#toggle-print-thermal").style.background = "transparent";
      $("#toggle-print-thermal").style.color = "#64748b";
      renderPrintContent();
    });

    $("#toggle-print-thermal")?.addEventListener("click", () => {
      printFormat = "thermal";
      document.body.classList.add("print-thermal-mode");
      $("#toggle-print-thermal").style.background = "white";
      $("#toggle-print-thermal").style.color = "black";
      $("#toggle-print-a4").style.background = "transparent";
      $("#toggle-print-a4").style.color = "#64748b";
      renderPrintContent();
    });

    $("#trigger-browser-print-btn")?.addEventListener("click", () => {
      window.print();
    });

    $("#send-whatsapp-invoice-btn")?.addEventListener("click", handleSendWhatsAppInvoice);

    $("#close-invoice-modal-btn")?.addEventListener("click", () => {
      $("#invoice-print-modal")?.classList.remove("active");
      document.body.classList.remove("print-thermal-mode");
    });

    // User Management actions
    $("#users-tbody")?.addEventListener("click", async (e) => {
      const roleBtn = e.target.closest(".user-role-toggle-btn");
      if (roleBtn) {
        const id = roleBtn.dataset.id;
        const current = roleBtn.dataset.currentRole;
        const targetRole = current === "admin" ? "customer" : "admin";
        if (confirm(`Change this user's role to "${targetRole}"?`)) {
          try {
            await zeshAPI.updateUserRole(id, targetRole);
            showToast(`Role changed to ${targetRole}`, "success");
            loadUsersView();
          } catch (err) {
            showToast(err.message, "error");
          }
        }
        return;
      }

      const delBtn = e.target.closest(".user-delete-btn");
      if (delBtn) {
        if (confirm("Permanently delete this customer account?")) {
          try {
            await zeshAPI.deleteUser(delBtn.dataset.id);
            showToast("Account deleted", "info");
            loadUsersView();
          } catch (err) {
            showToast(err.message, "error");
          }
        }
      }
    });

    // Multi-Unit Handset IMEI Management Triggers
    $("#btn-add-unit-imei")?.addEventListener("click", () => {
      addProdExtraUnits.push({
        id: "add_u_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        imei1: "",
        imei2: "",
        serialNumber: "",
        status: "In Stock"
      });
      renderAddProductImeiUnits();
    });

    $("#btn-match-add-stock-units")?.addEventListener("click", () => {
      const stock = parseInt($("#add-product-stock")?.value, 10) || 1;
      const targetExtra = Math.max(0, stock - 1);
      while (addProdExtraUnits.length < targetExtra) {
        addProdExtraUnits.push({
          id: "add_u_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
          imei1: "",
          imei2: "",
          serialNumber: "",
          status: "In Stock"
        });
      }
      renderAddProductImeiUnits();
      showToast(`Configured IMEI slots for ${stock} handset unit(s)`, "info");
    });

    $("#btn-edit-add-unit-imei")?.addEventListener("click", () => {
      editProdExtraUnits.push({
        id: "edit_u_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        imei1: "",
        imei2: "",
        serialNumber: "",
        status: "In Stock"
      });
      renderEditProductImeiUnits();
    });

    $("#btn-match-edit-stock-units")?.addEventListener("click", () => {
      const id = $("#edit-product-id")?.value;
      const prod = inventoryList.find(p => p._id === id);
      const stock = prod ? (Number(prod.stockQuantity) || 1) : 1;
      const targetExtra = Math.max(0, stock - 1);
      while (editProdExtraUnits.length < targetExtra) {
        editProdExtraUnits.push({
          id: "edit_u_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
          imei1: "",
          imei2: "",
          serialNumber: "",
          status: "In Stock"
        });
      }
      renderEditProductImeiUnits();
      showToast(`Configured IMEI slots for ${stock} handset unit(s)`, "info");
    });

    // Barcode & IMEI Camera Scanner Triggers (Delegated so all dynamic unit rows work)
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-scan-field");
      if (btn && btn.dataset.target) {
        openBarcodeScanner({ targetFieldId: btn.dataset.target, label: btn.dataset.label || "IMEI / Barcode", mode: "field" });
      }
    });

    $$(".btn-smart-box-scan").forEach(btn => {
      btn.addEventListener("click", () => {
        openBarcodeScanner({ mode: "smart-box", context: btn.dataset.context, label: "Box Auto-Detect" });
      });
    });

    $("#pos-camera-scan-btn")?.addEventListener("click", () => {
      openBarcodeScanner({ mode: "pos", label: "POS Box Barcode" });
    });

    $("#close-barcode-scanner-btn")?.addEventListener("click", closeBarcodeScanner);
    $("#scanner-cancel-btn")?.addEventListener("click", closeBarcodeScanner);
    $("#scanner-switch-camera-btn")?.addEventListener("click", async () => {
      currentCameraFacing = currentCameraFacing === "environment" ? "user" : "environment";
      await startHtml5Scanner();
    });

    // Native Camera Snap & Gallery File triggers
    $("#scanner-snap-btn")?.addEventListener("click", () => {
      $("#scanner-camera-snap-input")?.click();
    });

    $("#scanner-upload-btn")?.addEventListener("click", () => {
      $("#scanner-gallery-upload-input")?.click();
    });

    $("#scanner-camera-snap-input")?.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        processBarcodeImage(e.target.files[0]);
        e.target.value = "";
      }
    });

    $("#scanner-gallery-upload-input")?.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        processBarcodeImage(e.target.files[0]);
        e.target.value = "";
      }
    });

    // Manual Barcode / IMEI text submit
    $("#scanner-manual-submit-btn")?.addEventListener("click", handleManualBarcodeSubmit);
    $("#scanner-manual-input")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleManualBarcodeSubmit();
      }
    });

    // Global Keyboard Shortcuts
    document.addEventListener("keydown", (e) => {
      // F2 -> Launch POS
      if (e.key === "F2") {
        e.preventDefault();
        switchTab("pos");
        $("#pos-search-input")?.focus();
        showToast("Switched to POS Counter (F2)", "info");
      }
      // F4 -> Add Product Modal
      if (e.key === "F4") {
        e.preventDefault();
        $("#admin-add-product-modal")?.classList.add("active");
      }
      // Escape -> Close active modals
      if (e.key === "Escape") {
        $$(".modal-backdrop.active").forEach(m => m.classList.remove("active"));
        document.body.classList.remove("print-thermal-mode");
      }
    });
  });
})();
