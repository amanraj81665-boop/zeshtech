"use strict";

const API_BASE = "/api";

/* =========================================
   OWNER / ADMIN API
   Used by the Owner Dashboard & POS Terminal
========================================= */

const api = {
  token: sessionStorage.getItem("zesh_admin_token") || localStorage.getItem("zesh_admin_token") || "",

  setToken(token, persist = false) {
    this.token = token || "";
    if (this.token) {
      sessionStorage.setItem("zesh_admin_token", this.token);
      if (persist) localStorage.setItem("zesh_admin_token", this.token);
    } else {
      sessionStorage.removeItem("zesh_admin_token");
      localStorage.removeItem("zesh_admin_token");
      sessionStorage.removeItem("zesh_admin_user");
    }
  },

  getUser() {
    try {
      return JSON.parse(sessionStorage.getItem("zesh_admin_user") || "null");
    } catch {
      return null;
    }
  },

  async request(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        this.setToken("");
      }
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  },

  // Authentication
  async login(email, password, remember = false) {
    const data = await this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    if (!data.token || data.user?.role !== "admin") {
      throw new Error("Admin privileges required to access the Owner Portal.");
    }

    this.setToken(data.token, remember);
    sessionStorage.setItem("zesh_admin_user", JSON.stringify(data.user));
    return data.user;
  },

  logout() {
    this.setToken("");
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

    const headers = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
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

  logout() {
    sessionStorage.removeItem("zesh_customer_token");
    sessionStorage.removeItem("zesh_customer_user");
    localStorage.removeItem("zesh_customer_token");
    localStorage.removeItem("zesh_customer_user");
  }
};

window.zeshCustomerAPI = customerAPI;
