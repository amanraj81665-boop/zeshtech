
const express = require("express");
const multer = require("multer");
const { Readable } = require("stream");

const cloudinary = require("../config/cloudinary");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  },
  fileFilter(req, file, callback) {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif"
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(
        new Error("Only JPG, PNG, WEBP and AVIF images are allowed.")
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

router.post(
  "/product-image",
  authMiddleware,
  requireAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
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

      const result = await uploadToCloudinary(req.file.buffer);

      return res.status(201).json({
        success: true,
        message: "Image uploaded successfully.",
        imageUrl: result.secure_url,
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
