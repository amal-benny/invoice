// src/routes/invoices.js
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const auth = require("../middlewares/auth");

/**
 * generateInvoiceNumber(tx, prefix, userId)
 * Uses MySQL atomic INSERT ... ON DUPLICATE KEY UPDATE ... LAST_INSERT_ID(...) trick
 * to atomically increment the `last` counter and return the new value within the same DB connection.
 *
 * Must be run with a transaction client `tx` (the client passed to prisma.$transaction callback)
 * so that LAST_INSERT_ID() is reliable for that connection.
 */
async function generateInvoiceNumber(tx, prefix, userId, maxAttempts = 10) {
  if (prefix !== "INV" && prefix !== "QTN") {
    throw new Error("Prefix must be 'INV' or 'QTN'");
  }

  const year = new Date().getFullYear();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // increment sequence atomically for this connection
    await tx.$executeRaw`
      INSERT INTO invoice_sequences (userId, year, prefix, last)
      VALUES (${userId}, ${year}, ${prefix}, 1)
      ON DUPLICATE KEY UPDATE last = LAST_INSERT_ID(last + 1)
    `;

    const res = await tx.$queryRaw`SELECT LAST_INSERT_ID() as last`;
    const seqNumber = Number(res && res[0] && (res[0].last ?? res[0]["LAST_INSERT_ID()"]));
    if (!seqNumber || isNaN(seqNumber)) {
      throw new Error("Failed to read invoice sequence number");
    }

    const padded = String(seqNumber).padStart(3, "0");
    const candidate = `${prefix}-${year}-${padded}`;

    // Check for existing invoice with this number in the same transaction/connection
    const existing = await tx.invoice.findFirst({ where: { invoiceNumber: candidate } });
    if (!existing) {
      return candidate;
    }

    // If exists, loop again to increment sequence and try next number.
    // The next loop iteration will call the upsert and LAST_INSERT_ID will increment.
  }

  throw new Error("Failed to generate unique invoice number after multiple attempts");
}

/**
 * Helper: attempt to create invoice inside a transaction; retry on P2002
 */
async function createInvoiceWithRetries(txFactoryFn, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await txFactoryFn();
    } catch (err) {
      lastErr = err;
      // If duplicate invoice number, retry (will regenerate sequence next attempt)
      if (err && err.code === "P2002") {
        // small backoff (optional)
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 50 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

/**
 * POST / -> create invoice or quote
 */
router.post("/", auth, async (req, res) => {
  const {
    type = "INVOICE",
    customerId,
    dueDate,
    items = [],
    remark,
    note,
    currency = "INR",
    advancePaid: frontendAdvance = 0,
  } = req.body;

  try {
    // We'll retry the whole transaction on P2002 a few times (defensive)
    const created = await createInvoiceWithRetries(async () =>
      prisma.$transaction(async (tx) => {
        const prefix = type === "QUOTE" ? "QTN" : "INV";

        // generate invoice number atomically using invoice_sequences with tx (same connection)
        const invoiceNumber = await generateInvoiceNumber(tx, prefix, req.user.id);

        // compute totals safely
        let subtotal = 0,
          totalGST = 0,
          totalDiscount = 0,
          advanceFromItems = 0;

        const safeItems = (items || []).map((it) => {
          const quantity = Number(it.quantity) || 1;
          const price = Number(it.price) || 0;
          const discount = it.discount !== undefined && it.discount !== null ? Number(it.discount) : 0;
          const gstPercent = it.gstPercent !== undefined && it.gstPercent !== null ? Number(it.gstPercent) : null;
          const advance = it.advance !== undefined && it.advance !== null ? Number(it.advance) : 0;

          const lineBase = quantity * price - (discount || 0);
          subtotal += quantity * price;
          totalDiscount += discount || 0;
          totalGST += gstPercent ? (lineBase * gstPercent) / 100 : 0;
          advanceFromItems += advance || 0;

          return {
            description: it.description || "",
            category: it.category || null,
            quantity,
            price,
            gstPercent,
            discount: discount || null,
            advance: advance || null,
            remark: it.remark || null,
            hsn: it.hsn || null,
          };
        });

        const totalAdvance = advanceFromItems + (parseFloat(frontendAdvance || 0) || 0);
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

        // Create items if present
        if (safeItems.length > 0) {
          const createItems = safeItems.map((it) => ({
            invoiceId: inv.id,
            description: it.description,
            category: it.category,
            quantity: it.quantity,
            price: it.price,
            gstPercent: it.gstPercent,
            discount: it.discount,
            advance: it.advance,
            remark: it.remark,
            hsn: it.hsn,
          }));
          await tx.invoiceItem.createMany({ data: createItems });
        }

        return inv;
      })
    );

    // fetch created invoice with relations
    const invoiceWithItems = await prisma.invoice.findUnique({
      where: { id: created.id },
      include: { items: true, customer: true, payments: true },
    });

    res.json(invoiceWithItems);
  } catch (err) {
    console.error("POST /api/invoices failed:", err);
    if (err && err.code === "P2002") {
      return res.status(409).json({ message: "Duplicate invoice number. Please try again." });
    }
    res.status(500).json({ message: err.message || "Failed to create invoice", error: err });
  }
});

/**
 * POST /:id/convert -> convert QUOTE to INVOICE (atomic)
 */
router.post("/:id/convert", auth, async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid invoice id" });

  try {
    const updated = await createInvoiceWithRetries(async () =>
      prisma.$transaction(async (tx) => {
        const invoice = await tx.invoice.findUnique({ where: { id } });
        if (!invoice) throw { status: 404, message: "Invoice not found" };
        if (invoice.createdById !== req.user.id) throw { status: 403, message: "Not authorized" };
        if (invoice.type === "INVOICE") return invoice;

        const invoiceNumber = await generateInvoiceNumber(tx, "INV", req.user.id);

        const updatedInvoice = await tx.invoice.update({
          where: { id },
          data: { type: "INVOICE", invoiceNumber },
        });

        return updatedInvoice;
      })
    );

    const invoiceWithItems = await prisma.invoice.findUnique({
      where: { id: updated.id },
      include: { items: true, customer: true, payments: true },
    });

    res.json(invoiceWithItems);
  } catch (err) {
    console.error("POST /api/invoices/:id/convert failed:", err);
    if (err && err.status) return res.status(err.status).json({ message: err.message });
    if (err && err.code === "P2002") return res.status(409).json({ message: "Duplicate invoice number. Please retry." });
    res.status(500).json({ message: err.message || "Failed to convert quote", error: err });
  }
});

/**
 * GET / -> list invoices for current user
 */
router.get("/", auth, async (req, res) => {
  try {
    const { status } = req.query;
    const where = { createdById: req.user.id };
    if (status) where.status = status;

    const invoices = await prisma.invoice.findMany({
      where,
      include: { customer: true, items: true, payments: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(invoices);
  } catch (err) {
    console.error("GET /api/invoices failed:", err);
    res.status(500).json({ message: err.message || "Failed to fetch invoices" });
  }
});

/**
 * GET /:id -> view invoice (owner only)
 */
router.get("/:id", auth, async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid invoice id" });

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true, payments: true, customer: true },
    });
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    if (invoice.createdById !== req.user.id) return res.status(403).json({ message: "Not authorized" });
    res.json(invoice);
  } catch (err) {
    console.error("GET /api/invoices/:id failed:", err);
    res.status(500).json({ message: err.message || "Failed to fetch invoice" });
  }
});

