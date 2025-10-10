
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const auth = require("../middlewares/auth");
const fs = require("fs");
const multer = require("multer");
const path = require("path");

// Ensure uploads folder exists
const UPLOAD_DIR = path.join(__dirname, "../../uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function safeFilename(original) {
  return Date.now() + "-" + original.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_\.-]/g, "");
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => cb(null, safeFilename(file.originalname))
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Only image files allowed"), false);
    cb(null, true);
  }
});

// GET settings
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

// POST create/update settings
router.post("/", auth, upload.single("logo"), async (req, res, next) => {
  try {
    const { name, address, contact, gstNumber,panNumber, currency, taxPercent, taxType,stateName, stateCode  } = req.body;
    const logoPath = req.file ? `/uploads/${req.file.filename}` : undefined;

    let existing = await prisma.companySettings.findFirst({
      where: { userId: req.user.id },
    });

    const data = {
      userId: req.user.id,
      name,
      address,
      contact,
      gstNumber,
      panNumber, 
      currency,
      stateName,
      stateCode ,
      taxPercent: taxPercent ? parseFloat(taxPercent) : undefined,
      taxType: taxType || undefined,
    };
    if (logoPath) data.logoPath = logoPath;

    let result;
    if (!existing) {
      result = await prisma.companySettings.create({ data });
    } else {
      result = await prisma.companySettings.update({
        where: { id: existing.id },
        data,
      });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;


