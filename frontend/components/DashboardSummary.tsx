// "use client";

// import { useEffect, useState } from "react";
// import { DollarSign, CreditCard, ArrowUp } from "lucide-react";
// import { authFetch } from "../lib/api"; // adjust path if needed

// type SummaryRow = {
//   starting: number;
//   income: number;
//   closing: number;
// };

// type ReportsPayload = {
//   cash?: { starting: number; income: number };
//   bank?: { starting: number; income: number };
// };

// export default function DashboardSummary({ stats }: { stats?: any }) {
//   // local UI state
//   const [loading, setLoading] = useState(false);

//   // store per-method summary
//   const [cash, setCash] = useState<SummaryRow>({ starting: 0, income: 0, closing: 0 });
//   const [bank, setBank] = useState<SummaryRow>({ starting: 0, income: 0, closing: 0 });

//   // form to set starting balance
//   const [startAmount, setStartAmount] = useState<number | "">("");
//   const [startMethod, setStartMethod] = useState<"CASH" | "BANK">("CASH");
//   const [busy, setBusy] = useState(false);

//   // localStorage keys (fallback)
//   const LS_KEY = "app_starting_balances_v1";

//   // load stats from server (preferred) or fall back to localStorage
//   async function loadStats() {
//     setLoading(true);
//     try {
//       // try server endpoint /api/reports/summary (should return shape below)
//       // expected shape (example):
//       // { cash: { starting: number, income: number }, bank: { starting: number, income: number } }
//       const res = await authFetch("/api/reports/summary");
//       // if server returns useful shape, use it; otherwise fallback to older stats prop
//       if (res && (res.cash || res.bank)) {
//         const cashStarting = Number(res.cash?.starting ?? 0);
//         const cashIncome = Number(res.cash?.income ?? 0);
//         setCash({
//           starting: cashStarting,
//           income: cashIncome,
//           closing: Math.round((cashStarting + cashIncome) * 100) / 100,
//         });

//         const bankStarting = Number(res.bank?.starting ?? 0);
//         const bankIncome = Number(res.bank?.income ?? 0);
//         setBank({
//           starting: bankStarting,
//           income: bankIncome,
//           closing: Math.round((bankStarting + bankIncome) * 100) / 100,
//         });
//         setLoading(false);
//         return;
//       }
//     } catch (e) {
//       // ignore: fallback to localStorage
//     }

//     // fallback: read from localStorage + use provided stats prop for total income distribution if available
//     try {
//       const raw = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
//       const parsed = raw ? JSON.parse(raw) : { cash: { starting: 0 }, bank: { starting: 0 } };
//       const cashStart = Number(parsed?.cash?.starting ?? 0);
//       const bankStart = Number(parsed?.bank?.starting ?? 0);

//       // if stats prop provided, we use it as total income; but we don't know per-method split
//       // so we default incomes to 0 and expect payments recorded with method will call backend
//       const fallbackCashIncome = 0;
//       const fallbackBankIncome = 0;

//       setCash({
//         starting: cashStart,
//         income: fallbackCashIncome,
//         closing: Math.round((cashStart + fallbackCashIncome) * 100) / 100,
//       });
//       setBank({
//         starting: bankStart,
//         income: fallbackBankIncome,
//         closing: Math.round((bankStart + fallbackBankIncome) * 100) / 100,
//       });
//     } catch (err) {
//       setCash({ starting: 0, income: 0, closing: 0 });
//       setBank({ starting: 0, income: 0, closing: 0 });
//     } finally {
//       setLoading(false);
//     }
//   }

//   useEffect(() => {
//     // initial load
//     loadStats();
//   }, []);

