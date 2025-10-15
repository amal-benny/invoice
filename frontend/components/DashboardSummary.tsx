"use client";

import { useEffect, useState, useCallback } from "react";
import { DollarSign, CreditCard, ArrowUp } from "lucide-react";

type SummaryRow = {
  starting: number;
  income: number;
  closing: number;
};

type MethodType = "CASH" | "BANK";

// Extend window interface globally
declare global {
  interface Window {
    updateDashboardIncome?: (amount: number, method: "CASH" | "BANK" | "CARD" | "UPI") => void;
  }
}

export default function DashboardSummary() {
  const [cash, setCash] = useState<SummaryRow>({ starting: 0, income: 0, closing: 0 });
  const [bank, setBank] = useState<SummaryRow>({ starting: 0, income: 0, closing: 0 });

  const [startAmount, setStartAmount] = useState<number | "">("");
  const [startMethod, setStartMethod] = useState<MethodType>("CASH");
  const [busy, setBusy] = useState(false);

  const LS_KEY = "app_starting_balances_v1";

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const parsed = raw
        ? JSON.parse(raw)
        : { cash: { starting: 0 }, bank: { starting: 0 } };

      setCash({
        starting: Number(parsed.cash.starting ?? 0),
        income: 0,
        closing: Number(parsed.cash.starting ?? 0),
      });
      setBank({
        starting: Number(parsed.bank.starting ?? 0),
        income: 0,
        closing: Number(parsed.bank.starting ?? 0),
      });
    } catch {
      setCash({ starting: 0, income: 0, closing: 0 });
      setBank({ starting: 0, income: 0, closing: 0 });
    }
  }, []);

  async function saveStartingBalance(method: MethodType, amount: number) {
    setBusy(true);
    try {
      const raw = localStorage.getItem(LS_KEY);
      const parsed = raw
        ? JSON.parse(raw)
        : { cash: { starting: 0 }, bank: { starting: 0 } };
      const next = {
        ...parsed,
        [method === "CASH" ? "cash" : "bank"]: { starting: amount },
      };
      localStorage.setItem(LS_KEY, JSON.stringify(next));

      if (method === "CASH") {
        setCash(prev => ({
          starting: amount,
          income: prev.income,
          closing: Math.round((amount + prev.income) * 100) / 100,
        }));
      } else {
        setBank(prev => ({
          starting: amount,
          income: prev.income,
          closing: Math.round((amount + prev.income) * 100) / 100,
        }));
      }
    } finally {
      setBusy(false);
    }
  }

  const hasStartingForMethod = (method: MethodType) =>
    method === "CASH" ? cash.starting !== 0 : bank.starting !== 0;

  const onSubmitStarting = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const amt = Number(startAmount || 0);
    if (isNaN(amt) || amt < 0) return alert("Enter a valid amount");
    await saveStartingBalance(startMethod, amt);
    setStartAmount("");
  };

  const addPaymentToSummary = useCallback(
    (amount: number, method: "CASH" | "BANK" | "CARD" | "UPI") => {
      if (amount <= 0) return;
      const targetMethod: MethodType = method === "CASH" ? "CASH" : "BANK";
      if (targetMethod === "CASH") {
        setCash(prev => ({
          ...prev,
          income: prev.income + amount,
          closing: Math.round((prev.starting + prev.income + amount) * 100) / 100,
        }));
      } else {
        setBank(prev => ({
          ...prev,
          income: prev.income + amount,
          closing: Math.round((prev.starting + prev.income + amount) * 100) / 100,
        }));
      }
    },
    []
  );

  // Expose globally with proper type
  useEffect(() => {
    window.updateDashboardIncome = addPaymentToSummary;
  }, [addPaymentToSummary]);

  return (
    <div className="space-y-6">
      {/* --- Cash Summary --- */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Cash Balance Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {["Starting Balance", "Income", "Closing Balance"].map((label, i) => (
            <div
              key={i}
              className="card p-4 flex items-center gap-3 shadow-md rounded-lg bg-white"
            >
              <div className="w-10 h-10 flex items-center justify-center rounded-md bg-green-50">
                {i === 0 && <DollarSign className="w-5 h-5 text-green-600" />}
                {i === 1 && <ArrowUp className="w-5 h-5 text-green-600" />}
                {i === 2 && <CreditCard className="w-5 h-5 text-green-600" />}
              </div>
              <div className="flex-1">
                <div className="kv text-gray-600">{label}</div>
                <div className="text-2xl font-bold">
                  ₹
                  {i === 0
                    ? cash.starting.toFixed(2)
                    : i === 1
                    ? cash.income.toFixed(2)
                    : cash.closing.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- Bank Summary --- */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Bank Balance Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {["Starting Balance", "Income", "Closing Balance"].map((label, i) => (
            <div
              key={i}
              className="card p-4 flex items-center gap-3 shadow-md rounded-lg bg-white"
            >
              <div className="w-10 h-10 flex items-center justify-center rounded-md bg-blue-50">
                {i === 0 && <CreditCard className="w-5 h-5 text-blue-600" />}
                {i === 1 && <ArrowUp className="w-5 h-5 text-blue-600" />}
                {i === 2 && <DollarSign className="w-5 h-5 text-blue-600" />}
              </div>
              <div className="flex-1">
                <div className="kv text-gray-600">{label}</div>
                <div className="text-2xl font-bold">
                  ₹
                  {i === 0
                    ? bank.starting.toFixed(2)
                    : i === 1
                    ? bank.income.toFixed(2)
                    : bank.closing.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- Set Starting Balance Form --- */}
      <div className="card p-4">
        <h4 className="font-semibold mb-2">Set Starting Balance</h4>
        <form
          onSubmit={onSubmitStarting}
          className="flex flex-col md:flex-row items-start gap-3"
        >
          <input
            type="number"
            step="0.01"
            className="input w-full md:w-64"
            placeholder="Amount"
            value={startAmount === "" ? "" : String(startAmount)}
            onChange={e =>
              setStartAmount(e.target.value === "" ? "" : Number(e.target.value))
            }
          />
          <select
            className="input w-full md:w-48"
            value={startMethod}
            onChange={e => setStartMethod(e.target.value as MethodType)}
          >
            <option value="CASH">Cash</option>
            <option value="BANK">Bank</option>
          </select>
          <div className="flex gap-2 ml-auto">
            <button type="submit" className="btn" disabled={busy}>
              {hasStartingForMethod(startMethod)
                ? busy
                  ? "Updating..."
                  : "Update"
                : busy
                ? "Adding..."
                : "Add"}
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-md border"
              onClick={() => {
                setStartAmount("");
                setStartMethod("CASH");
              }}
            >
              Reset
            </button>
          </div>
        </form>
        <div className="text-sm text-gray-500 mt-3">
          Note: Payments from invoices (advance or full) automatically update the
          summary.
        </div>
      </div>
    </div>
  );
}
