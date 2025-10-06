const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const auth = require("../middlewares/auth");

// --- Starting Balance ---
router.get("/balance", auth, async (req, res) => {
  const balances = await prisma.startingBalance.findMany({
    where: { createdById: req.user.id },
    orderBy: { date: "desc" },
  });
  res.json(balances);
});

router.post("/balance", auth, async (req, res) => {
  const { amount } = req.body;
  const balance = await prisma.startingBalance.create({
    data: { amount: parseFloat(amount), createdById: req.user.id },
  });
  res.json(balance);
});

router.put("/balance/:id", auth, async (req, res) => {
  const { amount } = req.body;
  const balance = await prisma.startingBalance.update({
    where: { id: parseInt(req.params.id) },
    data: { amount: parseFloat(amount) },
  });
  res.json(balance);
});

router.delete("/balance/:id", auth, async (req, res) => {
  await prisma.startingBalance.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ message: "Deleted" });
});

// --- Transactions ---
router.get("/", auth, async (req, res) => {
  const { type, category, startDate, endDate } = req.query;
  const filter = { createdById: req.user.id };

  if (type) filter.type = type;
  if (category) filter.category = category;
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.gte = new Date(startDate);
    if (endDate) filter.date.lte = new Date(endDate);
  }

  const transactions = await prisma.transaction.findMany({
    where: filter,
    orderBy: { date: "desc" },
  });
  res.json(transactions);
});

router.post("/", auth, async (req, res) => {
  const { type, category, amount, date, description, method, reference } = req.body;
  const txn = await prisma.transaction.create({
    data: {
      type,
      category,
      amount: parseFloat(amount),
      date: date ? new Date(date) : new Date(),
      description,
      method,
      reference,
      createdById: req.user.id,
    },
  });
  res.json(txn);
});

router.delete("/:id", auth, async (req, res) => {
  await prisma.transaction.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ message: "Deleted" });
});

module.exports = router;