//   // helper: save starting balances to server (if available) otherwise to localStorage
//   async function saveStartingBalance(method: "CASH" | "BANK", amount: number) {
//     setBusy(true);
//     try {
//       // try server POST/PUT - upsert
//       // recommended server endpoint: POST /api/reports/starting-balance
//       // payload: { method: "CASH" | "BANK", amount: number }
//       // server should persist and return the updated summary object
//       try {
//         const saved = await authFetch("/api/reports/starting-balance", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ method, amount }),
//         });
//         // server returns updated summary for both cash & bank (preferred)
//         if (saved && (saved.cash || saved.bank)) {
//           const cashStarting = Number(saved.cash?.starting ?? cash.starting);
//           const cashIncome = Number(saved.cash?.income ?? cash.income);
//           setCash({
//             starting: cashStarting,
//             income: cashIncome,
//             closing: Math.round((cashStarting + cashIncome) * 100) / 100,
//           });
//           const bankStarting = Number(saved.bank?.starting ?? bank.starting);
//           const bankIncome = Number(saved.bank?.income ?? bank.income);
//           setBank({
//             starting: bankStarting,
//             income: bankIncome,
//             closing: Math.round((bankStarting + bankIncome) * 100) / 100,
//           });
//           setBusy(false);
//           return;
//         }
//       } catch (e) {
//         // server not available / returns error -> fallback to localStorage
//       }

//       // fallback to localStorage
//       const raw = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
//       const parsed = raw ? JSON.parse(raw) : { cash: { starting: 0 }, bank: { starting: 0 } };
//       const next = {
//         ...parsed,
//         [method === "CASH" ? "cash" : "bank"]: { starting: Number(amount) },
//       };
//       if (typeof window !== "undefined") localStorage.setItem(LS_KEY, JSON.stringify(next));

//       // update UI
//       if (method === "CASH") {
//         setCash((prev) => {
//           const starting = Number(amount);
//           const income = prev.income ?? 0;
//           return { starting, income, closing: Math.round((starting + income) * 100) / 100 };
//         });
//       } else {
//         setBank((prev) => {
//           const starting = Number(amount);
//           const income = prev.income ?? 0;
//           return { starting, income, closing: Math.round((starting + income) * 100) / 100 };
//         });
//       }
//     } finally {
//       setBusy(false);
//     }
//   }

//   // determine whether a starting balance exists for selected method (for Add vs Update label)
//   const hasStartingForMethod = (method: "CASH" | "BANK") => {
//     return method === "CASH" ? cash.starting !== 0 : bank.starting !== 0;
//   };

//   async function onSubmitStarting(e?: React.FormEvent) {
//     if (e) e.preventDefault();
//     const amt = Number(startAmount || 0);
//     if (Number.isNaN(amt) || amt < 0) return alert("Enter a valid amount");
//     await saveStartingBalance(startMethod, amt);
//     // clear input after save (optional)
//     setStartAmount("");
//   }

//   return (
//     <div>
//       {/* Cash Summary heading + 3 small cards */}
// <div className="mb-4">
//   <h3 className="text-lg font-semibold mb-3">Cash Balance Summary</h3>

//   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//     {/* Starting */}
//     <div className="card p-4 flex items-center gap-3 shadow-md rounded-lg bg-white">
//       <div className="w-10 h-10 flex items-center justify-center rounded-md bg-green-50">
//         <DollarSign className="w-5 h-5 text-green-600" />
//       </div>
//       <div className="flex-1">
//         <div className="kv text-gray-600">Starting Balance</div>
//         <div className="text-2xl font-bold">₹{Number(cash.starting || 0).toFixed(2)}</div>
//       </div>
//     </div>

//     {/* Income */}
//     <div className="card p-4 flex items-center gap-3 shadow-md rounded-lg bg-white">
//       <div className="w-10 h-10 flex items-center justify-center rounded-md bg-green-50">
//         <ArrowUp className="w-5 h-5 text-green-600" />
//       </div>
//       <div className="flex-1">
//         <div className="kv text-gray-600">Income</div>
//         <div className="text-2xl font-bold">₹{Number(cash.income || 0).toFixed(2)}</div>
//       </div>
//     </div>

//     {/* Closing */}
//     <div className="card p-4 flex items-center gap-3 shadow-md rounded-lg bg-white">
//       <div className="w-10 h-10 flex items-center justify-center rounded-md bg-green-50">
//         <CreditCard className="w-5 h-5 text-green-600" />
//       </div>
//       <div className="flex-1">
//         <div className="kv text-gray-600">Closing Balance</div>
//         <div className="text-2xl font-bold">₹{Number(cash.closing || 0).toFixed(2)}</div>
//       </div>
//     </div>
//   </div>
// </div>

