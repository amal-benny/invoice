"use strict";
const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = Router();
// Helper: get start date for filter
function getStartDate(filter) {
    const now = new Date();
    switch (filter) {
        case "today":
            return new Date(now.getFullYear(), now.getMonth(), now.getDate());
        case "week":
            const firstDayOfWeek = now.getDate() - now.getDay(); // Sunday = 0
            return new Date(now.getFullYear(), now.getMonth(), firstDayOfWeek);
        case "month":
            return new Date(now.getFullYear(), now.getMonth(), 1);
        default:
            return new Date(0); // all time
    }
}
// --- Invoices Report ---
router.get("/invoices", async (req, res) => {
    const filter = req.query.filter;
    const startDate = getStartDate(filter);
    try {
        const invoices = await prisma.invoice.findMany({
            where: { date: { gte: startDate } },
            select: { id: true, status: true },
        });
        res.json(invoices);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch invoices" });
    }
});
// --- Payments Report ---
router.get("/payments", async (req, res) => {
    const filter = req.query.filter;
    const startDate = getStartDate(filter);
    try {
        const payments = await prisma.payment.findMany({
            where: { date: { gte: startDate } },
            select: { id: true, status: true },
        });
        res.json(payments);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch payments" });
    }
});
// --- Customers Report ---
router.get("/customers", async (req, res) => {
    const filter = req.query.filter;
    const startDate = getStartDate(filter);
    try {
        const customers = await prisma.customer.findMany({
            where: { createdAt: { gte: startDate } },
            select: { id: true, name: true },
        });
        res.json(customers);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch customers" });
    }
});
module.exports = router;
