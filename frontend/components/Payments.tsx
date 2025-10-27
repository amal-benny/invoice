// payment.tsx
"use client";
import { useEffect, useState } from "react";
import { authFetch } from "../lib/api";
import {
  Wallet,
  CreditCard,
  TrendingUp,
  DollarSign,
  ArrowUp,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import type { Settings } from "@/src/types/invoice";
import PaymentsTable from "./PaymentsTable";
import { toast} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


type TransactionType = "INCOME" | "EXPENSE";

interface Transaction {
  id: number;
  type: TransactionType;
  category: string;
  amount: number;
  date: string;
  description?: string;
  method: "Cash" | "Bank" | "UPI" | "Card" | string;
  reference?: string;
  closingBalance?: number;
}

interface Balance {
  id: number;
  amount: number;
  method: "Cash" | "Bank" | string;
  date: string;
}

interface Ledger {
  id: number;
  category: string;
}

interface SearchFilters {
  type: "" | TransactionType;
  category: string;
  date: string;
}

interface Stats {
  cashStarting: number;
  cashIncome: number;
  cashExpense: number;
  cashNet: number;
  cashClosing: number;
  bankStarting: number;
  bankIncome: number;
  bankExpense: number;
  bankNet: number;
  bankClosing: number;
  upiIncome?: number;
  cardIncome?: number;
  otherIncome?: number;
  netProfit?: number;
}

declare global {
  interface Window {
    updateDashboardIncome?: (method: WindowMethod, amount: number) => void;
  }
}

type WindowMethod = "CASH" | "BANK" | "UPI" | "CARD";


// Helper to convert number to words (unchanged)
function numberToWords(num: number): string {
  if (!num && num !== 0) return "";
  num = Math.floor(num);
  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function inWords(n: number): string {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    if (n < 1000)
      return (
        a[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? " " + inWords(n % 100) : "")
      );
    if (n < 100000)
      return (
        inWords(Math.floor(n / 1000)) +
        " Thousand" +
        (n % 1000 ? " " + inWords(n % 1000) : "")
      );
    if (n < 10000000)
      return (
        inWords(Math.floor(n / 100000)) +
        " Lakh" +
        (n % 100000 ? " " + inWords(n % 100000) : "")
      );
    return (
      inWords(Math.floor(n / 10000000)) +
      " Crore" +
      (n % 10000000 ? " " + inWords(n % 10000000) : "")
    );
  }

  return inWords(num) || "Zero";
}

export default function Payments() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [newBalance, setNewBalance] = useState<number>(0);
  const [newMethod, setNewMethod] = useState<"Cash" | "Bank">("Cash");
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [editingBalance, setEditingBalance] = useState<Balance | null>(null);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const [txnForm, setTxnForm] = useState({
    type: "INCOME" as TransactionType,
    category: "",
    amount: 0,
    date: "",
    description: "",
    method: "Cash" as "Cash" | "Bank",
    reference: "",
  });
  const [useOtherCategory, setUseOtherCategory] = useState(false);

  const [search, setSearch] = useState<SearchFilters>({
    type: "",
    category: "",
    date: "",
  });

  const [stats, setStats] = useState<Stats>({
  cashStarting: 0,
  cashIncome: 0,
  cashExpense: 0,
  cashNet: 0,
  cashClosing: 0,
  bankStarting: 0,
  bankIncome: 0,
  bankExpense: 0,
  bankNet: 0,
  bankClosing: 0,
  upiIncome: 0,
  cardIncome: 0,
  otherIncome: 0,
  netProfit: 0,
});





  const [downloadRange, setDownloadRange] = useState<{
    startDate?: string;
    endDate?: string;
  }>({ startDate: "", endDate: "" });

  useEffect(() => {
    loadBalances();
    loadTransactions();
    loadLedgers();
  }, []);

  // Recalculate summary whenever transactions OR balances change
  useEffect(() => {
    calculateSummary();
  }, [transactions, balances]);

  async function loadLedgers() {
    try {
      const data: Ledger[] = await authFetch("/api/payment-ledgers");
      if (Array.isArray(data)) setLedgers(data);
    } catch (err) {
      console.error("Failed to load ledgers", err);
       toast.error("Failed to load ledgers: " + String(err));
    }
  }

  async function loadBalances() {
    try {
      const data = (await authFetch("/api/transactions/balance")) as Balance[];
      const normalized: Balance[] = data.map((b) => ({
        ...b,
        method: b.method.charAt(0).toUpperCase() + b.method.slice(1).toLowerCase() as "Cash" | "Bank",
      }));
      setBalances(normalized);

      const existingBalance = normalized.find((b) => b.method === newMethod) || null;
      setEditingBalance(existingBalance);
      setNewBalance(existingBalance ? existingBalance.amount : 0);
    } catch (err) {
      console.error("Failed to load balances", err);
      toast.error("Failed to load balances: " + String(err));
    }
  }


   async function loadTransactions() {
    try {
      const query = new URLSearchParams(
        Object.fromEntries(Object.entries(search).filter(([, v]) => v !== ""))
      ).toString();

      const data = (await authFetch(`/api/transactions?${query}`)) as Transaction[];

      const normalized = data.map((t) => ({
        ...t,
        method: t.method.charAt(0).toUpperCase() + t.method.slice(1).toLowerCase() as "Cash" | "Bank",
      })) as Transaction[];

      setTransactions(normalized);
    } catch (err) {
      console.error("Failed to load transactions", err);
      toast.error("Failed to load transactions: " + String(err));
    }
  }

  async function addOrUpdateBalance() {
    if (!newBalance && newBalance !== 0) return;

    try {
      if (editingBalance) {
        await authFetch(`/api/transactions/balance/${editingBalance.id}`, {
          method: "PUT",
          body: JSON.stringify({ amount: newBalance, method: newMethod }),
          headers: { "Content-Type": "application/json" },  
        });
        toast.success("update transaction balance successfully");
      } else {
        await authFetch("/api/transactions/balance", {
          method: "POST",
          body: JSON.stringify({ amount: newBalance, method: newMethod }),
          headers: { "Content-Type": "application/json" },
        });
        toast.success("add transaction balance successfully");
      }
    } catch (err) {
      console.error("Failed to save balance", err);
    } finally {
      setNewBalance(0);
      setEditingBalance(null);
      setNewMethod("Cash");
      // reload balances & recalc summary
      await loadBalances();
    }
  }

  
  async function addTransaction() {
    try {
      const payload = {
        ...txnForm,
        amount: Number(txnForm.amount || 0),
        date: txnForm.date ? txnForm.date : new Date().toISOString(),
      };

      let saved: Transaction | null = null;

      if (editingTransaction) {
        saved = await authFetch(`/api/transactions/${editingTransaction.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
          headers: { "Content-Type": "application/json" },
        });
        toast.success("update transaction successfully");
      } else {
        saved = await authFetch("/api/transactions", {
          method: "POST",
          body: JSON.stringify(payload),
          headers: { "Content-Type": "application/json" },
        });
        toast.success("add transaction successfully");
      }

      const txToUse: Transaction =
        (saved as Transaction) ||
        ({
          id: editingTransaction?.id || Date.now(),
          ...payload,
        } as Transaction);

      // normalize method string on saved tx
      txToUse.method =
        typeof txToUse.method === "string"
          ? txToUse.method.charAt(0).toUpperCase() + txToUse.method.slice(1).toLowerCase()
          : txToUse.method;

      // Build the new transactions array deterministically
      const newTxs = (() => {
        const exists = transactions.some((t) => t.id === txToUse.id);
        if (exists) {
          return transactions.map((t) => (t.id === txToUse.id ? txToUse : t));
        }
        return [...transactions, txToUse];
      })();

      // Update state with the new array and recalc summary immediately
      // We call calculateSummary with newTxs explicitly to avoid timing issues
      setTransactions(newTxs);
      calculateSummary(newTxs);
    } catch (err) {
      console.error("Failed to add/update transaction", err);
      toast.error("Failed to add/update transaction");
    } finally {
      // Reset form and editing state
      setTxnForm({
        type: "INCOME",
        category: "",
        amount: 0,
        date: "",
        description: "",
        method: "Cash",
        reference: "",
      });
      setUseOtherCategory(false);
      setEditingTransaction(null);

      // Re-sync with server (best effort)
      try {
        await loadTransactions();
        await loadBalances();
      } catch (e) {console.error("Failed to load transactions", e);

        // ignore sync errors; UI already updated optimistically
      }
    }
  }

  // calculateSummary accepts an optional transactionsList to allow immediate recalculation
  function calculateSummary(transactionsList?: Transaction[]) {
    const txs = transactionsList ?? transactions;
    const cashStarting = balances.find((b) => (b.method || "").toString().toLowerCase() === "cash")?.amount || 0;
    const bankStarting = balances.find((b) => (b.method || "").toString().toLowerCase() === "bank")?.amount || 0;

    let cashIncome = 0,
      cashExpense = 0,
      bankIncome = 0,
      bankExpense = 0;

    txs.forEach((tx) => {
      const method = (tx.method || "").toString().toLowerCase();
      if (method === "cash") {
        if (tx.type === "INCOME") cashIncome += Number(tx.amount || 0);
        else cashExpense += Number(tx.amount || 0);
      } else if (method === "bank") {
        if (tx.type === "INCOME") bankIncome += Number(tx.amount || 0);
        else bankExpense += Number(tx.amount || 0);
      }
    });

    setStats({
      cashStarting,
      cashIncome: parseFloat(cashIncome.toFixed(2)),
      cashExpense: parseFloat(cashExpense.toFixed(2)),
      cashNet: parseFloat((cashIncome - cashExpense).toFixed(2)),
      cashClosing: parseFloat((cashStarting + cashIncome - cashExpense).toFixed(2)),
      bankStarting,
      bankIncome: parseFloat(bankIncome.toFixed(2)),
      bankExpense: parseFloat(bankExpense.toFixed(2)),
      bankNet: parseFloat((bankIncome - bankExpense).toFixed(2)),
      bankClosing: parseFloat((bankStarting + bankIncome - bankExpense).toFixed(2)),
    });
  }



useEffect(() => {
  // define real handler that updates stats
  window.updateDashboardIncome = (method: WindowMethod, amount: number) => {
    setStats((prev) => {
      const updated = { ...prev } as Stats & {
        upiIncome?: number;
        cardIncome?: number;
        otherIncome?: number;
        netProfit?: number;
      };

      switch (method) {
        case "CASH":
          updated.cashIncome += amount;
          updated.cashClosing += amount;
          break;
        case "BANK":
          updated.bankIncome += amount;
          updated.bankClosing += amount;
          break;
        case "UPI":
          updated.upiIncome = (updated.upiIncome || 0) + amount;
          break;
        case "CARD":
          updated.cardIncome = (updated.cardIncome || 0) + amount;
          break;
      }

      updated.netProfit =
        (updated.cashIncome || 0) +
        (updated.bankIncome || 0) +
        (updated.upiIncome || 0) +
        (updated.cardIncome || 0) +
        (updated.otherIncome || 0);

      return updated;
    });
  };

  // drain queued updates from localStorage (if any)
  try {
    const raw = localStorage.getItem("paymentUpdates");
    if (raw) {
      const arr: { method: WindowMethod; amount: number }[] = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0) {
        arr.forEach((u) => {
          if (typeof window.updateDashboardIncome === "function") {
            window.updateDashboardIncome(u.method, u.amount);
          }
        });
      }
      localStorage.removeItem("paymentUpdates");
    }
  } catch (e) {
    console.warn("Failed to apply queued payment updates", e);
  }
}, []);




  // --- downloadExcel & printRow keep same types ---
  function downloadExcel() {
    const start = downloadRange.startDate
      ? new Date(downloadRange.startDate)
      : null;
    const end = downloadRange.endDate ? new Date(downloadRange.endDate) : null;

    const filtered = transactions.filter((tx) => {
      const txDate = new Date(tx.date);
      if (start && txDate < start) return false;
      if (end && txDate > end) return false;
      return true;
    });

    const excelData = filtered.map((tx) => ({
      Type: tx.type,
      Category: tx.category,
      Amount: tx.amount,
      Method: tx.method,
      "Closing Balance": tx.closingBalance,
      Date: new Date(tx.date).toLocaleDateString(),
      Reference: tx.reference,
      Description: tx.description,
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buf], { type: "application/octet-stream" }),
      "transactions.xlsx"
    );
  }
  function printRow(tx: Transaction) {
    // load settings (saved by SettingsForm into localStorage)
    let settings: Settings | null = null;
    try {
      const s = localStorage.getItem("settings");
      if (s) settings = JSON.parse(s);
    } catch (e) {
      console.error("Failed to read settings from localStorage", e);
    }

    const logoUrl = settings?.logoPreview || "";
    const companyName = settings?.name || "Company Name";
    const companyAddress = settings?.address || "";
    const companyContact = settings?.contact || "";
    const companyEmail = settings?.email || "";
    const stateName = settings?.stateName || "";
    const gst = settings?.gstNumber || "";
    const heading =
      tx.type === "INCOME" ? "Receipt Voucher" : "Payment Voucher";
    const voucherNo = tx.id ?? "";
    const dateStr = tx.date
      ? new Date(tx.date).toLocaleDateString()
      : new Date().toLocaleDateString();
    const amountFormatted =
      typeof tx.amount === "number" ? tx.amount.toFixed(2) : tx.amount;

    const html = `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8"/>
      <title>${heading} - ${voucherNo}</title>
      <style>
        @page { size: A5; margin: 10mm; }
        html, body {
          font-family: "Arial", "Helvetica", sans-serif;
          -webkit-print-color-adjust: exact;
          color-adjust: exact;
          margin: 0;
          padding: 0;
        }
        .page {
          box-sizing: border-box;
          width: 100%;
          height: 100%;
          padding: 12px;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #ccc;
          padding-bottom: 8px;
          margin-bottom: 10px;
        }

        .logo {
          width: 90px;
          height: 90px;
          object-fit: contain;
        }

        .company {
          text-align: center;
          flex: 1;
          margin: 0 12px;
        }
        .company h1 {
          margin: 0;
          font-size: 18px;
          letter-spacing: 0.5px;
        }
        .company p {
          margin: 2px 0;
          font-size: 11px;
          color: #333;
        }

        .meta {
          text-align: right;
          min-width: 110px;
        }
        .meta .label { font-size: 11px; color: #666; }
        .meta .value { font-weight: 600; font-size: 13px; }

        .title {
          text-align: center;
          margin: 10px 0;
        }
        .title h2 {
          margin: 6px 0;
          font-size: 16px;
          letter-spacing: 0.6px;
        }
        .voucher-body {
          margin-top: 6px;
        }

        .fields {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }

        .fields td {
          padding: 6px 8px;
          vertical-align: top;
          font-size: 13px;
        }

        .fields .label {
          width: 28%;
          font-weight: 700;
        }

        .amount-box {
          border: 1px solid #cfcfcf;
          padding: 8px;
          display: inline-block;
          min-width: 120px;
          text-align: center;
          font-weight: 700;
          font-size: 16px;
        }

        .in-words {
          margin-top: 12px;
          font-weight: 600;
        }

        .signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 28px;
        }

        .signatures .sig {
          width: 30%;
          text-align: center;
          font-size: 12px;
        }

        /* small print adjustments for A5 */
        @media print {
          .page { padding: 6px; }
          .logo { width: 80px; height: 80px; }
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <div style="width:90px">
            ${
              logoUrl
                ? `<img src="${logoUrl}" class="logo" alt="logo"/>`
                : `<div style="width:90px;height:90px;"></div>`
            }
          </div>

          <div class="company">
            <h1>${companyName}</h1>
            <p>${companyAddress}</p>
            <p>${companyContact} ${companyEmail ? " | " + companyEmail : ""}</p>
            ${
              stateName || gst
                ? `<p style="font-size:11px;">${stateName} ${
                    gst ? "| GST: " + gst : ""
                  }</p>`
                : ""
            }
          </div>

          <div class="meta">
            <div><span class="label">No:</span><div class="value">${voucherNo}</div></div>
            <div style="margin-top:6px;"><span class="label">Date:</span><div class="value">${dateStr}</div></div>
          </div>
        </div>

        <div class="title">
          <h2>${heading}</h2>
        </div>

        <div class="voucher-body">
  <table class="fields">
    <tr>
      <td class="label">Head of Account</td>
      <td>${tx.category || "-"}</td>
    </tr>

    <tr>
      <td class="label">Towards</td>
      <td>${tx.description || "-"}</td>
    </tr>

    <tr>
      <td class="label">Method</td>
      <td>${tx.method || "-"}</td>
    </tr>
  </table>

  <div class="in-words" style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; width: 100%;">
  <span>INR ${numberToWords(Number(tx.amount) || 0)} Only</span>
  <div class="amount-box">₹ ${amountFormatted}</div>
</div>


  <div class="signatures">
    <div class="sig">Approved by Authority<br/><br/>__________________</div>
    <div class="sig">Office Accountant<br/><br/>__________________</div>
    <div class="sig">Signature of the Receiver<br/><br/>__________________</div>
  </div>
</div>


      <script>
        // auto print and close
        window.onload = function() {
          setTimeout(() => { window.print(); setTimeout(()=>window.close(), 300); }, 200);
        };

        // numberToWords fallback (short english converter) - used on client side
        function numberToWords(num) {
          if (!num && num !== 0) return '';
          num = Math.floor(num);
          var a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
          var b = ['', '', 'Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
          function inWords(n) {
            if (n < 20) return a[n];
            if (n < 100) return b[Math.floor(n/10)] + (n%10 ? ' ' + a[n%10] : '');
            if (n < 1000) return a[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + inWords(n%100) : '');
            if (n < 100000) return inWords(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' ' + inWords(n%1000) : '');
            if (n < 10000000) return inWords(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' ' + inWords(n%100000) : '');
            return inWords(Math.floor(n/10000000)) + ' Crore' + (n%10000000 ? ' ' + inWords(n%10000000) : '');
          }
          return inWords(num) || 'Zero';
        }
      </script>
    </body>
  </html>
  `;

    const w = window.open("", "_blank", "width=800,height=700");
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
    } else {
      alert("Please allow popups for printing.");
    }
  }

  const editTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setTxnForm({
      type: tx.type,
      category: tx.category,
      amount: tx.amount,
      date: tx.date ? tx.date.split("T")[0] : tx.date,
      description: tx.description || "",
      method: (tx.method as "Cash" | "Bank") || "Cash",
      reference: tx.reference || "",
    });
    setUseOtherCategory(false);
  };

 


  return (
    <div className="space-y-6">
      {/* --- Cash Summary --- */}
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Cash Balance Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <div className="card p-4 flex items-center gap-3 border-2 border-green-200">
            <Wallet className="w-6 h-6 text-green-500" />
            <div>
              <div className="kv">Starting Balance</div>
              <div className="text-2xl font-bold">₹{stats.cashStarting}</div>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3 border-2 border-green-200">
            <TrendingUp className="w-6 h-6 text-green-500" />
            <div>
              <div className="kv">Income</div>
              <div className="text-2xl font-bold">₹{stats.cashIncome}</div>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3 border-2 border-green-200">
            <DollarSign className="w-6 h-6 text-green-600" />
            <div>
              <div className="kv">Expense</div>
              <div className="text-2xl font-bold">₹{stats.cashExpense}</div>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3 border-2 border-green-200">
            <ArrowUp className="w-6 h-6 text-green-500" />
            <div>
              <div className="kv">Net</div>
              <div className="text-2xl font-bold">₹{stats.cashNet}</div>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3 border-2 border-green-200">
            <DollarSign className="w-6 h-6 text-green-500" />
            <div>
              <div className="kv">Closing Balance</div>
              <div className="text-2xl font-bold">₹{stats.cashClosing}</div>
            </div>
          </div>
        </div>
      </div>

      {/* --- Bank Summary --- */}
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Bank Balance Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <div className="card p-4 flex items-center gap-3 border-2 border-blue-200">
            <CreditCard className="w-6 h-6 text-blue-500" />
            <div>
              <div className="kv">Starting Balance</div>
              <div className="text-2xl font-bold">₹{stats.bankStarting}</div>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3 border-2 border-blue-200">
            <TrendingUp className="w-6 h-6 text-blue-500" />
            <div>
              <div className="kv">Income</div>
              <div className="text-2xl font-bold">₹{stats.bankIncome}</div>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3 border-2 border-blue-200">
            <DollarSign className="w-6 h-6 text-blue-600" />
            <div>
              <div className="kv">Expense</div>
              <div className="text-2xl font-bold">₹{stats.bankExpense}</div>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3 border-2 border-blue-200">
            <ArrowUp className="w-6 h-6 text-blue-500" />
            <div>
              <div className="kv">Net</div>
              <div className="text-2xl font-bold">₹{stats.bankNet}</div>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3 border-2 border-blue-200">
            <DollarSign className="w-6 h-6 text-blue-500" />
            <div>
              <div className="kv">Closing Balance</div>
              <div className="text-2xl font-bold">₹{stats.bankClosing}</div>
            </div>
          </div>
        </div>
      </div>

      {/* --- Set Starting Balance --- */}
      <div className="card p-4">
        <h3 className="font-semibold mb-2">Set Starting Balance</h3>
        <div className="flex gap-2">
          <input
            type="number"
            className="input"
            placeholder="Amount"
            value={newBalance}
            onChange={(e) => setNewBalance(Number(e.target.value))}
          />
          <select
            className="input"
            value={newMethod}
            onChange={(e) => {
              const method = e.target.value as "Cash" | "Bank";
              setNewMethod(method);

              // Set editingBalance based on selected method
              const existing =
                balances.find((b) => b.method === method) || null;
              setEditingBalance(existing);
              setNewBalance(existing ? existing.amount : 0);
            }}
          >
            <option value="Cash">Cash</option>
            <option value="Bank">Bank</option>
          </select>
          <button className="btn" onClick={addOrUpdateBalance}>
            {editingBalance ? "Update" : "Add"}
          </button>
        </div>

        <div className="mt-2 space-y-1">
          {balances.map((b: Balance) => (
            <div
              key={b.id}
              className="flex justify-between items-center border-b py-1"
            >
              <span>
                ₹{b.amount} ({b.method}) —{" "}
                {new Date(b.date).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* --- Add Transaction --- */}
      <div className="card p-4">
        <h3 className="font-semibold mb-2">
          {editingTransaction ? "Edit Transaction" : "Add New Transaction"}
        </h3>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <select
            className="input"
            value={txnForm.type}
            onChange={(e) =>
              setTxnForm({
                ...txnForm,
                type: e.target.value as TransactionType,
              })
            }
          >
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
          </select>
          <div>
            <select
              className="input w-full"
              value={useOtherCategory ? "__other__" : txnForm.category}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__other__") {
                  setUseOtherCategory(true);
                  setTxnForm({ ...txnForm, category: "" });
                } else {
                  setUseOtherCategory(false);
                  setTxnForm({ ...txnForm, category: v });
                }
              }}
            >
              <option value="">Select Category</option>
              {ledgers.map((l) => (
                <option key={l.id} value={l.category}>
                  {l.category}
                </option>
              ))}
              <option value="__other__">Other (type manually)</option>
            </select>

            {useOtherCategory && (
              <input
                className="input mt-2"
                placeholder="Enter category"
                value={txnForm.category}
                onChange={(e) =>
                  setTxnForm({ ...txnForm, category: e.target.value })
                }
              />
            )}
          </div>
          <input
            className="input"
            type="number"
            placeholder="Amount (₹)"
            value={txnForm.amount}
            onChange={(e) =>
              setTxnForm({ ...txnForm, amount: Number(e.target.value) })
            }
          />
          <input
            className="input"
            type="date"
            value={txnForm.date || ""}
            onChange={(e) => setTxnForm({ ...txnForm, date: e.target.value })}
          />
          <input
            className="input"
            placeholder="Description"
            value={txnForm.description}
            onChange={(e) =>
              setTxnForm({ ...txnForm, description: e.target.value })
            }
          />
          <select
            className="input"
            value={txnForm.method}
            onChange={(e) =>
              setTxnForm({
                ...txnForm,
                method: e.target.value as "Cash" | "Bank",
              })
            }
          >
            <option>Cash</option>
            <option>Bank</option>
          </select>
          <input
            className="input"
            placeholder="Reference"
            value={txnForm.reference}
            onChange={(e) =>
              setTxnForm({ ...txnForm, reference: e.target.value })
            }
          />
          <div />
          <button className="btn col-span-1" onClick={addTransaction}>
            {editingTransaction ? "Update Transaction" : "Add Transaction"}
          </button>
        </div>
      </div>

      {/* --- Transactions List --- */}
      <div className="space-y-6">
        <div className="card p-4 rounded-lg shadow-sm">
          <h3 className="font-semibold mb-3">Transactions Filter</h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* --- Search Fields (left side) --- */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium mb-1">Type</label>
                <select
                  className="input w-full"
                  value={search.type}
                  onChange={(e) =>
                    setSearch({
                      ...search,
                      type: e.target.value as "" | TransactionType,
                    })
                  }
                >
                  <option value="">All Types</option>
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Category
                </label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="Category"
                  value={search.category}
                  onChange={(e) =>
                    setSearch({ ...search, category: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Date</label>
                <input
                  type="date"
                  className="input w-full"
                  value={search.date || ""}
                  onChange={(e) =>
                    setSearch({ ...search, date: e.target.value })
                  }
                />
              </div>

              <div className="flex justify-end sm:justify-start">
                <button
                  className="btn w-full sm:w-auto"
                  onClick={loadTransactions}
                >
                  Search
                </button>
              </div>
            </div>
            {/* --- Download Excel (right side) --- */}
            <div className="flex justify-end">
              <div className="card p-3 rounded-lg shadow-sm w-full sm:w-auto">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                  <div>
                    <label className="text-xs font-medium mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      className="input w-full sm:w-36"
                      value={downloadRange.startDate || ""}
                      onChange={(e) =>
                        setDownloadRange({
                          ...downloadRange,
                          startDate: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium mb-1">End Date</label>
                    <input
                      type="date"
                      className="input w-full sm:w-36"
                      value={downloadRange.endDate || ""}
                      onChange={(e) =>
                        setDownloadRange({
                          ...downloadRange,
                          endDate: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="flex justify-end sm:justify-start">
                    <button
                      className="btn mt-2 sm:mt-0"
                      onClick={downloadExcel}
                    >
                      Download Excel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---------- Third Div: Table with rounded colored rows + action ----------- */}
        <div className="card p-4 rounded-lg shadow-md bg-white">
          <h3 className="font-semibold mb-4 text-lg border-b pb-2 text-gray-700">
            Transactions
          </h3>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="p-3 text-center font-semibold">Type</th>
                  <th className="p-3 text-center font-semibold">Category</th>
                  <th className="p-3 text-center font-semibold">Amount</th>
                  <th className="p-3 text-center font-semibold">Method</th>
                  <th className="p-3 text-center font-semibold">Closing</th>
                  <th className="p-3 text-center font-semibold">Date</th>
                  <th className="p-3 text-center font-semibold">Reference</th>
                  <th className="p-3 text-center font-semibold">Description</th>
                  <th className="p-3 text-center font-semibold">Action</th>
                </tr>
              </thead>

              <tbody>
                {transactions.map((tx) => {
                  const isIncome = tx.type === "INCOME";

                  return (
                    <tr
                      key={tx.id}
                      className="border-b last:border-0 hover:bg-gray-50 transition"
                    >
                      {/* Type badge only */}
                      <td className="p-3 align-top text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold  ${
                            isIncome
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>

                      <td className="p-3 align-top text-gray-700 text-center">
                        {tx.category}
                      </td>
                      <td className="p-3 text-center align-top text-gray-700 font-medium">
                        ₹{tx.amount}
                      </td>
                      <td className="p-3 align-top text-gray-600 text-center">
                        {tx.method}
                      </td>
                      <td className="p-3 text-center align-top text-gray-600">
                        ₹{tx.closingBalance ?? "-"}
                      </td>
                      <td className="p-3 align-top text-gray-600 text-center">
                        {new Date(tx.date).toLocaleDateString()}
                      </td>
                      <td className="p-3 align-top text-gray-600 text-center">
                        {tx.reference}
                      </td>
                      <td className="p-3 align-top text-gray-600 text-center">
                        {tx.description}
                      </td>

                      {/* Action Button */}
                      <td className="p-3 text-center align-top">
                        <button
                          className="text-white text-xs px-2 py-1 rounded-md mr-1 transition-all"
                          style={{ backgroundColor: "rgb(128, 41, 73)" }}
                          onClick={() => editTransaction(tx)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-white text-xs px-3 py-1 rounded-md transition-all"
                          style={{
                            backgroundColor: "rgb(128, 41, 73)",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "rgb(110, 30, 60)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "rgb(128, 41, 73)")
                          }
                          onClick={() => printRow(tx)}
                          title="Print this transaction"
                        >
                          Print
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {transactions.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="p-5 text-center text-gray-500 bg-gray-50 rounded-b-lg"
                    >
                      No transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <PaymentsTable />
     
    </div>
  );
}