// {/* Bank Summary heading + 3 small cards */}
// <div className="mb-4">
//   <h3 className="text-lg font-semibold mb-3">Bank Balance Summary</h3>

//   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//     {/* Starting */}
//     <div className="card p-4 flex items-center gap-3 shadow-md rounded-lg bg-white">
//       <div className="w-10 h-10 flex items-center justify-center rounded-md bg-blue-50">
//         <CreditCard className="w-5 h-5 text-blue-600" />
//       </div>
//       <div className="flex-1">
//         <div className="kv text-gray-600">Starting Balance</div>
//         <div className="text-2xl font-bold">₹{Number(bank.starting || 0).toFixed(2)}</div>
//       </div>
//     </div>

//     {/* Income */}
//     <div className="card p-4 flex items-center gap-3 shadow-md rounded-lg bg-white">
//       <div className="w-10 h-10 flex items-center justify-center rounded-md bg-blue-50">
//         <ArrowUp className="w-5 h-5 text-blue-600" />
//       </div>
//       <div className="flex-1">
//         <div className="kv text-gray-600">Income</div>
//         <div className="text-2xl font-bold">₹{Number(bank.income || 0).toFixed(2)}</div>
//       </div>
//     </div>

//     {/* Closing */}
//     <div className="card p-4 flex items-center gap-3 shadow-md rounded-lg bg-white">
//       <div className="w-10 h-10 flex items-center justify-center rounded-md bg-blue-50">
//         <DollarSign className="w-5 h-5 text-blue-600" />
//       </div>
//       <div className="flex-1">
//         <div className="kv text-gray-600">Closing Balance</div>
//         <div className="text-2xl font-bold">₹{Number(bank.closing || 0).toFixed(2)}</div>
//       </div>
//     </div>
//   </div>
// </div>


//       {/* Set Starting Balance form */}
//       <div className="card p-4">
//         <h4 className="font-semibold mb-2">Set Starting Balance</h4>
//         <form onSubmit={onSubmitStarting} className="flex flex-col md:flex-row items-start gap-3">
//           <input
//             type="number"
//             step="0.01"
//             className="input w-full md:w-64"
//             placeholder="Amount"
//             value={startAmount === "" ? "" : String(startAmount)}
//             onChange={(e) => setStartAmount(e.target.value === "" ? "" : Number(e.target.value))}
//           />

//           <select
//             className="input w-full md:w-48"
//             value={startMethod}
//             onChange={(e) => setStartMethod(e.target.value as "CASH" | "BANK")}
//           >
//             <option value="CASH">Cash</option>
//             <option value="BANK">Bank</option>
//           </select>

//           <div className="flex gap-2 ml-auto">
//             <button
//               type="submit"
//               className="btn"
//               disabled={busy}
//             >
//               {hasStartingForMethod(startMethod) ? (busy ? "Updating..." : "Update") : (busy ? "Adding..." : "Add")}
//             </button>

//             <button
//               type="button"
//               className="px-4 py-2 rounded-md border"
//               onClick={() => {
//                 setStartAmount("");
//                 setStartMethod("CASH");
//               }}
//             >
//               Reset
//             </button>
//           </div>
//         </form>

//         <div className="text-sm text-gray-500 mt-3">
//           Note: When payments are recorded elsewhere, the income for the selected payment method (Cash/Bank) should be sent to the reports summary endpoint so closing balances update automatically.
//         </div>
//       </div>
//     </div>
//   );
// }


"use client";

import { useEffect, useState, useCallback } from "react";
import { DollarSign, CreditCard, ArrowUp } from "lucide-react";
import { authFetch } from "../lib/api"; // adjust path if needed

type SummaryRow = {
  starting: number;
  income: number;
  closing: number;
};

type ReportsPayload = {
  cash?: { starting: number; income: number };
  bank?: { starting: number; income: number };
};

