// // ....................................................................................

// const express = require("express");
// const router = express.Router();
// const { PrismaClient } = require("@prisma/client");
// const prisma = new PrismaClient();
// const auth = require("../middlewares/auth");

// // Safe generateInvoiceNumber for concurrency
// async function generateInvoiceNumber() {
//   return await prisma.$transaction(async (tx) => {
//     const year = new Date().getFullYear();

//     // Lock and get the latest invoice number
//     const last = await tx.invoice.findFirst({
//       where: { invoiceNumber: { startsWith: `INV-${year}-` } },
//       orderBy: { id: "desc" },
//     });

//     let nextNumber = 1;
//     if (last?.invoiceNumber) {
//       const match = last.invoiceNumber.match(/(\d+)$/);
//       if (match) nextNumber = parseInt(match[1], 10) + 1;
//     }

//     return `INV-${year}-${String(nextNumber).padStart(3, "0")}`;
//   });
// }

// /* Routes:
// POST   /api/invoices        -> create invoice/quote
// POST   /api/invoices/:id/convert -> convert quote to invoice (assigns invoiceNumber)
// GET    /api/invoices        -> list invoices (only own)
// GET    /api/invoices/:id    -> view invoice (only own)
// PUT    /api/invoices/:id    -> edit invoice + replace items (only own)
// DELETE /api/invoices/:id    -> delete invoice (only own)
// */

// //
// // Create invoice or quote
// //
// router.post("/", auth, async (req, res) => {
//   const { type = "INVOICE", customerId, dueDate, items = [], remark, currency = "INR" } = req.body;

//   try {
//     // Wrap entire invoice creation in a transaction for safety
//     const created = await prisma.$transaction(async (tx) => {
//       const invoiceNumber = await generateInvoiceNumber();

//       let subtotal = 0, totalGST = 0, totalDiscount = 0, advancePaid = 0;
//       for (const it of items) {
//         const qty = it.quantity || 1;
//         const price = parseFloat(it.price) || 0;
//         const itemTotal = qty * price;
//         subtotal += itemTotal;
//         if (it.gstPercent) totalGST += (itemTotal * parseFloat(it.gstPercent)) / 100;
//         if (it.discount) totalDiscount += parseFloat(it.discount);
//         if (it.advance) advancePaid += parseFloat(it.advance);
//       }

//       const total = subtotal + totalGST - totalDiscount - advancePaid;

//       const inv = await tx.invoice.create({
//         data: {
//           invoiceNumber,
//           type,
//           customerId: customerId || undefined,
//           dueDate: dueDate ? new Date(dueDate) : undefined,
//           createdById: req.user.id,
//           subtotal,
//           totalDiscount,
//           totalGST,
//           advancePaid,
//           total,
//           remark,
//           currency
//         }
//       });

//       if (items.length > 0) {
//         const createItems = items.map((it) => ({
//           invoiceId: inv.id,
//           description: it.description || "",
//           category: it.category || null,
//           quantity: it.quantity || 1,
//           price: it.price || 0,
//           gstPercent: it.gstPercent || null,
//           discount: it.discount || null,
//           advance: it.advance || null,
//           remark: it.remark || null,
//           hsn: it.hsn || null, 
//         }));
//         await tx.invoiceItem.createMany({ data: createItems });
//       }

//       return inv;
//     });

//     const invoiceWithItems = await prisma.invoice.findUnique({
//       where: { id: created.id },
//       include: { items: true, customer: true, payments: true }
//     });

//     res.json(invoiceWithItems);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// });

// //
// // Convert quote to invoice
// //
// router.post("/:id/convert", auth, async (req, res) => {
//   const id = parseInt(req.params.id);
//   try {
//     const invoice = await prisma.invoice.findUnique({ where: { id } });
//     if (!invoice) return res.status(404).json({ message: "Invoice not found" });
//     if (invoice.createdById !== req.user.id) return res.status(403).json({ message: "Not authorized" });

//     if (invoice.type === "INVOICE") return res.json(invoice);

//     const invoiceNumber = await generateInvoiceNumber();

//     const updated = await prisma.invoice.update({
//       where: { id },
//       data: { type: "INVOICE", invoiceNumber }
//     });

//     res.json(updated);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// });

// //
// // List invoices (only own)
// //
// router.get("/", auth, async (req, res) => {
//   try {
//     const { status } = req.query;
//     const where = { createdById: req.user.id };
//     if (status) where.status = status;

//     const invoices = await prisma.invoice.findMany({
//       where,
//       include: { customer: true, items: true, payments: true },
//       orderBy: { createdAt: "desc" }
//     });

//     res.json(invoices);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// });

// //
// // View invoice (only own)
// //
// router.get("/:id", auth, async (req, res) => {
//   const id = parseInt(req.params.id);
//   try {
//     const invoice = await prisma.invoice.findUnique({ where: { id }, include: { items: true, payments: true, customer: true } });
//     if (!invoice) return res.status(404).json({ message: "Invoice not found" });
//     if (invoice.createdById !== req.user.id) return res.status(403).json({ message: "Not authorized" });

//     res.json(invoice);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// });

// //
// // Edit invoice (update invoice fields and replace items) - only owner
// //
// router.put("/:id", auth, async (req, res) => {
//   const id = parseInt(req.params.id);
//   const { type, customerId, dueDate, remark, currency, items = [] } = req.body;

//   try {
//     const existing = await prisma.invoice.findUnique({ where: { id }, include: { items: true } });
//     if (!existing) return res.status(404).json({ message: "Invoice not found" });
//     if (existing.createdById !== req.user.id) return res.status(403).json({ message: "Not authorized" });

