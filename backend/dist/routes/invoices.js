"use strict";
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const auth = require("../middlewares/auth");
// Safe generateInvoiceNumber for concurrency
async function generateInvoiceNumber(prefix) {
    if (prefix !== "INV" && prefix !== "QTN") {
        throw new Error("Prefix must be 'INV' or 'QTN'");
    }
    return await prisma.$transaction(async (tx) => {
        const year = new Date().getFullYear();
        // Lock and get the latest invoice number
        const last = await tx.invoice.findFirst({
            where: { invoiceNumber: { startsWith: `${prefix}-${year}-` } },
            orderBy: { id: "desc" },
        });
        let nextNumber = 1;
        if (last?.invoiceNumber) {
            const match = last.invoiceNumber.match(/(\d+)$/);
            if (match)
                nextNumber = parseInt(match[1], 10) + 1;
        }
        return `${prefix}-${year}-${String(nextNumber).padStart(3, "0")}`;
    });
}
/* Routes:
POST   /api/invoices        -> create invoice/quote
POST   /api/invoices/:id/convert -> convert quote to invoice (assigns invoiceNumber)
GET    /api/invoices        -> list invoices (only own)
GET    /api/invoices/:id    -> view invoice (only own)
PUT    /api/invoices/:id    -> edit invoice + replace items (only own)
DELETE /api/invoices/:id    -> delete invoice (only own)
*/
// Create invoice or quote
router.post("/", auth, async (req, res) => {
    const { type = "INVOICE", customerId, dueDate, items = [], remark, note, currency = "INR", advancePaid: frontendAdvance = 0, // <-- global advance from frontend
     } = req.body;
    try {
        const created = await prisma.$transaction(async (tx) => {
            const prefix = type === "QUOTE" ? "QTN" : "INV";
            const invoiceNumber = await generateInvoiceNumber(prefix);
            let subtotal = 0, totalGST = 0, totalDiscount = 0, advanceFromItems = 0;
            for (const it of items) {
                const qty = it.quantity || 1;
                const price = parseFloat(it.price) || 0;
                const discount = parseFloat(it.discount) || 0;
                const advance = parseFloat(it.advance) || 0;
                const lineBase = qty * price - discount;
                subtotal += qty * price;
                totalDiscount += discount;
                totalGST += it.gstPercent
                    ? (lineBase * parseFloat(it.gstPercent)) / 100
                    : 0;
                advanceFromItems += advance;
            }
            const totalAdvance = advanceFromItems + parseFloat(frontendAdvance || 0);
            const total = subtotal - totalDiscount + totalGST - totalAdvance;
            const inv = await tx.invoice.create({
                data: {
                    invoiceNumber,
                    type,
                    customerId: customerId || undefined,
                    dueDate: dueDate ? new Date(dueDate) : undefined,
                    createdById: req.user.id,
                    subtotal,
                    totalDiscount,
                    totalGST,
                    advancePaid: totalAdvance, // <-- save global + item advance
                    total,
                    remark,
                    currency,
                    note
                },
            });
            if (items.length > 0) {
                const createItems = items.map((it) => ({
                    invoiceId: inv.id,
                    description: it.description || "",
                    category: it.category || null,
                    quantity: it.quantity || 1,
                    price: it.price || 0,
                    gstPercent: it.gstPercent || null,
                    discount: it.discount || null,
                    advance: it.advance || null, // only item-specific advance
                    remark: it.remark || null,
                    hsn: it.hsn || null,
                }));
                await tx.invoiceItem.createMany({ data: createItems });
            }
            return inv;
        });
        const invoiceWithItems = await prisma.invoice.findUnique({
            where: { id: created.id },
            include: { items: true, customer: true, payments: true },
        });
        res.json(invoiceWithItems);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});
//
// Convert quote to invoice
//
router.post("/:id/convert", auth, async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const invoice = await prisma.invoice.findUnique({ where: { id } });
        if (!invoice)
            return res.status(404).json({ message: "Invoice not found" });
        if (invoice.createdById !== req.user.id)
            return res.status(403).json({ message: "Not authorized" });
        if (invoice.type === "INVOICE")
            return res.json(invoice);
        const invoiceNumber = await generateInvoiceNumber("INV");
        const updated = await prisma.invoice.update({
            where: { id },
            data: { type: "INVOICE", invoiceNumber }
        });
        res.json(updated);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});
