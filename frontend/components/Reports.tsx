"use client";
import { useEffect, useState, useMemo } from "react";
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

type Invoice = {
  id: number;
  invoiceNumber: string;
  status: "PAID" | "UNPAID" | "PARTIAL" | "PENDING";
  total: number;
  advancePaid: number;
  createdAt: string;
};

type Customer = {
  id: number;
  name: string;
  createdAt: string;
  invoices?: Invoice[];
};

type TransactionType = "INCOME" | "EXPENSE";

type Transaction = {
  id: number;
  type: TransactionType;
  amount: number;
  date: string;
};

function getDateRange(type: "today" | "week" | "month") {
  const now = new Date();
  switch (type) {
    case "today":
      return [new Date(now.setHours(0, 0, 0, 0)), new Date()];
    case "week": {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // monday
      return [new Date(now.setDate(diff)), new Date()];
    }
    case "month":
      return [new Date(now.getFullYear(), now.getMonth(), 1), new Date()];
  }
}

export default function Reports() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const inv: Invoice[] = await authFetch("/api/invoices");
      const cust: Customer[] = await authFetch("/api/customers");
      const txn: Transaction[] = await authFetch("/api/transactions");
      setInvoices(inv);
      setCustomers(cust);
      setTransactions(txn);
    } catch (err) {
      console.error("Failed to load data", err);
    }
  }

  // --- INVOICE REPORT ---
  const invoiceReport = useMemo(() => {
    const types: ("today" | "week" | "month")[] = ["today", "week", "month"];
    return types.map((type) => {
      const [start, end] = getDateRange(type);
      const count = invoices.filter((inv) => {
        const d = new Date(inv.createdAt);
        return d >= start && d <= end;
      }).length;
      return { period: type, count };
    });
  }, [invoices]);

  // --- CUSTOMER REPORT ---
  const customerReport = useMemo(() => {
    const types: ("today" | "week" | "month")[] = ["today", "week", "month"];
    return types.map((type) => {
      const [start, end] = getDateRange(type);
      const filteredCustomers = customers.filter((c) => {
        const d = new Date(c.createdAt);
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
  }, [customers]);

  // --- STATUS REPORT ---
  const statusReport = useMemo(() => {
    const statusTypes: Invoice["status"][] = ["PAID", "UNPAID", "PENDING", "PARTIAL"];
    return statusTypes.map((status) => ({
      name: status,
      value: invoices.filter((inv) => inv.status === status).length,
    }));
  }, [invoices]);

  // --- TRANSACTION REPORT ---
  const transactionReport = useMemo(() => {
    const types: ("today" | "week" | "month")[] = ["today", "week", "month"];
    return types.map((type) => {
      const [start, end] = getDateRange(type);
      const filtered = transactions.filter((tx) => {
        const d = new Date(tx.date);
        return d >= start && d <= end;
      });
      const income = filtered.filter((tx) => tx.type === "INCOME").reduce((a, t) => a + t.amount, 0);
      const expense = filtered.filter((tx) => tx.type === "EXPENSE").reduce((a, t) => a + t.amount, 0);
      return { period: type, income, expense };
    });
  }, [transactions]);

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-bold mb-4">Reports</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Invoice Report */}
        <div className="card p-4 shadow-md bg-white rounded-lg">
          <h3 className="font-semibold mb-2 text-gray-700">Invoices (Today/Week/Month)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={invoiceReport}>
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#0088FE" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Customer Report */}
        <div className="card p-4 shadow-md bg-white rounded-lg">
          <h3 className="font-semibold mb-2 text-gray-700">Customers (Added / Paid / Unpaid)</h3>
          <ResponsiveContainer width="100%" height={200}>
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
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={statusReport}
                dataKey="value"
                nameKey="name"
                label
                outerRadius={80}
              >
                {statusReport.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Transaction Report */}
        <div className="card p-4 shadow-md bg-white rounded-lg">
          <h3 className="font-semibold mb-2 text-gray-700">Transactions (Income / Expense)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={transactionReport}>
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="income" fill="#0088FE" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill="#FF8042" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