//     let subtotal = 0, totalGST = 0, totalDiscount = 0, advancePaid = 0;
//     for (const it of items) {
//       const qty = it.quantity || 1;
//       const price = parseFloat(it.price) || 0;
//       const itemTotal = qty * price;
//       subtotal += itemTotal;
//       if (it.gstPercent) totalGST += (itemTotal * parseFloat(it.gstPercent)) / 100;
//       if (it.discount) totalDiscount += parseFloat(it.discount);
//       if (it.advance) advancePaid += parseFloat(it.advance);
//     }
//     const total = subtotal + totalGST - totalDiscount - advancePaid;

//     const result = await prisma.$transaction(async (tx) => {
//       const updatedInv = await tx.invoice.update({
//         where: { id },
//         data: {
//           type: type || existing.type,
//           customerId: customerId || existing.customerId,
//           dueDate: dueDate ? new Date(dueDate) : existing.dueDate,
//           remark: remark !== undefined ? remark : existing.remark,
//           currency: currency || existing.currency,
//           subtotal,
//           totalGST,
//           totalDiscount,
//           advancePaid,
//           total
//         }
//       });

//       await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });

//       if (items.length > 0) {
//         const createItems = items.map((it) => ({
//           invoiceId: id,
//           description: it.description || "",
//           category: it.category || null,
//           quantity: it.quantity || 1,
//           price: it.price || 0,
//           gstPercent: it.gstPercent || null,
//           discount: it.discount || null,
//           advance: it.advance || null,
//           remark: it.remark || null,
//           hsn: it.hsn || null, 
//         }));
//         await tx.invoiceItem.createMany({ data: createItems });
//       }

//       return updatedInv;
//     });

//     const invoiceWithItems = await prisma.invoice.findUnique({
//       where: { id: result.id },
//       include: { items: true, customer: true, payments: true }
//     });

//     res.json(invoiceWithItems);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// });




// router.delete("/:id", auth, async (req, res) => {
//   const id = Number(req.params.id);
//   try {
//     const invoice = await prisma.invoice.findUnique({ where: { id } });
//     if (!invoice) return res.status(404).json({ message: "Invoice not found" });
//     if (invoice.createdById !== req.user.id)
//       return res.status(403).json({ message: "Not authorized" });

//     await prisma.$transaction(async (tx) => {
//       // remove payments and items first to avoid FK errors (if DB not cascading)
//       await tx.payment.deleteMany({ where: { invoiceId: id } });
//       await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
//       await tx.invoice.delete({ where: { id } });
//     });

//     res.json({ success: true });
//   } catch (err) {
//     console.error("Delete invoice error:", err);
//     res.status(500).json({ message: "Failed to delete invoice" });
//   }
// });

// module.exports = router;





const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const auth = require("../middlewares/auth");

// Safe generateInvoiceNumber for concurrency
async function generateInvoiceNumber() {
  return await prisma.$transaction(async (tx) => {
    const year = new Date().getFullYear();

    // Lock and get the latest invoice number
    const last = await tx.invoice.findFirst({
      where: { invoiceNumber: { startsWith: `INV-${year}-` } },
      orderBy: { id: "desc" },
    });

    let nextNumber = 1;
    if (last?.invoiceNumber) {
      const match = last.invoiceNumber.match(/(\d+)$/);
      if (match) nextNumber = parseInt(match[1], 10) + 1;
    }

    return `INV-${year}-${String(nextNumber).padStart(3, "0")}`;
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
  const {
    type = "INVOICE",
    customerId,
    dueDate,
    items = [],
    remark,
    currency = "INR",
    advancePaid: frontendAdvance = 0, // <-- global advance from frontend
  } = req.body;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const invoiceNumber = await generateInvoiceNumber();

      let subtotal = 0,
        totalGST = 0,
        totalDiscount = 0,
        advanceFromItems = 0;

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
  } catch (err) {
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
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    if (invoice.createdById !== req.user.id) return res.status(403).json({ message: "Not authorized" });

    if (invoice.type === "INVOICE") return res.json(invoice);

    const invoiceNumber = await generateInvoiceNumber();

    const updated = await prisma.invoice.update({
      where: { id },
      data: { type: "INVOICE", invoiceNumber }
    });

    res.json(updated);
  } catch (err) {
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
    if (status) where.status = status;

    const invoices = await prisma.invoice.findMany({
      where,
      include: { customer: true, items: true, payments: true },
      orderBy: { createdAt: "desc" }
    });

    res.json(invoices);
  } catch (err) {
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
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    if (invoice.createdById !== req.user.id) return res.status(403).json({ message: "Not authorized" });

    res.json(invoice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

//
// Edit invoice (update invoice fields and replace items) - only owner
//
// Edit invoice (update invoice fields and replace items) - only owner
router.put("/:id", auth, async (req, res) => {
  const id = parseInt(req.params.id);
  const {
    type,
    customerId,
    dueDate,
    remark,
    currency,
    items = [],
    advancePaid: frontendAdvance = 0, // <-- global advance
  } = req.body;

  try {
    const existing = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) return res.status(404).json({ message: "Invoice not found" });
    if (existing.createdById !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    let subtotal = 0,
      totalGST = 0,
      totalDiscount = 0,
      advanceFromItems = 0;

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
          subtotal,
          totalGST,
          totalDiscount,
          advancePaid: totalAdvance, // <-- save global + item advance
          total,
        },
      });

      // Replace items
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});



router.delete("/:id", auth, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    if (invoice.createdById !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    await prisma.$transaction(async (tx) => {
      await tx.payment.deleteMany({ where: { invoiceId: id } });
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
      await tx.invoice.delete({ where: { id } });
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Delete invoice error:", err);
    res.status(500).json({ message: "Failed to delete invoice" });
  }
});

module.exports = router;

