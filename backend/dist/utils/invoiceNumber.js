"use strict";
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function generateInvoiceNumber() {
    const year = new Date().getFullYear();
    // count existing invoices for year prefix
    const count = await prisma.invoice.count({
        where: {
            invoiceNumber: { startsWith: `INV-${year}-` },
        },
    });
    const next = (count + 1).toString().padStart(3, "0");
    return `INV-${year}-${next}`;
}
module.exports = { generateInvoiceNumber };
