// routes/settings.js
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const auth = require("../middlewares/auth");
const fs = require("fs");
const multer = require("multer");
const path = require("path");

// Base uploads folder (common)
const UPLOAD_BASE = path.join(__dirname, "../../uploads");

// Ensure uploads root exists
if (!fs.existsSync(UPLOAD_BASE)) {
  fs.mkdirSync(UPLOAD_BASE, { recursive: true });
}

// make filenames safe and keep extension
function safeFilename(original) {
  const ext = path.extname(original) || "";
  const name = path.basename(original, ext)
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_\.-]/g, "");
  return `${Date.now()}-${name}${ext}`;
}

// Multer storage: destination depends on logged-in user (per-user folder)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // req.user should be populated by auth middleware
    const uid = req.user && req.user.id ? String(req.user.id) : "anonymous";
    const userDir = path.join(UPLOAD_BASE, uid);
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: (req, file, cb) => cb(null, safeFilename(file.originalname)),
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files allowed"), false);
    }
    cb(null, true);
  },
});

// GET settings for current user
router.get("/", auth, async (req, res, next) => {
  try {
    const settings = await prisma.companySettings.findFirst({
      where: { userId: req.user.id },
    });
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

// POST create/update settings for current user
router.post("/", auth, upload.single("logo"), async (req, res, next) => {
  try {
    const {
      name,
      address,
      contact,
      gstNumber,
      panNumber,
      currency,
      taxPercent,
      taxType,
      stateName,
      stateCode,
    } = req.body;

    // If a file was uploaded, build a web-path to it.
    // If your static server serves /uploads from the project root, use that.
    // Since we store per-user in uploads/<userId>/filename, create a path that includes the user id.
    let logoPath;
    if (req.file) {
      // Example: /uploads/<userId>/<filename>
      const uid = req.user && req.user.id ? String(req.user.id) : "anonymous";
      logoPath = `/uploads/${uid}/${req.file.filename}`;
    }

    const data = {
      userId: req.user.id,
      name: name || null,
      address: address || null,
      contact: contact || null,
      gstNumber: gstNumber || null,
      panNumber: panNumber || null,
      currency: currency || "INR",
      stateName: stateName || null,
      stateCode: stateCode || null,
      taxPercent: taxPercent ? parseFloat(taxPercent) : null,
      taxType: taxType || null,
      // logoPath only set if file uploaded; otherwise leave as is in DB
      ...(logoPath ? { logoPath } : {}),
    };

    // --- REPLACED UPSERT WITH FIND -> CREATE/UPDATE (works without making userId unique) ---
    let result;

    const existingSettings = await prisma.companySettings.findFirst({
      where: { userId: req.user.id },
    });

    if (!existingSettings) {
      // create new settings
      result = await prisma.companySettings.create({
        data,
      });
    } else {
      // update existing settings by its id
      result = await prisma.companySettings.update({
        where: { id: existingSettings.id },
        data,
      });
    }
    // -------------------------------------------------------------------------------

    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
