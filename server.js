
require("dotenv").config();

const express = require("express");
const path = require("path");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const orderRoutes = require("./routes/orderRoutes");
const billRoutes = require("./routes/billRoutes");
const adminUsersRoutes = require("./routes/adminUsersRoutes");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const app = express();
const PORT = process.env.PORT || 5000;

// High Security Headers
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow CDN resources (Lucide icons, Google fonts)
    crossOriginEmbedderPolicy: false
  })
);

// Rate Limiter for Authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication requests from this IP. Please try again after 15 minutes."
  }
});
app.use("/api/auth", authLimiter);

// NoSQL Injection Sanitizer
app.use((req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== "object") return;
    for (const key of Object.keys(obj)) {
      if (key.startsWith("$") || key.includes(".")) {
        delete obj[key];
      } else if (typeof obj[key] === "object") {
        sanitize(obj[key]);
      }
    }
  };
  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  next();
});

// Parse JSON request bodies
app.use(express.json({ limit: "20kb" }));

// Parse URL-encoded form bodies
app.use(express.urlencoded({ extended: false, limit: "20kb" }));

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    message: "ZESH-TECH server is running"
  });
});

// Register API routes BEFORE the 404 handlers
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/admin", adminUsersRoutes);
// Frontend static files
app.use(express.static(path.join(__dirname, "public")));

// Unknown API routes
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found"
  });
});

// Unknown non-API routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Page not found"
  });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error("Request error:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request body is too large"
    });
  }

  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request body"
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error"
  });
});

// Start server with resilient MongoDB connection & background retries
async function startServer() {
  const server = app.listen(PORT, () => {
    console.log(`ZESH-TECH running at http://localhost:${PORT}`);
  });

  server.on("error", (error) => {
    console.error("HTTP server error:", error.message);
  });

  async function tryConnect() {
    try {
      await connectDB();
      console.log("MongoDB connected successfully");
    } catch (error) {
      console.warn("MongoDB Atlas connection pending (IP whitelist check):", error.message);
      setTimeout(tryConnect, 10000);
    }
  }

  tryConnect();
}

startServer();

module.exports = app;