//
// List invoices (only own)
//
router.get("/", auth, async (req, res) => {
    try {
        const { status } = req.query;
        const where = { createdById: req.user.id };
        if (status)
            where.status = status;
        const invoices = await prisma.invoice.findMany({
            where,
            include: { customer: true, items: true, payments: true },
            orderBy: { createdAt: "desc" }
        });
        res.json(invoices);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});
//
// View invoice (only own)
//
router.get("/:id", auth, async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const invoice = await prisma.invoice.findUnique({ where: { id }, include: { items: true, payments: true, customer: true } });
        if (!invoice)
            return res.status(404).json({ message: "Invoice not found" });
        if (invoice.createdById !== req.user.id)
            return res.status(403).json({ message: "Not authorized" });
        res.json(invoice);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});
//
// Edit invoice (update invoice fields and replace items) - only owner
//
router.put("/:id", auth, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id))
        return res.status(400).json({ message: "Invalid invoice ID" });
    const { type, customerId, dueDate, remark, currency, items = [], advancePaid: frontendAdvance = 0, note, } = req.body;
    try {
        const existing = await prisma.invoice.findUnique({
            where: { id },
            include: { items: true },
        });
        if (!existing)
            return res.status(404).json({ message: "Invoice not found" });
        if (existing.createdById !== req.user.id)
            return res.status(403).json({ message: "Not authorized" });
        // Validate customerId safely
        let parsedCustomerId = null;
        if (customerId !== undefined && customerId !== null) {
            parsedCustomerId = Number(customerId);
            const customerExists = await prisma.customer.findUnique({
                where: { id: parsedCustomerId },
            });
            if (!customerExists) {
                return res.status(400).json({ message: "Invalid customerId" });
            }
        }
        const parsedDueDate = dueDate ? new Date(dueDate) : existing.dueDate;
        const parsedAdvance = frontendAdvance ? Number(frontendAdvance) : 0;
        // Compute totals safely
        let subtotal = 0, totalGST = 0, totalDiscount = 0, advanceFromItems = 0;
        const safeItems = items.map((it) => ({
            description: it.description || "",
            category: it.category || null,
            quantity: Number(it.quantity) || 1,
            price: Number(it.price) || 0,
            gstPercent: it.gstPercent !== undefined && it.gstPercent !== null ? Number(it.gstPercent) : null,
            discount: it.discount !== undefined && it.discount !== null ? Number(it.discount) : null,
            advance: it.advance !== undefined && it.advance !== null ? Number(it.advance) : 0,
            remark: it.remark || null,
            hsn: it.hsn || null,
        }));
        for (const it of safeItems) {
            const lineBase = it.quantity * it.price - (it.discount || 0);
            subtotal += it.quantity * it.price;
            totalDiscount += it.discount || 0;
            totalGST += it.gstPercent ? (lineBase * it.gstPercent) / 100 : 0;
            advanceFromItems += it.advance || 0;
        }
        const totalAdvance = advanceFromItems + parsedAdvance;
        const total = subtotal - totalDiscount + totalGST - totalAdvance;
        const updatedInvoice = await prisma.$transaction(async (tx) => {
            const inv = await tx.invoice.update({
                where: { id },
                data: {
                    type: type || existing.type,
                    customerId: parsedCustomerId, // safe now
                    dueDate: parsedDueDate,
                    remark: remark !== undefined ? remark : existing.remark,
                    currency: currency || existing.currency,
                    note: note !== undefined ? note : existing.note,
                    subtotal,
                    totalGST,
                    totalDiscount,
                    advancePaid: totalAdvance,
                    total,
                },
            });
            // Replace items
            await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
            if (safeItems.length > 0) {
                await tx.invoiceItem.createMany({
                    data: safeItems.map((it) => ({ invoiceId: id, ...it })),
                });
            }
            return inv;
        });
        const invoiceWithItems = await prisma.invoice.findUnique({
            where: { id: updatedInvoice.id },
            include: { items: true, customer: true, payments: true },
        });
        res.json(invoiceWithItems);
    }
    catch (err) {
        console.error("PUT /api/invoices/:id failed:", err);
        res.status(500).json({ message: "Failed to update invoice", error: err.message });
    }
});
router.delete("/:id", auth, async (req, res) => {
    const id = Number(req.params.id);
    try {
        const invoice = await prisma.invoice.findUnique({ where: { id } });
        if (!invoice)
            return res.status(404).json({ message: "Invoice not found" });
        if (invoice.createdById !== req.user.id)
            return res.status(403).json({ message: "Not authorized" });
        await prisma.$transaction(async (tx) => {
            await tx.payment.deleteMany({ where: { invoiceId: id } });
            await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
            await tx.invoice.delete({ where: { id } });
        });
        res.json({ success: true });
    }
    catch (err) {
        console.error("Delete invoice error:", err);
        res.status(500).json({ message: "Failed to delete invoice" });
    }
});
module.exports = router;
