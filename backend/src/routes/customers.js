
// routes/customers.js
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const auth = require("../middlewares/auth");

// create customer (user-specific)
router.post("/", auth, async (req, res) => {
  const { name, company, email, phone, address, panNumber, gstNumber,stateName, stateCode } = req.body;
  try {
    if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized" });

    const customer = await prisma.customer.create({
      data: {
        name,
        company,
        email,
        phone,
        address,
        panNumber: panNumber || null,
        gstNumber: gstNumber || null,
        stateName: stateName || null,
        stateCode: stateCode || null,
        createdBy: { connect: { id: req.user.id } }
      }
    });

    res.json(customer);
  } catch (err) {
    console.error("POST /api/customers error:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
});

// list customers for current user
router.get("/", auth, async (req, res) => {
  try {
    if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized" });
    const customers = await prisma.customer.findMany({
      where: { createdById: req.user.id },
      include: { invoices: true }
    });
    res.json(customers);
  } catch (err) {
    console.error("GET /api/customers error:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
});

// update a customer (owner or admin)
router.put("/:id", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid id" });

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Customer not found" });

    // allow if owner or admin
    if (existing.createdById !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { name, company, email, phone, address, panNumber, gstNumber,stateName,stateCode } = req.body;

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        company: company !== undefined ? company : existing.company,
        email: email !== undefined ? email : existing.email,
        phone: phone !== undefined ? phone : existing.phone,
        address: address !== undefined ? address : existing.address,
        panNumber: panNumber !== undefined ? panNumber : existing.panNumber,
        gstNumber: gstNumber !== undefined ? gstNumber : existing.gstNumber,
        stateName: stateName !== undefined ? stateName : existing.stateName,
        stateCode: stateCode !== undefined ? stateCode : existing.stateCode,
      }
    });

    res.json(updated);
  } catch (err) {
    console.error("PUT /api/customers/:id error:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
});

// delete a customer (owner or admin)
router.delete("/:id", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid id" });

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Customer not found" });

    // allow if owner or admin
    if (existing.createdById !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Not authorized" });
    }

    await prisma.customer.delete({ where: { id } });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("DELETE /api/customers/:id error:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
});

module.exports = router;
