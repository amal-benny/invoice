// routes/quotationCategories.js
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const auth = require("../middlewares/auth");

// List quotation categories for current user
router.get("/", auth, async (req, res) => {
  try {
    if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized" });

    const items = await prisma.quotationCategory.findMany({
      where: { createdById: req.user.id },
      orderBy: { createdAt: "desc" },
    });

    res.json(items);
  } catch (err) {
    console.error("GET /api/quotation-categories error:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
});

// Create a new quotation category
router.post("/", auth, async (req, res) => {
  const { category, description, hsn, price } = req.body;
  try {
    if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized" });

    if (!category || typeof category !== "string") {
      return res.status(400).json({ message: "Category is required" });
    }

    const created = await prisma.quotationCategory.create({
      data: {
        category,
        description: description || null,
        hsn: hsn || null,
        price: price !== undefined && price !== null ? Number(price) : null,
        createdBy: { connect: { id: req.user.id } },
      },
    });

    res.status(201).json(created);
  } catch (err) {
    console.error("POST /api/quotation-categories error:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
});

// Update a quotation category (owner or admin)
router.put("/:id", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid id" });

    const existing = await prisma.quotationCategory.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Quotation category not found" });

    if (existing.createdById !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { category, description, hsn, price } = req.body;

    const updated = await prisma.quotationCategory.update({
      where: { id },
      data: {
        category: category !== undefined ? category : existing.category,
        description: description !== undefined ? description : existing.description,
        hsn: hsn !== undefined ? hsn : existing.hsn,
        price: price !== undefined ? (price === null ? null : Number(price)) : existing.price,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("PUT /api/quotation-categories/:id error:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
});

// Delete a quotation category (owner or admin)
router.delete("/:id", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid id" });

    const existing = await prisma.quotationCategory.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Quotation category not found" });

    if (existing.createdById !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Not authorized" });
    }

    await prisma.quotationCategory.delete({ where: { id } });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("DELETE /api/quotation-categories/:id error:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
});

module.exports = router;
