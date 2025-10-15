"use client";
import { useEffect, useMemo, useState } from "react";
import { authFetch } from "../lib/api";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// --- TYPES ---

export type InvoiceStatus = "PAID" | "UNPAID" | "PARTIAL" | "PENDING";

export type Invoice = {
  id: number;
  invoiceNumber?: string;
  status: InvoiceStatus;
  total?: number;
  advancePaid?: number;
  createdAt?: string;
  date?: string;
};

export type Customer = {
  id: number;
  name?: string;
  createdAt?: string;
  invoices?: Invoice[];
};

export type TransactionType = "INCOME" | "EXPENSE";

export type Transaction = {
  id: number;
  type: TransactionType;
  amount: number;
  date: string;
};

// --- REPORT TYPES ---

export type InvoiceReportItem = {
  period: string;
  count: number;
};

export type CustomerReportItem = {
  period: string;
  total: number;
  paid: number;
  unpaid: number;
};

export type StatusReportItem = {
  name: InvoiceStatus;
  value: number;
};

export type TransactionReportItem = {
  period: string;
  income: number;
  expense: number;
};

// --- COMPONENT ---

function formatRangeLabel(from?: string, to?: string) {
  if (!from && !to) return "All time";
  if (from && to) return `${from} → ${to}`;
  if (from) return `From ${from}`;
  return `Until ${to}`;
}

