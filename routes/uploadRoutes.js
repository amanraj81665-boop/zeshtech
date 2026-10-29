
const express = require("express");
const multer = require("multer");
const { Readable } = require("stream");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const cloudinary = require("../config/cloudinary");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const uploadDir = path.join(__dirname, "../public/images/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB limit to support high-res mobile camera shots
    files: 10
  },
  fileFilter(req, file, callback) {
    const mt = (file.mimetype || "").toLowerCase();
    const isImage = mt.startsWith("image/") ||
      [".jpg", ".jpeg", ".png", ".webp", ".avif", ".heic", ".heif"].some(ext =>
        (file.originalname || "").toLowerCase().endsWith(ext)
      );

    if (!isImage) {
      return callback(
        new Error("Only standard image formats (JPG, PNG, WEBP, AVIF, HEIC) are allowed.")
      );
    }

    callback(null, true);
  }
});

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin permission required."
    });
  }

  next();
}

// Upload to Cloudinary with automatic local disk fallback if network fails
async function saveImageSafe(file) {
  const hasCloudinary =
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET;

  if (hasCloudinary) {
    try {
      const cRes = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "zesh-tech/products",
            resource_type: "image",
            quality: "auto",
            fetch_format: "auto"
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        Readable.from(file.buffer).pipe(stream);
      });
      return cRes.secure_url;
    } catch (cErr) {
      console.warn("Cloudinary upload failed, falling back to local file storage:", cErr.message);
    }
  }

  // Local disk fallback
  const ext = path.extname(file.originalname || "") || ".jpg";
  const uniqueName = `prod_${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`;
  const filePath = path.join(uploadDir, uniqueName);
  await fs.promises.writeFile(filePath, file.buffer);
  return `/images/uploads/${uniqueName}`;
}

// Single Image Upload
router.post(
  "/product-image",
  authMiddleware,
  requireAdmin,
  upload.any(),
  async (req, res) => {
    try {
      const file = (req.files && req.files[0]) || req.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          message: "Please select an image."
        });
      }

      const imageUrl = await saveImageSafe(file);

      return res.status(201).json({
        success: true,
        message: "Image uploaded successfully.",
        imageUrl,
        imageUrls: [imageUrl]
      });
    } catch (error) {
      console.error("Image upload failed:", error.message);

      return res.status(500).json({
        success: false,
        message: error.message || "Image upload failed."
      });
    }
  }
);

// Multi-image upload for Product Gallery & Color Variants (Supports multiple files from any input)
router.post(
  "/product-images",
  authMiddleware,
  requireAdmin,
  upload.any(),
  async (req, res) => {
    try {
      const files = req.files || (req.file ? [req.file] : []);
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Please select at least one image file."
        });
      }

      const imageUrls = [];
      for (const f of files) {
        const url = await saveImageSafe(f);
        imageUrls.push(url);
      }

      return res.status(201).json({
        success: true,
        message: `${imageUrls.length} image(s) uploaded successfully.`,
        imageUrls,
        imageUrl: imageUrls[0]
      });
    } catch (error) {
      console.error("Multi-image upload failed:", error.message);
      return res.status(500).json({
        success: false,
        message: error.message || "Multiple image upload failed."
      });
    }
  }
);

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: error.code === "LIMIT_FILE_SIZE"
        ? "Image must be 20 MB or smaller."
        : "Invalid image upload."
    });
  }

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Image upload failed."
    });
  }

  next();
});

module.exports = router;
