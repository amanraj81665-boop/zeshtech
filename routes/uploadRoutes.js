
const express = require("express");
const multer = require("multer");
const { Readable } = require("stream");

const cloudinary = require("../config/cloudinary");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
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

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "zesh-tech/products",
        resource_type: "image"
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    Readable.from(buffer).pipe(stream);
  });
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

      if (
        !process.env.CLOUDINARY_CLOUD_NAME ||
        !process.env.CLOUDINARY_API_KEY ||
        !process.env.CLOUDINARY_API_SECRET
      ) {
        return res.status(500).json({
          success: false,
          message: "Cloudinary environment variables are missing."
        });
      }

      const result = await uploadToCloudinary(file.buffer);

      return res.status(201).json({
        success: true,
        message: "Image uploaded successfully.",
        imageUrl: result.secure_url,
        imageUrls: [result.secure_url],
        publicId: result.public_id
      });
    } catch (error) {
      console.error("Cloudinary upload failed:", error.message);

      return res.status(502).json({
        success: false,
        message: "Image upload failed. Check Cloudinary settings."
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

      if (
        !process.env.CLOUDINARY_CLOUD_NAME ||
        !process.env.CLOUDINARY_API_KEY ||
        !process.env.CLOUDINARY_API_SECRET
      ) {
        return res.status(500).json({
          success: false,
          message: "Cloudinary credentials missing in environment."
        });
      }

      const uploadPromises = files.map(f => uploadToCloudinary(f.buffer));
      const results = await Promise.all(uploadPromises);
      const imageUrls = results.map(r => r.secure_url);

      return res.status(201).json({
        success: true,
        message: `${imageUrls.length} image(s) uploaded successfully.`,
        imageUrls,
        imageUrl: imageUrls[0]
      });
    } catch (error) {
      console.error("Cloudinary multi-image upload failed:", error.message);
      return res.status(502).json({
        success: false,
        message: "Multiple image upload failed. Check Cloudinary connection."
      });
    }
  }
);

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: error.code === "LIMIT_FILE_SIZE"
        ? "Image must be 5 MB or smaller."
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
