// routes/payments.js
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const auth = require("../middlewares/auth");

// Helper to compute invoice status based on advancePaid and total
function computeInvoiceStatus(advancePaid, total) {
  // guard floats
  const a = Number(advancePaid || 0);
  const t = Number(total || 0);

  if (t <= 0) return "PAID";
  if (a <= 0) return "PENDING";
  if (a >= t) return "PAID";
  return "PARTIAL";
}

// Helper to compute customer status from invoice statuses
function computeCustomerStatus(invoiceStatuses) {
  // invoiceStatuses = array of Invoice.status strings
  if (!invoiceStatuses || invoiceStatuses.length === 0) return "UNPAID";
  const allPaid = invoiceStatuses.every((s) => s === "PAID");
  if (allPaid) return "PAID";
  const anyPartialOrPaid = invoiceStatuses.some((s) => s === "PARTIAL" || s === "PAID");
  return anyPartialOrPaid ? "PARTIAL" : "UNPAID";
}

// Create a payment
router.post("/", auth, async (req, res) => {
  const { invoiceId, amount, method, date, note} = req.body;
  const paymentAmount = parseFloat(amount || 0);

  if (!invoiceId || isNaN(paymentAmount) || paymentAmount <= 0) {
    return res.status(400).json({ message: "invoiceId and positive amount are required" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Load invoice
      const invoice = await tx.invoice.findUnique({ where: { id: Number(invoiceId) } });
      if (!invoice) throw new Error("Invoice not found");
      // Create payment
      const p = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          method: method || "Unknown",
          amount: paymentAmount,
          date: date ? new Date(date) : undefined,
          note: note || undefined,
          createdById: req.user.id,
          
        },
      });

      // Update invoice.advancePaid
      // We add the payment amount to existing advancePaid
      let newAdvancePaid = Number(invoice.advancePaid || 0) + paymentAmount;

      // Optionally clamp to total if you want to avoid "overpaid" storing > total:
      // newAdvancePaid = Math.min(newAdvancePaid, Number(invoice.total || 0));
      // I will keep full value (allows recording overpayment) but status logic uses comparison.

      // Recompute invoice status
      const newStatus = computeInvoiceStatus(newAdvancePaid, invoice.total);

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          advancePaid: newAdvancePaid,
          status: newStatus,
        },
      });

      // Update customer status if invoice has a customer
      if (updatedInvoice.customerId) {
        // get all invoices for that customer
        const invs = await tx.invoice.findMany({
          where: { customerId: updatedInvoice.customerId },
          select: { status: true },
        });
        const invoiceStatuses = invs.map((i) => i.status);
        const cStatus = computeCustomerStatus(invoiceStatuses);

        await tx.customer.update({
          where: { id: updatedInvoice.customerId },
          data: { status: cStatus },
        });
      }

      // Return full invoice with payments/items/customer
      const invoiceWithRelations = await tx.invoice.findUnique({
        where: { id: updatedInvoice.id },
        include: { payments: true, items: true, customer: true },
      });

      return { payment: p, invoice: invoiceWithRelations };
    });

    res.json(result);
  } catch (err) {
    console.error("Payment create error:", err);
    res.status(500).json({ message: err.message || "Failed to create payment" });
  }
});

module.exports = router;