export default function DashboardSummary({ stats }: { stats?: any }) {
  // local UI state
  const [loading, setLoading] = useState(false);

  // store per-method summary
  const [cash, setCash] = useState<SummaryRow>({ starting: 0, income: 0, closing: 0 });
  const [bank, setBank] = useState<SummaryRow>({ starting: 0, income: 0, closing: 0 });

  // form to set starting balance
  const [startAmount, setStartAmount] = useState<number | "">("");
  const [startMethod, setStartMethod] = useState<"CASH" | "BANK">("CASH");
  const [busy, setBusy] = useState(false);

  const LS_KEY = "app_starting_balances_v1";

  /** Load summary from server or fallback */
  async function loadStats() {
    setLoading(true);
    try {
      const res = await authFetch("/api/reports/summary");
      if (res && (res.cash || res.bank)) {
        setCash({
          starting: Number(res.cash?.starting ?? 0),
          income: Number(res.cash?.income ?? 0),
          closing: Math.round((Number(res.cash?.starting ?? 0) + Number(res.cash?.income ?? 0)) * 100) / 100,
        });
        setBank({
          starting: Number(res.bank?.starting ?? 0),
          income: Number(res.bank?.income ?? 0),
          closing: Math.round((Number(res.bank?.starting ?? 0) + Number(res.bank?.income ?? 0)) * 100) / 100,
        });
        setLoading(false);
        return;
      }
    } catch (e) {
      // fallback
    }

    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
      const parsed = raw ? JSON.parse(raw) : { cash: { starting: 0 }, bank: { starting: 0 } };
      setCash({ starting: Number(parsed?.cash?.starting ?? 0), income: 0, closing: Number(parsed?.cash?.starting ?? 0) });
      setBank({ starting: Number(parsed?.bank?.starting ?? 0), income: 0, closing: Number(parsed?.bank?.starting ?? 0) });
    } catch {
      setCash({ starting: 0, income: 0, closing: 0 });
      setBank({ starting: 0, income: 0, closing: 0 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  /** Save starting balances */
  async function saveStartingBalance(method: "CASH" | "BANK", amount: number) {
    setBusy(true);
    try {
      try {
        const saved = await authFetch("/api/reports/starting-balance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method, amount }),
        });
        if (saved && (saved.cash || saved.bank)) {
          setCash({
            starting: Number(saved.cash?.starting ?? cash.starting),
            income: Number(saved.cash?.income ?? cash.income),
            closing: Math.round((Number(saved.cash?.starting ?? cash.starting) + Number(saved.cash?.income ?? cash.income)) * 100) / 100,
          });
          setBank({
            starting: Number(saved.bank?.starting ?? bank.starting),
            income: Number(saved.bank?.income ?? bank.income),
            closing: Math.round((Number(saved.bank?.starting ?? bank.starting) + Number(saved.bank?.income ?? bank.income)) * 100) / 100,
          });
          setBusy(false);
          return;
        }
      } catch {}
      // fallback localStorage
      const raw = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
      const parsed = raw ? JSON.parse(raw) : { cash: { starting: 0 }, bank: { starting: 0 } };
      const next = { ...parsed, [method === "CASH" ? "cash" : "bank"]: { starting: Number(amount) } };
      if (typeof window !== "undefined") localStorage.setItem(LS_KEY, JSON.stringify(next));

      if (method === "CASH") {
        setCash((prev) => ({
          starting: Number(amount),
          income: prev.income,
          closing: Math.round((Number(amount) + prev.income) * 100) / 100,
        }));
      } else {
        setBank((prev) => ({
          starting: Number(amount),
          income: prev.income,
          closing: Math.round((Number(amount) + prev.income) * 100) / 100,
        }));
      }
    } finally {
      setBusy(false);
    }
  }

  const hasStartingForMethod = (method: "CASH" | "BANK") => (method === "CASH" ? cash.starting !== 0 : bank.starting !== 0);

  async function onSubmitStarting(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const amt = Number(startAmount || 0);
    if (Number.isNaN(amt) || amt < 0) return alert("Enter a valid amount");
    await saveStartingBalance(startMethod, amt);
    setStartAmount("");
  }

  /**
   * REAL-TIME UPDATE HOOK
   * Call this function after any payment (advance or final)
   * method: "CASH" | "BANK" | "CARD" | "UPI"
   */
  const addPaymentToSummary = useCallback((amount: number, method: "CASH" | "BANK" | "CARD" | "UPI") => {
    if (amount <= 0) return;
    if (method === "CASH") {
      setCash((prev) => {
        const newIncome = prev.income + amount;
        return { ...prev, income: newIncome, closing: Math.round((prev.starting + newIncome) * 100) / 100 };
      });
    } else {
      setBank((prev) => {
        const newIncome = prev.income + amount;
        return { ...prev, income: newIncome, closing: Math.round((prev.starting + newIncome) * 100) / 100 };
      });
    }
  }, []);

  // Optionally export addPaymentToSummary if parent needs it:
  // export { addPaymentToSummary };

  return (
    <div>
      {/* Cash Summary */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-3">Cash Balance Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Starting */}
          <div className="card p-4 flex items-center gap-3 shadow-md rounded-lg bg-white">
            <div className="w-10 h-10 flex items-center justify-center rounded-md bg-green-50">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="kv text-gray-600">Starting Balance</div>
              <div className="text-2xl font-bold">₹{Number(cash.starting || 0).toFixed(2)}</div>
            </div>
          </div>
          {/* Income */}
          <div className="card p-4 flex items-center gap-3 shadow-md rounded-lg bg-white">
            <div className="w-10 h-10 flex items-center justify-center rounded-md bg-green-50">
              <ArrowUp className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="kv text-gray-600">Income</div>
              <div className="text-2xl font-bold">₹{Number(cash.income || 0).toFixed(2)}</div>
            </div>
          </div>
          {/* Closing */}
          <div className="card p-4 flex items-center gap-3 shadow-md rounded-lg bg-white">
            <div className="w-10 h-10 flex items-center justify-center rounded-md bg-green-50">
              <CreditCard className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="kv text-gray-600">Closing Balance</div>
              <div className="text-2xl font-bold">₹{Number(cash.closing || 0).toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bank Summary */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-3">Bank Balance Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Starting */}
          <div className="card p-4 flex items-center gap-3 shadow-md rounded-lg bg-white">
            <div className="w-10 h-10 flex items-center justify-center rounded-md bg-blue-50">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="kv text-gray-600">Starting Balance</div>
              <div className="text-2xl font-bold">₹{Number(bank.starting || 0).toFixed(2)}</div>
            </div>
          </div>
          {/* Income */}
          <div className="card p-4 flex items-center gap-3 shadow-md rounded-lg bg-white">
            <div className="w-10 h-10 flex items-center justify-center rounded-md bg-blue-50">
              <ArrowUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="kv text-gray-600">Income</div>
              <div className="text-2xl font-bold">₹{Number(bank.income || 0).toFixed(2)}</div>
            </div>
          </div>
          {/* Closing */}
          <div className="card p-4 flex items-center gap-3 shadow-md rounded-lg bg-white">
            <div className="w-10 h-10 flex items-center justify-center rounded-md bg-blue-50">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="kv text-gray-600">Closing Balance</div>
              <div className="text-2xl font-bold">₹{Number(bank.closing || 0).toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Set Starting Balance form */}
      <div className="card p-4">
        <h4 className="font-semibold mb-2">Set Starting Balance</h4>
        <form onSubmit={onSubmitStarting} className="flex flex-col md:flex-row items-start gap-3">
          <input
            type="number"
            step="0.01"
            className="input w-full md:w-64"
            placeholder="Amount"
            value={startAmount === "" ? "" : String(startAmount)}
            onChange={(e) => setStartAmount(e.target.value === "" ? "" : Number(e.target.value))}
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
              {hasStartingForMethod(startMethod) ? (busy ? "Updating..." : "Update") : (busy ? "Adding..." : "Add")}
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
          Note: When payments are recorded elsewhere, the income for the selected payment method (Cash/Bank) will update automatically using the addPaymentToSummary hook.
        </div>
      </div>
    </div>
  );
}
