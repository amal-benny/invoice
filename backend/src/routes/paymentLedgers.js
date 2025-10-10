// routes/paymentLedgers.js
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const auth = require("../middlewares/auth");

// List payment ledger categories for current user
router.get("/", auth, async (req, res) => {
  try {
    if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized" });

    const items = await prisma.paymentLedger.findMany({
      where: { createdById: req.user.id },
      orderBy: { createdAt: "desc" },
    });

    res.json(items);
  } catch (err) {
    console.error("GET /api/payment-ledgers error:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
});

// Create a new payment ledger category
router.post("/", auth, async (req, res) => {
  const { category } = req.body;
  try {
    if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized" });

    if (!category || typeof category !== "string") {
      return res.status(400).json({ message: "Category is required" });
    }

    const created = await prisma.paymentLedger.create({
      data: {
        category,
        createdBy: { connect: { id: req.user.id } },
      },
    });

    res.status(201).json(created);
  } catch (err) {
    console.error("POST /api/payment-ledgers error:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
});

// Update a payment ledger (owner or admin)
router.put("/:id", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid id" });

    const existing = await prisma.paymentLedger.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Payment ledger not found" });

    if (existing.createdById !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { category } = req.body;

    const updated = await prisma.paymentLedger.update({
      where: { id },
      data: {
        category: category !== undefined ? category : existing.category,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("PUT /api/payment-ledgers/:id error:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
});

// Delete a payment ledger (owner or admin)
router.delete("/:id", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid id" });

    const existing = await prisma.paymentLedger.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Payment ledger not found" });

    if (existing.createdById !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Not authorized" });
    }

    await prisma.paymentLedger.delete({ where: { id } });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("DELETE /api/payment-ledgers/:id error:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
});

module.exports = router;
