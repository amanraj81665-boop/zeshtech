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

    // Auto pre-fill POS Device Details card if available on product
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
    const grandTotal = Math.max(0, Math.round((subtotal + calculatedTax - finalDiscount) * 100) / 100);

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
              <img src="${p.imageUrl || '/images/logo.png'}" alt="" style="width: 36px; height: 36px; object-fit: cover; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); background: #000; flex-shrink: 0;" onerror="this.src='/images/logo.png'">
              <div>
                <strong style="color: white; font-size: 13px; display:block;">${escapeHTML(p.name)}</strong>
                <span style="font-family: var(--font-mono); font-size: 11px; color: var(--dark-text-muted);">SKU: ${escapeHTML(p.sku)}</span>
                ${p.serialNumber ? `<span style="font-family: var(--font-mono); font-size: 10px; color: #38bdf8; margin-left: 6px; font-weight: 700;">• S/N: ${escapeHTML(p.serialNumber)}</span>` : ""}
                ${p.imei1 ? `<span style="font-family: var(--font-mono); font-size: 10px; color: #94a3b8; margin-left: 6px;">• IMEI: ${escapeHTML(p.imei1)}</span>` : ""}
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

  // Edit Product Modal
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

    $("#admin-edit-product-modal")?.classList.add("active");
  }

  async function handleEditProductSubmit(e) {
    e.preventDefault();
    const btn = $("#edit-product-submit-btn");
    const id = $("#edit-product-id").value;

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
      description: $("#edit-prod-desc").value.trim()
    };

    try {
      btn.disabled = true;
      btn.textContent = "Updating...";

      await zeshAPI.updateProduct(id, updates);
      showToast("Product updated successfully!", "success");

      $("#admin-edit-product-modal")?.classList.remove("active");
      loadInventoryView();
    } catch (err) {
      showToast(err.message || "Failed to update product", "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Update Product Information";
    }
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

  // Add Product Form
  async function handleAddProductSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const btn = $("#add-product-submit-btn");
    const errBox = $("#add-product-error");

    const formData = new FormData(form);
    const productPayload = {
      name: formData.get("name").trim(),
      sku: formData.get("sku").trim().toUpperCase(),
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
      imageUrl: formData.get("imageUrl")?.trim() || ""
    };

    try {
      btn.disabled = true;
      btn.textContent = "Saving to Catalogue...";
      if (errBox) errBox.classList.add("hidden");

      // Check if file upload is selected
      const fileInput = $("#add-product-file-input");
      if (fileInput && fileInput.files && fileInput.files[0]) {
        btn.textContent = "Uploading image to Cloudinary...";
        const uploadRes = await zeshAPI.uploadProductImage(fileInput.files[0]);
        if (uploadRes && uploadRes.imageUrl) {
          productPayload.imageUrl = uploadRes.imageUrl;
        }
      }

      await zeshAPI.addProduct(productPayload);
      showToast(`Product "${productPayload.name}" created!`, "success");

      form.reset();
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
