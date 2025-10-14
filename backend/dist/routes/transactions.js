"use strict";
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
// --- Create starting balance (only one per method) ---
router.post("/balance", auth, async (req, res) => {
    const { amount, method } = req.body; // method = "Cash" | "Bank"
    // Check if balance already exists for this user & method
    const existing = await prisma.startingBalance.findFirst({
        where: { createdById: req.user.id, method },
    });
    if (existing) {
        return res.status(400).json({
            message: `Starting balance for ${method} already exists. Use PUT to update.`
        });
    }
    const balance = await prisma.startingBalance.create({
        data: {
            amount: parseFloat(amount),
            method,
            createdById: req.user.id
        },
    });
    res.json(balance);
});
// --- Update starting balance ---
router.put("/balance/:id", auth, async (req, res) => {
    const { amount, method } = req.body;
    // Optional: ensure the method change does not conflict with existing balance
    const conflict = await prisma.startingBalance.findFirst({
        where: { createdById: req.user.id, method, id: { not: parseInt(req.params.id) } }
    });
    if (conflict) {
        return res.status(400).json({
            message: `Another starting balance for ${method} already exists.`
        });
    }
    const balance = await prisma.startingBalance.update({
        where: { id: parseInt(req.params.id) },
        data: { amount: parseFloat(amount), method },
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
    if (type)
        filter.type = type;
    if (category)
        filter.category = category;
    if (startDate || endDate) {
        filter.date = {};
        if (startDate)
            filter.date.gte = new Date(startDate);
        if (endDate)
            filter.date.lte = new Date(endDate);
    }
    const transactions = await prisma.transaction.findMany({
        where: filter,
        orderBy: { date: "asc" }, // ASC to calculate running balance
    });
    // Fetch starting balances
    const balances = await prisma.startingBalance.findMany({
        where: { createdById: req.user.id },
    });
    let cashBalance = balances.filter(b => b.method === "Cash").reduce((a, b) => b.amount, 0);
    let bankBalance = balances.filter(b => b.method === "Bank").reduce((a, b) => b.amount, 0);
    let runningBalanceCash = cashBalance;
    let runningBalanceBank = bankBalance;
    const txWithClosing = transactions.map(tx => {
        if (tx.method === "Cash") {
            runningBalanceCash += tx.type === "INCOME" ? tx.amount : -tx.amount;
            return { ...tx, closingBalance: runningBalanceCash };
        }
        else {
            runningBalanceBank += tx.type === "INCOME" ? tx.amount : -tx.amount;
            return { ...tx, closingBalance: runningBalanceBank };
        }
    });
    res.json(txWithClosing);
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
