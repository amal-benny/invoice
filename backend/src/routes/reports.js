// report.js (backend router)
const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = Router();

// Helper: build where date filter from from/to or legacy filter
function buildDateWhere(fieldName, query) {
  const { from, to, filter } = query || {};

  // If both from and to provided, use them (inclusive)
  if (from || to) {
    const where = {};
    if (from) where.gte = new Date(from);
    if (to) {
      // make sure end includes the whole 'to' day if user passed a date-only string
      const toDate = new Date(to);
      // if time component is 00:00:00, extend to end of day
      if (
        toDate.getHours() === 0 &&
        toDate.getMinutes() === 0 &&
        toDate.getSeconds() === 0 &&
        toDate.getMilliseconds() === 0
      ) {
        toDate.setHours(23, 59, 59, 999);
      }
      where.lte = toDate;
    }
    return { [fieldName]: where };
  }

  // Backwards-compatible: accept old filter values: today, week, month
  const now = new Date();
  switch (filter) {
    case "today": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return { [fieldName]: { gte: start, lte: end } };
    }
    case "week": {
      // treat week as starting Sunday (consistent with original)
      const firstDayOfWeek = now.getDate() - now.getDay(); // Sunday = 0
      const start = new Date(now.getFullYear(), now.getMonth(), firstDayOfWeek);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return { [fieldName]: { gte: start, lte: end } };
    }
    case "month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return { [fieldName]: { gte: start, lte: end } };
    }
    default:
      // no date filter (all time)
      return {};
  }
}

// --- Invoices Report ---
router.get("/invoices", async (req, res) => {
  try {
    const dateWhere = buildDateWhere("date", req.query);
    const invoices = await prisma.invoice.findMany({
      where: {
        ...dateWhere,
      },
      select: { id: true, status: true, date: true, total: true },
    });
    res.json(invoices);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

// --- Payments Report ---
router.get("/payments", async (req, res) => {
  try {
    const dateWhere = buildDateWhere("date", req.query);
    const payments = await prisma.payment.findMany({
      where: {
        ...dateWhere,
      },
      select: { id: true, status: true, date: true, amount: true },
    });
    res.json(payments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

// --- Customers Report ---
router.get("/customers", async (req, res) => {
  try {
    // Note customers likely use createdAt field
    const dateWhere = buildDateWhere("createdAt", req.query);
    const customers = await prisma.customer.findMany({
      where: {
        ...dateWhere,
      },
      select: { id: true, name: true, createdAt: true },
    });
    res.json(customers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

module.exports = router;