export default function Reports() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData(opts?: { from?: string; to?: string }) {
    try {
      setLoading(true);
      setError("");

      const qs = new URLSearchParams();
      if (opts?.from) qs.set("from", opts.from);
      if (opts?.to) qs.set("to", opts.to);

      const inv: Invoice[] = await authFetch(
        `/api/invoices${qs.toString() ? "?" + qs.toString() : ""}`
      );
      const cust: Customer[] = await authFetch(
        `/api/customers${qs.toString() ? "?" + qs.toString() : ""}`
      );
      const txn: Transaction[] = await authFetch(
        `/api/transactions${qs.toString() ? "?" + qs.toString() : ""}`
      );

      setInvoices(inv || []);
      setCustomers(cust || []);
      setTransactions(txn || []);
    } catch (err) {
      console.error("Failed to load data", err);
      setError("Failed to load data. See console for details.");
    } finally {
      setLoading(false);
    }
  }

  function parseStartEnd(from?: string, to?: string) {
    if (!from && !to) return null;
    const start = from ? new Date(from + "T00:00:00") : undefined;
    let end = to ? new Date(to + "T00:00:00") : undefined;
    if (end) end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  // --- INVOICE REPORT ---
  const invoiceReport = useMemo<InvoiceReportItem[]>(() => {
    if (dateFrom || dateTo) {
      const parsed = parseStartEnd(dateFrom, dateTo);
      const count = invoices.filter((inv) => {
        const d = new Date(inv.createdAt ?? inv.date ?? "");
        if (isNaN(d.getTime())) return false;
        if (parsed?.start && d < parsed.start) return false;
        if (parsed?.end && d > parsed.end) return false;
        return true;
      }).length;
      return [{ period: formatRangeLabel(dateFrom, dateTo), count }];
    }

    function getDateRange(type: "today" | "week" | "month") {
      const now = new Date();
      switch (type) {
        case "today":
          return [new Date(now.setHours(0, 0, 0, 0)), new Date()];
        case "week": {
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1);
          return [new Date(now.setDate(diff)), new Date()];
        }
        case "month":
          return [new Date(now.getFullYear(), now.getMonth(), 1), new Date()];
      }
    }

    const types: ("today" | "week" | "month")[] = ["today", "week", "month"];
    return types.map((type) => {
      const [start, end] = getDateRange(type);
      const count = invoices.filter((inv) => {
        const d = new Date(inv.createdAt ?? inv.date ?? "");
        return d >= start && d <= end;
      }).length;
      return { period: type, count };
    });
  }, [invoices, dateFrom, dateTo]);

  // --- CUSTOMER REPORT ---
  const customerReport = useMemo<CustomerReportItem[]>(() => {
    if (dateFrom || dateTo) {
      const parsed = parseStartEnd(dateFrom, dateTo);
      const filteredCustomers = customers.filter((c) => {
        const d = new Date(c.createdAt ?? "");
        if (isNaN(d.getTime())) return false;
        if (parsed?.start && d < parsed.start) return false;
        if (parsed?.end && d > parsed.end) return false;
        return true;
      });
      const paid = filteredCustomers.filter((c) =>
        c.invoices?.some((inv) => inv.status === "PAID")
      ).length;
      const unpaid = filteredCustomers.length - paid;
      return [
        {
          period: formatRangeLabel(dateFrom, dateTo),
          total: filteredCustomers.length,
          paid,
          unpaid,
        },
      ];
    }

    const types: ("today" | "week" | "month")[] = ["today", "week", "month"];
    function getDateRange(type: "today" | "week" | "month") {
      const now = new Date();
      switch (type) {
        case "today":
          return [new Date(now.setHours(0, 0, 0, 0)), new Date()];
        case "week": {
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1);
          return [new Date(now.setDate(diff)), new Date()];
        }
        case "month":
          return [new Date(now.getFullYear(), now.getMonth(), 1), new Date()];
      }
    }

    return types.map((type) => {
      const [start, end] = getDateRange(type);
      const filteredCustomers = customers.filter((c) => {
        const d = new Date(c.createdAt ?? "");
        return d >= start && d <= end;
      });
      const paid = filteredCustomers.filter((c) =>
        c.invoices?.some((inv) => inv.status === "PAID")
      ).length;
      const unpaid = filteredCustomers.length - paid;

      return {
        period: type,
        total: filteredCustomers.length,
        paid,
        unpaid,
      };
    });
  }, [customers, dateFrom, dateTo]);

  // --- STATUS REPORT ---
  const statusReport = useMemo<StatusReportItem[]>(() => {
    const statusTypes: InvoiceStatus[] = ["PAID", "UNPAID", "PENDING", "PARTIAL"];
    const filtered = invoices.filter((inv) => {
      if (!dateFrom && !dateTo) return true;
      const d = new Date(inv.createdAt ?? inv.date ?? "");
      const parsed = parseStartEnd(dateFrom, dateTo);
      if (isNaN(d.getTime())) return false;
      if (parsed?.start && d < parsed.start) return false;
      if (parsed?.end && d > parsed.end) return false;
      return true;
    });
    return statusTypes.map((status) => ({
      name: status,
      value: filtered.filter((inv) => inv.status === status).length,
    }));
  }, [invoices, dateFrom, dateTo]);

  // --- TRANSACTION REPORT ---
  const transactionReport = useMemo<TransactionReportItem[]>(() => {
    const filtered = transactions.filter((tx) => {
      if (!dateFrom && !dateTo) return true;
      const d = new Date(tx.date);
      const parsed = parseStartEnd(dateFrom, dateTo);
      if (isNaN(d.getTime())) return false;
      if (parsed?.start && d < parsed.start) return false;
      if (parsed?.end && d > parsed.end) return false;
      return true;
    });

    const income = filtered
      .filter((tx) => tx.type === "INCOME")
      .reduce((a, t) => a + t.amount, 0);
    const expense = filtered
      .filter((tx) => tx.type === "EXPENSE")
      .reduce((a, t) => a + t.amount, 0);

    return [{ period: formatRangeLabel(dateFrom, dateTo), income, expense }];
  }, [transactions, dateFrom, dateTo]);

  const COLORS = ["#259230ff", "#de2a06ff", "#eea810ff", "#FF8042"];

  // handlers
  function onApply() {
    setError("");
    if (dateFrom && dateTo) {
      const f = new Date(dateFrom + "T00:00:00").getTime();
      const t = new Date(dateTo + "T00:00:00").getTime();
      if (f > t) {
        setError("From date cannot be after To date.");
        return;
      }
    }
    loadData({ from: dateFrom || undefined, to: dateTo || undefined });
  }

  function onReset() {
    setDateFrom("");
    setDateTo("");
    setError("");
    loadData();
  }

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-bold mb-4">Reports</h2>

      {/* Date filter UI */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-4">
        <label className="flex items-center gap-2">
          <span className="text-sm text-gray-600">From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border rounded px-2 py-1"
            max={dateTo || undefined}
          />
        </label>

        <label className="flex items-center gap-2">
          <span className="text-sm text-gray-600">To</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border rounded px-2 py-1"
            min={dateFrom || undefined}
          />
        </label>

        <div className="flex items-center gap-2 mt-2 md:mt-0">
          <button
            onClick={onApply}
            className="text-white px-3 py-1 rounded hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: "rgb(128, 41, 73)" }}
            disabled={loading}
          >
            Apply
          </button>
          <button
            onClick={onReset}
            className="bg-gray-200 text-gray-800 px-3 py-1 rounded hover:opacity-90"
            disabled={loading}
          >
            Reset
          </button>
        </div>

        {loading && <div className="text-sm text-gray-600 ml-2">Loading...</div>}
        {error && <div className="text-sm text-red-600 ml-2">{error}</div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Invoice Report */}
        <div className="card p-4 shadow-md bg-white rounded-lg">
          <h3 className="font-semibold mb-2 text-gray-700">Invoices</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={invoiceReport}>
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#2c4272ff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Customer Report */}
        <div className="card p-4 shadow-md bg-white rounded-lg">
          <h3 className="font-semibold mb-2 text-gray-700">
            Customers (Added / Paid / Unpaid)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={customerReport}>
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill="#8884d8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="paid" stackId="a" fill="#00C49F" />
              <Bar dataKey="unpaid" stackId="a" fill="#FF8042" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Report */}
        <div className="card p-4 shadow-md bg-white rounded-lg">
          <h3 className="font-semibold mb-2 text-gray-700">Invoice Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={statusReport}
                dataKey="value"
                nameKey="name"
                label
                outerRadius={80}
              >
                {statusReport.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Transaction Report */}
        <div className="card p-4 shadow-md bg-white rounded-lg">
          <h3 className="font-semibold mb-2 text-gray-700">
            Transactions (Income / Expense)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={transactionReport}>
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="income" fill="#52a3eaff" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill="#FF8042" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
