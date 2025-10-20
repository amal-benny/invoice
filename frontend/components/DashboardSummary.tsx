"use client";

import { useEffect, useState, useCallback } from "react";
import { DollarSign, CreditCard, ArrowUp } from "lucide-react";

type SummaryRow = {
  starting: number;
  income: number;
  closing: number;
};

type MethodType = "CASH" | "BANK" | "CARD" | "UPI";

// Persisted shape in localStorage
type PersistShape = {
  cash: { starting: number; income: number };
  bank: { starting: number; income: number };
};

declare global {
  interface Window {
    updateDashboardIncome?: (method: MethodType, amount: number) => void;
    // optional: a reset helper for dev/testing
    resetDashboardBalances?: () => void;
  }
}

const LS_KEY = "app_starting_balances_v1";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function readPersisted(): PersistShape {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      return { cash: { starting: 0, income: 0 }, bank: { starting: 0, income: 0 } };
    }
    const parsed = JSON.parse(raw) as Partial<PersistShape>;
    return {
      cash: {
        starting: Number(parsed?.cash?.starting ?? 0),
        income: Number(parsed?.cash?.income ?? 0),
      },
      bank: {
        starting: Number(parsed?.bank?.starting ?? 0),
        income: Number(parsed?.bank?.income ?? 0),
      },
    };
  } catch {
    return { cash: { starting: 0, income: 0 }, bank: { starting: 0, income: 0 } };
  }
}

function writePersisted(next: PersistShape) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

export default function DashboardSummary() {
  // internal UI state (closing derived)
  const [cash, setCash] = useState<SummaryRow>({ starting: 0, income: 0, closing: 0 });
  const [bank, setBank] = useState<SummaryRow>({ starting: 0, income: 0, closing: 0 });

  const [startAmount, setStartAmount] = useState<number | "">("");
  const [startMethod, setStartMethod] = useState<"CASH" | "BANK">("CASH");
  const [busy, setBusy] = useState(false);

  // On mount: read persisted starting & income values
  useEffect(() => {
    const p = readPersisted();
    setCash({
      starting: round2(p.cash.starting),
      income: round2(p.cash.income),
      closing: round2(p.cash.starting + p.cash.income),
    });
    setBank({
      starting: round2(p.bank.starting),
      income: round2(p.bank.income),
      closing: round2(p.bank.starting + p.bank.income),
    });
  }, []);

  // Save starting balance, persist without losing any existing income
  async function saveStartingBalance(method: "CASH" | "BANK", amount: number) {
    setBusy(true);
    try {
      const p = readPersisted();
      const next: PersistShape = {
        cash: { ...p.cash },
        bank: { ...p.bank },
      };
      if (method === "CASH") {
        next.cash.starting = round2(amount);
      } else {
        next.bank.starting = round2(amount);
      }
      writePersisted(next);

      // update UI using persisted values
      setCash({
        starting: round2(next.cash.starting),
        income: round2(next.cash.income),
        closing: round2(next.cash.starting + next.cash.income),
      });
      setBank({
        starting: round2(next.bank.starting),
        income: round2(next.bank.income),
        closing: round2(next.bank.starting + next.bank.income),
      });
    } finally {
      setBusy(false);
    }
  }

  const hasStartingForMethod = (method: "CASH" | "BANK") =>
    method === "CASH" ? cash.starting !== 0 : bank.starting !== 0;

  // Add payment and persist it — method FIRST, amount SECOND
  const addPaymentToSummary = useCallback((method: MethodType, amount: number) => {
    const amt = round2(amount);
    if (amt <= 0) return;

    const persisted = readPersisted();

    // treat CARD/UPI as BANK for balances (change if you want separate)
    if (method === "CASH") {
      const newIncome = round2(persisted.cash.income + amt);
      const next: PersistShape = {
        ...persisted,
        cash: { ...persisted.cash, income: newIncome },
      };
      writePersisted(next);
      setCash({
        starting: round2(next.cash.starting),
        income: round2(next.cash.income),
        closing: round2(next.cash.starting + next.cash.income),
      });
    } else {
      // BANK (including CARD/UPI)
      const newIncome = round2(persisted.bank.income + amt);
      const next: PersistShape = {
        ...persisted,
        bank: { ...persisted.bank, income: newIncome },
      };
      writePersisted(next);
      setBank({
        starting: round2(next.bank.starting),
        income: round2(next.bank.income),
        closing: round2(next.bank.starting + next.bank.income),
      });
    }
  }, []);

  // Expose global method (method first, amount second)
  useEffect(() => {
    window.updateDashboardIncome = addPaymentToSummary;

    // optional dev helper to reset balances from console
    window.resetDashboardBalances = () => {
      const zero: PersistShape = {
        cash: { starting: 0, income: 0 },
        bank: { starting: 0, income: 0 },
      };
      writePersisted(zero);
      setCash({ starting: 0, income: 0, closing: 0 });
      setBank({ starting: 0, income: 0, closing: 0 });
    };

    return () => {
      delete window.updateDashboardIncome;
      delete window.resetDashboardBalances;
    };
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
          onSubmit={(e) => {
            e.preventDefault();
            const amt = Number(startAmount || 0);
            if (isNaN(amt) || amt < 0) return alert("Enter a valid amount");
            saveStartingBalance(startMethod, round2(amt));
            setStartAmount("");
          }}
          className="flex flex-col md:flex-row items-start gap-3"
        >
          <input
            type="number"
            step="0.01"
            className="input w-full md:w-64"
            placeholder="Amount"
            value={startAmount === "" ? "" : String(startAmount)}
            onChange={(e) =>
              setStartAmount(e.target.value === "" ? "" : Number(e.target.value))
            }
          />
          <select
            className="input w-full md:w-48"
            value={startMethod}
            onChange={(e) => setStartMethod(e.target.value as "CASH" | "BANK")}
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
          Note: Payments from invoices and the payment modal automatically update the summary.
        </div>
      </div>
    </div>
  );
}
