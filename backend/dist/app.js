"use strict";
// app.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const userRoutes = require("./routes/users");
const invoiceRoutes = require("./routes/invoices");
const customerRoutes = require("./routes/customers");
const paymentRoutes = require("./routes/payments");
const settingsRoutes = require("./routes/settings");
const reportsRoutes = require("./routes/reports");
const transactionsRoutes = require("./routes/transactions");
const quotationCategoriesRoutes = require("./routes/quotationCategories");
const paymentLedgersRoutes = require("./routes/paymentLedgers");
const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
// ✅ Use absolute project root for uploads directory
// Works both locally and on VPS
const uploadsDir = path.resolve(__dirname, "../uploads");
app.use("/uploads", express.static(uploadsDir));
// ✅ Mount API routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/transactions", transactionsRoutes);
app.use("/api/quotation-categories", quotationCategoriesRoutes);
app.use("/api/payment-ledgers", paymentLedgersRoutes);
// ✅ Optional root health check
app.get("/", (req, res) => {
    res.json({ status: "ok", message: "Server running" });
});
module.exports = app;
