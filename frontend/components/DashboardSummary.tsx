// components/DashboardSummary.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { DollarSign, CreditCard, ArrowUp } from "lucide-react";
import { authFetch } from "../lib/api";
import type { WindowMethod } from "../src/types/window"; // <-- use the canonical type from your window.d.ts

type SummaryRow = {
  starting: number;
  income: number;
  expense: number;
  net: number;
  closing: number;
};

interface Balance {
  id: number;
  amount: number;
  method: "Cash" | "Bank";
  date: string;
}

interface Transaction {
  id: number;
  type: "INCOME" | "EXPENSE";
  method: "Cash" | "Bank" | "Card" | "UPI";
  amount: number;
  date: string;
  category?: string;
}

export default function DashboardSummary() {
  const [cash, setCash] = useState<SummaryRow>({
    starting: 0,
    income: 0,
    expense: 0,
    net: 0,
    closing: 0,
  });
  const [bank, setBank] = useState<SummaryRow>({
    starting: 0,
    income: 0,
    expense: 0,
    net: 0,
    closing: 0,
  });

  const [balances, setBalances] = useState<Balance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  function round2(n: number) {
    return Math.round(n * 100) / 100;
  }

  const loadBalances = useCallback(async () => {
    try {
      const data = await authFetch("/api/transactions/balance");
      if (Array.isArray(data)) setBalances(data);
    } catch (err) {
      console.error("Failed to load balances", err);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      const data = await authFetch("/api/transactions");
      if (Array.isArray(data)) setTransactions(data);
    } catch (err) {
      console.error("Failed to load transactions", err);
    }
  }, []);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadBalances(), loadTransactions()]);
    } finally {
      setLoading(false);
    }
  }, [loadBalances, loadTransactions]);

  const calculateSummaries = useCallback(() => {
    const cashStarting = balances.find((b) => b.method === "Cash")?.amount || 0;
    const bankStarting = balances.find((b) => b.method === "Bank")?.amount || 0;

    let cashIncome = 0,
      cashExpense = 0,
      bankIncome = 0,
      bankExpense = 0;

    transactions.forEach((tx) => {
      // treat CARD/UPI as Bank bucket
      const methodIsCash = tx.method === "Cash";
      const methodIsBank = !methodIsCash;

      if (tx.type === "INCOME") {
        if (methodIsCash) cashIncome += tx.amount;
        if (methodIsBank) bankIncome += tx.amount;
      } else {
        if (methodIsCash) cashExpense += tx.amount;
        if (methodIsBank) bankExpense += tx.amount;
      }
    });

    const cashNet = cashIncome - cashExpense;
    const cashClosing = cashStarting + cashNet;

    const bankNet = bankIncome - bankExpense;
    const bankClosing = bankStarting + bankNet;

    setCash({
      starting: round2(cashStarting),
      income: round2(cashIncome),
      expense: round2(cashExpense),
      net: round2(cashNet),
      closing: round2(cashClosing),
    });

    setBank({
      starting: round2(bankStarting),
      income: round2(bankIncome),
      expense: round2(bankExpense),
      net: round2(bankNet),
      closing: round2(bankClosing),
    });
  }, [balances, transactions]);

  // initial load
  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  // recalc when data changes
  useEffect(() => {
    calculateSummaries();
  }, [balances, transactions, calculateSummaries]);

  // expose typed global methods so other modules can tell dashboard to refresh
  useEffect(() => {
    // window.updateDashboardRefresh and resetDashboardBalances are defined by other modules (no declare here)
    window.updateDashboardRefresh = async () => {
      await reloadAll();
    };

    window.resetDashboardBalances = async () => {
      await reloadAll();
    };

    /** ✅ updateDashboardIncome — adds income instantly (uses WindowMethod from window.d.ts) */
    window.updateDashboardIncome = (method: WindowMethod, amount: number) => {
      // normalize incoming method (WindowMethod uses uppercase tokens like "CASH","BANK" etc.)
      if (method === "CASH") {
        setCash((prev) => {
          const income = round2(prev.income + amount);
          const net = round2(income - prev.expense);
          const closing = round2(prev.starting + net);
          return { ...prev, income, net, closing };
        });
      } else {
        // treat all others (BANK, CARD, UPI) as bank
        setBank((prev) => {
          const income = round2(prev.income + amount);
          const net = round2(income - prev.expense);
          const closing = round2(prev.starting + net);
          return { ...prev, income, net, closing };
        });
      }
    };

    return () => {
      delete window.updateDashboardRefresh;
      delete window.resetDashboardBalances;
      delete window.updateDashboardIncome;
    };
  }, [reloadAll]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {loading ? <div className="text-sm text-gray-500">Refreshing...</div> : null}
      </div>

      {/* Cash Summary */}
      <div>
        <h4 className="text-md font-medium mb-2">Cash Balance Summary</h4>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          {[
            { label: "Starting Balance", value: cash.starting },
            { label: "Income", value: cash.income },
            { label: "Expense", value: cash.expense },
            { label: "Net", value: cash.net },
            { label: "Closing Balance", value: cash.closing },
          ].map((item, i) => (
            <div
              key={i}
              className="card p-4 flex items-center gap-3 shadow-md rounded-lg bg-white"
            >
              <div className="w-10 h-10 flex items-center justify-center rounded-md bg-green-50">
                {i === 0 && <DollarSign className="w-5 h-5 text-green-600" />}
                {i === 1 && <ArrowUp className="w-5 h-5 text-green-600" />}
                {i === 2 && <DollarSign className="w-5 h-5 text-green-600" />}
                {i === 3 && <ArrowUp className="w-5 h-5 text-green-600" />}
                {i === 4 && <CreditCard className="w-5 h-5 text-green-600" />}
              </div>
              <div className="flex-1">
                <div className="kv text-gray-600">{item.label}</div>
                <div className="text-2xl font-bold">₹{item.value.toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bank Summary */}
      <div>
        <h4 className="text-md font-medium mb-2">Bank Balance Summary</h4>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          {[
            { label: "Starting Balance", value: bank.starting },
            { label: "Income", value: bank.income },
            { label: "Expense", value: bank.expense },
            { label: "Net", value: bank.net },
            { label: "Closing Balance", value: bank.closing },
          ].map((item, i) => (
            <div
              key={i}
              className="card p-4 flex items-center gap-3 shadow-md rounded-lg bg-white"
            >
              <div className="w-10 h-10 flex items-center justify-center rounded-md bg-blue-50">
                {i === 0 && <CreditCard className="w-5 h-5 text-blue-600" />}
                {i === 1 && <ArrowUp className="w-5 h-5 text-blue-600" />}
                {i === 2 && <DollarSign className="w-5 h-5 text-blue-600" />}
                {i === 3 && <ArrowUp className="w-5 h-5 text-blue-600" />}
                {i === 4 && <DollarSign className="w-5 h-5 text-blue-600" />}
              </div>
              <div className="flex-1">
                <div className="kv text-gray-600">{item.label}</div>
                <div className="text-2xl font-bold">₹{item.value.toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-sm text-gray-500 mt-2">
        This dashboard is read-only — starting balances are managed in the Payments
        screen. After making changes in Payments/Invoice, call{" "}
        <code>window.updateDashboardRefresh()</code> to refresh the dashboard.
      </div>
    </div>
  );
}
