// routes/settings.js
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const auth = require("../middlewares/auth");
const fs = require("fs");
const multer = require("multer");
const path = require("path");

// ✅ Always resolve to top-level uploads directory
const UPLOAD_BASE = path.resolve(__dirname, "../../uploads");

// ✅ Ensure uploads folder exists
if (!fs.existsSync(UPLOAD_BASE)) {
  fs.mkdirSync(UPLOAD_BASE, { recursive: true });
}

// ✅ Sanitize filenames
function safeFilename(original) {
  const ext = path.extname(original);
  const base = path
    .basename(original, ext)
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_\.-]/g, "");
  return `${Date.now()}-${base}${ext}`;
}

// ✅ Multer storage setup (per-user folder)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uid = req.user && req.user.id ? String(req.user.id) : "anonymous";
    const userDir = path.join(UPLOAD_BASE, uid);
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: (req, file, cb) => cb(null, safeFilename(file.originalname)),
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"), false);
    }
    cb(null, true);
  },
});

// ✅ Get current user's settings
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

// ✅ Create or update settings
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

    let logoPath;
    if (req.file) {
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
      ...(logoPath ? { logoPath } : {}),
    };

    const existing = await prisma.companySettings.findFirst({
      where: { userId: req.user.id },
    });

    const result = existing
      ? await prisma.companySettings.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.companySettings.create({ data });

    res.json(result);
  } catch (err) {
    console.error(err);
    next(err);
  }
});

module.exports = router;
