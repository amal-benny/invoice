"use strict";
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const auth = require("../middlewares/auth");
/**
 * Transaction-safe invoice number generator
 * Ensures uniqueness even under concurrent transactions
 */
async function generateInvoiceNumber(tx) {
    const year = new Date().getFullYear();
    // Atomic upsert + increment
    const seq = await tx.invoiceSequence.upsert({
        where: { year },
        create: { year, last: 1 },
        update: { last: { increment: 1 } },
    });
    let nextNumber = seq.last;
    let invoiceNumber = `INV-${year}-${String(nextNumber).padStart(3, "0")}`;
    // Extremely rare: ensure invoice number is unique in invoice table
    const exists = await tx.invoice.findUnique({ where: { invoiceNumber } });
    if (exists) {
        const updatedSeq = await tx.invoiceSequence.update({
            where: { year },
            data: { last: { increment: 1 } },
        });
        nextNumber = updatedSeq.last;
        invoiceNumber = `INV-${year}-${String(nextNumber).padStart(3, "0")}`;
    }
    return invoiceNumber;
}
/**
 * Routes:
 * POST   /api/invoices        -> create invoice/quote
 * POST   /api/invoices/:id/convert -> convert quote to invoice
 * GET    /api/invoices        -> list invoices
 * GET    /api/invoices/:id    -> view invoice
 * PUT    /api/invoices/:id    -> edit invoice + replace items
 * DELETE /api/invoices/:id    -> delete invoice
 */
// ---------------------- CREATE INVOICE / QUOTE ----------------------
router.post("/", auth, async (req, res) => {
    const { type = "INVOICE", customerId, dueDate, items = [], remark, note, currency = "INR", advancePaid: frontendAdvance = 0, } = req.body;
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const created = await prisma.$transaction(async (tx) => {
                // Generate unique invoice number inside transaction
                const invoiceNumber = await generateInvoiceNumber(tx);
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
                // Create invoice
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
                        advancePaid: totalAdvance,
                        total,
                        remark,
                        currency,
                        note,
                    },
                });
                // Create invoice items
                if (items.length > 0) {
                    const createItems = items.map((it) => ({
                        invoiceId: inv.id,
                        description: it.description || "",
                        category: it.category || null,
                        quantity: it.quantity || 1,
                        price: it.price || 0,
                        gstPercent: it.gstPercent || null,
                        discount: it.discount || null,
                        advance: it.advance || null,
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
            return res.json(invoiceWithItems);
        }
        catch (err) {
            if (err?.code === "P2002" && attempt < MAX_ATTEMPTS) {
                console.warn(`Invoice number conflict, retrying attempt ${attempt + 1}`);
                await new Promise((r) => setTimeout(r, 50 * attempt));
                continue;
            }
            console.error(err);
            return res.status(500).json({ message: err.message || String(err) });
        }
    }
});
// ---------------------- CONVERT QUOTE TO INVOICE ----------------------
router.post("/:id/convert", auth, async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const updated = await prisma.$transaction(async (tx) => {
            const invoice = await tx.invoice.findUnique({ where: { id } });
            if (!invoice)
                throw { status: 404, message: "Invoice not found" };
            if (invoice.createdById !== req.user.id)
                throw { status: 403, message: "Not authorized" };
            if (invoice.type === "INVOICE") {
                // Already converted
                return invoice;
            }
            const invoiceNumber = await generateInvoiceNumber(tx);
            const upd = await tx.invoice.update({
                where: { id },
                data: { type: "INVOICE", invoiceNumber },
            });
            return upd;
        });
        res.json(updated);
    }
    catch (err) {
        if (err?.status)
            return res.status(err.status).json({ message: err.message });
        console.error("Convert quote error:", err);
        res.status(500).json({ message: err.message || "Failed to convert quotation" });
    }
});
// ---------------------- LIST INVOICES ----------------------
router.get("/", auth, async (req, res) => {
    try {
        const { status } = req.query;
        const where = { createdById: req.user.id };
        if (status)
            where.status = status;
        const invoices = await prisma.invoice.findMany({
            where,
            include: { customer: true, items: true, payments: true },
            orderBy: { createdAt: "desc" },
        });
        res.json(invoices);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});
// ---------------------- VIEW INVOICE ----------------------
router.get("/:id", auth, async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: { items: true, payments: true, customer: true },
        });
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
// ---------------------- EDIT INVOICE ----------------------
router.put("/:id", auth, async (req, res) => {
    const id = parseInt(req.params.id);
    const { type, customerId, dueDate, remark, currency, items = [], advancePaid: frontendAdvance = 0, } = req.body;
    try {
        const existing = await prisma.invoice.findUnique({
            where: { id },
            include: { items: true },
        });
        if (!existing)
            return res.status(404).json({ message: "Invoice not found" });
        if (existing.createdById !== req.user.id)
            return res.status(403).json({ message: "Not authorized" });
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
        const result = await prisma.$transaction(async (tx) => {
            const updatedInv = await tx.invoice.update({
                where: { id },
                data: {
                    type: type || existing.type,
                    customerId: customerId || existing.customerId,
                    dueDate: dueDate ? new Date(dueDate) : existing.dueDate,
                    remark: remark !== undefined ? remark : existing.remark,
                    currency: currency || existing.currency,
                    note: req.body.note !== undefined ? req.body.note : existing.note,
                    subtotal,
                    totalGST,
                    totalDiscount,
                    advancePaid: totalAdvance,
                    total,
                },
            });
            await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
            if (items.length > 0) {
                const createItems = items.map((it) => ({
                    invoiceId: id,
                    description: it.description || "",
                    category: it.category || null,
                    quantity: it.quantity || 1,
                    price: it.price || 0,
                    gstPercent: it.gstPercent || null,
                    discount: it.discount || null,
                    advance: it.advance || null,
                    remark: it.remark || null,
                    hsn: it.hsn || null,
                }));
                await tx.invoiceItem.createMany({ data: createItems });
            }
            return updatedInv;
        });
        const invoiceWithItems = await prisma.invoice.findUnique({
            where: { id: result.id },
            include: { items: true, customer: true, payments: true },
        });
        res.json(invoiceWithItems);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});
// ---------------------- DELETE INVOICE ----------------------
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
