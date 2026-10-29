"use strict";

const API_BASE = "/api";

/* =========================================
   OWNER / ADMIN API
   Used by the Owner Dashboard & POS Terminal
========================================= */

const api = {
  token: localStorage.getItem("zesh_admin_token") || sessionStorage.getItem("zesh_admin_token") || localStorage.getItem("zesh_token") || "",

  getToken() {
    if (!this.token) {
      this.token = localStorage.getItem("zesh_admin_token") ||
                   sessionStorage.getItem("zesh_admin_token") ||
                   localStorage.getItem("zesh_token") ||
                   sessionStorage.getItem("zesh_token") ||
                   "";
    }
    return this.token;
  },

  setToken(token, persist = true) {
    this.token = token || "";
    if (this.token) {
      sessionStorage.setItem("zesh_admin_token", this.token);
      localStorage.setItem("zesh_admin_token", this.token);
      localStorage.setItem("zesh_token", this.token);
    } else {
      sessionStorage.removeItem("zesh_admin_token");
      localStorage.removeItem("zesh_admin_token");
      sessionStorage.removeItem("zesh_admin_user");
      localStorage.removeItem("zesh_admin_user");
      localStorage.removeItem("zesh_token");
    }
  },

  getUser() {
    try {
      const stored = sessionStorage.getItem("zesh_admin_user") || localStorage.getItem("zesh_admin_user");
      return JSON.parse(stored || "null");
    } catch {
      return null;
    }
  },

  async request(path, options = {}) {
    const token = this.getToken();
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        this.setToken("");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("zesh:auth_expired", { detail: { path } }));
        }
      }
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  },

  // Authentication
  async login(email, password, remember = true) {
    const data = await this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    if (!data.token || data.user?.role !== "admin") {
      throw new Error("Admin privileges required to access the Owner Portal.");
    }

    this.setToken(data.token, true);
    sessionStorage.setItem("zesh_admin_user", JSON.stringify(data.user));
    localStorage.setItem("zesh_admin_user", JSON.stringify(data.user));
    return data.user;
  },

  logout() {
    this.setToken("");
  },

  // Auth Configuration (Google Client ID etc.)
  getAuthConfig() {
    return this.request("/auth/config");
  },

  // Forgot Password
  sendForgotPasswordOtp(email) {
    return this.request("/auth/forgot-password/send-otp", {
      method: "POST",
      body: JSON.stringify({ email })
    });
  },

  resetPasswordWithOtp(email, otp, newPassword) {
    return this.request("/auth/forgot-password/reset", {
      method: "POST",
      body: JSON.stringify({ email, otp, newPassword })
    });
  },

  // Products & Inventory
  getProducts(params = {}) {
    const query = new URLSearchParams(params);
    const suffix = query.toString() ? `?${query}` : "";
    return this.request(`/products${suffix}`);
  },

  getProductById(id) {
    return this.request(`/products/${encodeURIComponent(id)}`);
  },

  lookupProduct(code) {
    return this.request(`/products/lookup/${encodeURIComponent(code)}`);
  },

  getLowStock() {
    return this.request("/products/low-stock");
  },

  getInventoryStats() {
    return this.request("/products/inventory-stats");
  },

  addProduct(product) {
    return this.request("/products", {
      method: "POST",
      body: JSON.stringify(product)
    });
  },

  updateProduct(id, updates) {
    return this.request(`/products/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(updates)
    });
  },

  updateStock(id, change) {
    return this.request(`/products/${encodeURIComponent(id)}/stock`, {
      method: "PATCH",
      body: JSON.stringify({ change })
    });
  },

  deactivateProduct(id) {
    return this.request(`/products/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
  },

  async uploadProductImage(file) {
    const formData = new FormData();
    formData.append("image", file);

    const token = this.getToken();
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/uploads/product-image`, {
      method: "POST",
      headers,
      body: formData
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || "Failed to upload image");
    }
    return data;
  },

  async uploadProductImages(files) {
    const formData = new FormData();
    const fileList = Array.from(files || []);
    fileList.forEach(f => formData.append("images", f));

    const token = this.getToken();
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/uploads/product-images`, {
      method: "POST",
      headers,
      body: formData
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || "Failed to upload images");
    }
    return data;
  },

  // POS Billing
  createBill(billData) {
    return this.request("/bills", {
      method: "POST",
      body: JSON.stringify(billData)
    });
  },

  getBills(params = {}) {
    const query = new URLSearchParams(params);
    const suffix = query.toString() ? `?${query}` : "";
    return this.request(`/bills${suffix}`);
  },

  getBillStats() {
    return this.request("/bills/stats");
  },

  getDailyRegister(date = "") {
    const qs = date ? `?date=${encodeURIComponent(date)}` : "";
    return this.request(`/bills/daily-register${qs}`);
  },

  // Auth Configuration (Google Client ID etc.)
  getAuthConfig() {
    return this.request("/auth/config");
  },

  getWarrantyLocker(phone = "") {
    return this.request(`/bills/warranty-locker?phone=${encodeURIComponent(phone)}`);
  },

  getRecentCustomers() {
    return this.request("/bills/recent-customers");
  },

  getBillById(id) {
    return this.request(`/bills/${encodeURIComponent(id)}`);
  },

  cancelBill(id) {
    return this.request(`/bills/${encodeURIComponent(id)}/cancel`, {
      method: "PATCH"
    });
  },

  // Customer Orders Management
  getOrders(params = {}) {
    const query = new URLSearchParams(params);
    const suffix = query.toString() ? `?${query}` : "";
    return this.request(`/orders${suffix}`);
  },

  updateOrderStatus(id, status) {
    return this.request(`/orders/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  },

  getOrderById(id) {
    return this.request(`/orders/${encodeURIComponent(id)}`);
  },

  // Admin User & Staff Management
  getUsers() {
    return this.request("/admin/users");
  },

  updateUserRole(id, role) {
    return this.request(`/admin/users/${encodeURIComponent(id)}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role })
    });
  },

  deleteUser(id) {
    return this.request(`/admin/users/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
  }
};

window.zeshAPI = api;


/* =========================================
   CUSTOMER API
   Used by the Storefront E-Commerce App
========================================= */

const customerAPI = {
  get token() {
    return sessionStorage.getItem("zesh_customer_token") || localStorage.getItem("zesh_customer_token") || "";
  },

  get user() {
    try {
      return JSON.parse(
        sessionStorage.getItem("zesh_customer_user") || localStorage.getItem("zesh_customer_user") || "null"
      );
    } catch {
      return null;
    }
  },

  isLoggedIn() {
    return Boolean(this.token && this.user);
  },

  setAuth(token, user, remember = false) {
    if (token) {
      sessionStorage.setItem("zesh_customer_token", token);
      sessionStorage.setItem("zesh_customer_user", JSON.stringify(user));
      if (remember) {
        localStorage.setItem("zesh_customer_token", token);
        localStorage.setItem("zesh_customer_user", JSON.stringify(user));
      }
    } else {
      this.logout();
    }
  },

  async request(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    const token = this.token;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        this.logout();
      }
      throw new Error(data.message || `Request failed (${response.status})`);
    }

    return data;
  },

  // Customer registration
  async register({ name, email, password }) {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password })
    });
  },

  // Customer login
  async login(email, password, remember = false) {
    const data = await this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    if (!data.token) {
      throw new Error("Login failed: no token received.");
    }

    this.setAuth(data.token, data.user, remember);
    return data.user;
  },

  // Customer social login (Google, Facebook, WhatsApp, Apple)
  async socialLogin(provider, payload = {}) {
    const data = await this.request("/auth/social", {
      method: "POST",
      body: JSON.stringify({ provider, ...payload })
    });

    if (!data.token) {
      throw new Error(`Authentication with ${provider} failed.`);
    }

    this.setAuth(data.token, data.user, true);
    return data.user;
  },

  // WhatsApp OTP Authentication
  async sendWhatsAppOtp(phone, name = "") {
    return await this.request("/auth/whatsapp/send-otp", {
      method: "POST",
      body: JSON.stringify({ phone, name })
    });
  },

  async verifyWhatsAppOtp(phone, otp, name = "") {
    const data = await this.request("/auth/whatsapp/verify-otp", {
      method: "POST",
      body: JSON.stringify({ phone, otp, name })
    });

    if (!data.token) {
      throw new Error("WhatsApp verification failed: No token received.");
    }

    this.setAuth(data.token, data.user, true);
    return data.user;
  },

  // Google Identity Services (GIS) Verification
  async verifyGoogleAuth(credential, userInfo = null) {
    const data = await this.request("/auth/google/verify", {
      method: "POST",
      body: JSON.stringify({ credential, userInfo })
    });

    if (!data.token) {
      throw new Error("Google authentication failed.");
    }

    this.setAuth(data.token, data.user, true);
    return data.user;
  },

  // Profile
  async getProfile() {
    const data = await this.request("/auth/me");
    if (data.user) {
      sessionStorage.setItem("zesh_customer_user", JSON.stringify(data.user));
    }
    return data.user;
  },

  async updateProfile(updates) {
    const data = await this.request("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(updates)
    });
    if (data.user) {
      sessionStorage.setItem("zesh_customer_user", JSON.stringify(data.user));
    }
    return data.user;
  },

  // Orders
  createOrder(payload) {
    const body = Array.isArray(payload) ? { items: payload } : payload;
    return this.request("/orders", {
      method: "POST",
      body: JSON.stringify(body)
    });
  },

  getMyOrders() {
    return this.request("/orders/my");
  },

  getOrder(id) {
    return this.request(`/orders/${encodeURIComponent(id)}`);
  },

  // Auth Configuration (Google Client ID etc.)
  getAuthConfig() {
    return this.request("/auth/config");
  },

  getWarrantyLocker(phone = "") {
    return this.request(`/bills/warranty-locker?phone=${encodeURIComponent(phone)}`);
  },

  sendForgotPasswordOtp(email) {
    return this.request("/auth/forgot-password/send-otp", {
      method: "POST",
      body: JSON.stringify({ email })
    });
  },

  resetPasswordWithOtp(email, otp, newPassword) {
    return this.request("/auth/forgot-password/reset", {
      method: "POST",
      body: JSON.stringify({ email, otp, newPassword })
    });
  },

  logout() {
    sessionStorage.removeItem("zesh_customer_token");
    sessionStorage.removeItem("zesh_customer_user");
    localStorage.removeItem("zesh_customer_token");
    localStorage.removeItem("zesh_customer_user");
  }
};

window.zeshCustomerAPI = customerAPI;