/**
 * PUT /:id -> update invoice & replace items (owner only)
 */
router.put("/:id", auth, async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid invoice ID" });

  const {
    type,
    customerId,
    dueDate,
    remark,
    currency,
    items = [],
    advancePaid: frontendAdvance = 0,
    note,
  } = req.body;

  try {
    const existing = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) return res.status(404).json({ message: "Invoice not found" });
    if (existing.createdById !== req.user.id) return res.status(403).json({ message: "Not authorized" });

    let parsedCustomerId = null;
    if (customerId !== undefined && customerId !== null) {
      parsedCustomerId = Number(customerId);
      const customerExists = await prisma.customer.findUnique({ where: { id: parsedCustomerId } });
      if (!customerExists) return res.status(400).json({ message: "Invalid customerId" });
    }

    const parsedDueDate = dueDate ? new Date(dueDate) : existing.dueDate;
    const parsedAdvance = frontendAdvance ? Number(frontendAdvance) : 0;

    let subtotal = 0,
      totalGST = 0,
      totalDiscount = 0,
      advanceFromItems = 0;

    const safeItems = (items || []).map((it) => {
      const quantity = Number(it.quantity) || 1;
      const price = Number(it.price) || 0;
      const gstPercent = it.gstPercent !== undefined && it.gstPercent !== null ? Number(it.gstPercent) : null;
      const discount = it.discount !== undefined && it.discount !== null ? Number(it.discount) : 0;
      const advance = it.advance !== undefined && it.advance !== null ? Number(it.advance) : 0;

      const lineBase = quantity * price - (discount || 0);
      subtotal += quantity * price;
      totalDiscount += discount || 0;
      totalGST += gstPercent ? (lineBase * gstPercent) / 100 : 0;
      advanceFromItems += advance || 0;

      return {
        description: it.description || "",
        category: it.category || null,
        quantity,
        price,
        gstPercent,
        discount: discount || null,
        advance: advance || null,
        remark: it.remark || null,
        hsn: it.hsn || null,
      };
    });

    const totalAdvance = advanceFromItems + parsedAdvance;
    const total = subtotal - totalDiscount + totalGST - totalAdvance;

    const updatedInvoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.update({
        where: { id },
        data: {
          type: type || existing.type,
          customerId: parsedCustomerId,
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
        await tx.invoiceItem.createMany({ data: safeItems.map((it) => ({ invoiceId: id, ...it })) });
      }

      return inv;
    });

    const invoiceWithItems = await prisma.invoice.findUnique({
      where: { id: updatedInvoice.id },
      include: { items: true, customer: true, payments: true },
    });

    res.json(invoiceWithItems);
  } catch (err) {
    console.error("PUT /api/invoices/:id failed:", err);
    res.status(500).json({ message: "Failed to update invoice", error: err.message || err });
  }
});

/**
 * DELETE /:id -> delete invoice (owner only)
 */
router.delete("/:id", auth, async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid invoice ID" });

  try {
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    if (invoice.createdById !== req.user.id) return res.status(403).json({ message: "Not authorized" });

    await prisma.$transaction(async (tx) => {
      await tx.payment.deleteMany({ where: { invoiceId: id } });
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
      await tx.invoice.delete({ where: { id } });
    });

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/invoices/:id failed:", err);
    res.status(500).json({ message: "Failed to delete invoice" });
  }
});

module.exports = router;
