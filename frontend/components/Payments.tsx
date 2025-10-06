"use client";
import { useEffect, useState } from "react";
import { authFetch } from "../lib/api";
import { Wallet, CreditCard, TrendingDown, TrendingUp, DollarSign } from "lucide-react";

type TransactionType = "INCOME" | "EXPENSE";

interface Transaction {
  id: number;
  type: TransactionType;
  category: string;
  amount: number;
  date: string;
  description?: string;
  method: string;
  reference?: string;
}

interface Balance {
  id: number;
  amount: number;
  date: string;
}

export default function Payments() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [startingBalance, setStartingBalance] = useState<number>(0);
  const [newBalance, setNewBalance] = useState<number>(0);
  const [txnForm, setTxnForm] = useState({
    type: "INCOME",
    category: "",
    amount: 0,
    date: "",
    description: "",
    method: "Cash",
    reference: "",
  });
  const [search, setSearch] = useState({ type: "", category: "", date: "" });
  const [stats, setStats] = useState({ starting: 0, totalIncome: 0, totalExpense: 0, netProfit: 0, closing: 0 });

  useEffect(() => {
    loadBalances();
    loadTransactions();
  }, []);

  useEffect(() => {
    calculateSummary();
  }, [transactions, balances]);

  async function loadBalances() {
    const data = await authFetch("/api/transactions/balance");
    setBalances(data);
    if (data.length) setStartingBalance(data[0].amount);
  }

  async function loadTransactions() {
    const query = new URLSearchParams(search as any).toString();
    const data = await authFetch(`/api/transactions?${query}`);
    setTransactions(data);
  }

  async function addBalance() {
    if (!newBalance) return;
    await authFetch("/api/transactions/balance", {
      method: "POST",
      body: JSON.stringify({ amount: newBalance }),
      headers: { "Content-Type": "application/json" },
    });
    setNewBalance(0);
    loadBalances();
  }

  async function addTransaction() {
    await authFetch("/api/transactions", {
      method: "POST",
      body: JSON.stringify(txnForm),
      headers: { "Content-Type": "application/json" },
    });
    setTxnForm({
      type: "INCOME",
      category: "",
      amount: 0,
      date: "",
      description: "",
      method: "Cash",
      reference: "",
    });
    loadTransactions();
  }

  function calculateSummary() {
    const totalIncome = transactions.filter(t => t.type === "INCOME").reduce((a, t) => a + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === "EXPENSE").reduce((a, t) => a + t.amount, 0);
    const netProfit = totalIncome - totalExpense;
    const closing = startingBalance + netProfit;

    setStats({ starting: startingBalance, totalIncome, totalExpense, netProfit, closing });
  }

  return (
    <div className="space-y-6">
      {/* --- Summary Section --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
  <div
    className="card p-4 flex items-center gap-3 transition-transform hover:scale-105 cursor-pointer"
    style={{ border: "2px solid rgb(128, 41, 73)" }}
  >
    <Wallet className="w-6 h-6 text-primary" />
    <div>
      <div className="kv">Starting Balance</div>
      <div className="text-2xl font-bold">₹{stats.starting}</div>
    </div>
  </div>

  <div
    className="card p-4 flex items-center gap-3 transition-transform hover:scale-105 cursor-pointer"
    style={{ border: "2px solid rgb(128, 41, 73)" }}
  >
    <CreditCard className="w-6 h-6 text-green-500" />
    <div>
      <div className="kv">Total Income</div>
      <div className="text-2xl font-bold">₹{stats.totalIncome}</div>
    </div>
  </div>

  <div
    className="card p-4 flex items-center gap-3 transition-transform hover:scale-105 cursor-pointer"
    style={{ border: "2px solid rgb(128, 41, 73)" }}
  >
    <TrendingDown className="w-6 h-6 text-red-500" />
    <div>
      <div className="kv">Total Expenses</div>
      <div className="text-2xl font-bold">₹{stats.totalExpense}</div>
    </div>
  </div>

  <div
    className="card p-4 flex items-center gap-3 transition-transform hover:scale-105 cursor-pointer"
    style={{ border: "2px solid rgb(128, 41, 73)" }}
  >
    <TrendingUp className="w-6 h-6 text-blue-500" />
    <div>
      <div className="kv">Net Profit</div>
      <div className="text-2xl font-bold">₹{stats.netProfit}</div>
    </div>
  </div>

  <div
    className="card p-4 flex items-center gap-3 transition-transform hover:scale-105 cursor-pointer"
    style={{ border: "2px solid rgb(128, 41, 73)" }}
  >
    <DollarSign className="w-6 h-6 text-yellow-500" />
    <div>
      <div className="kv">Closing Balance</div>
      <div className="text-2xl font-bold">₹{stats.closing}</div>
    </div>
  </div>
</div>


      {/* --- Starting Balance Section --- */}
      <div className="card p-4">
        <h3 className="font-semibold mb-2">Set Starting Balance</h3>
        <div className="flex gap-2">
          <input type="number" className="input" placeholder="Amount" value={newBalance} onChange={e => setNewBalance(Number(e.target.value))} />
          <button className="btn" onClick={addBalance}>Add</button>
        </div>
        <div className="mt-2 space-y-1">
          {balances.map(b => (
            <div key={b.id} className="flex justify-between items-center border-b py-1">
              <span>₹{b.amount} — {new Date(b.date).toLocaleDateString()}</span>
              {/* edit/delete can be added later */}
            </div>
          ))}
        </div>
      </div>

      {/* --- Add Transaction Section --- */}
      <div className="card p-4">
        <h3 className="font-semibold mb-2">Add New Transaction</h3>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <select className="input" value={txnForm.type} onChange={e => setTxnForm({ ...txnForm, type: e.target.value })}>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
          </select>
          <input className="input" placeholder="Category" value={txnForm.category} onChange={e => setTxnForm({ ...txnForm, category: e.target.value })} />
          <input className="input" type="number" placeholder="Amount (₹)" value={txnForm.amount} onChange={e => setTxnForm({ ...txnForm, amount: Number(e.target.value) })} />
          <input className="input" type="date" value={txnForm.date} onChange={e => setTxnForm({ ...txnForm, date: e.target.value })} />
          <input className="input" placeholder="Description" value={txnForm.description} onChange={e => setTxnForm({ ...txnForm, description: e.target.value })} />
          <select className="input" value={txnForm.method} onChange={e => setTxnForm({ ...txnForm, method: e.target.value })}>
            <option>Cash</option>
            <option>UPI</option>
            <option>Bank</option>
          </select>
          <input className="input" placeholder="Reference" value={txnForm.reference} onChange={e => setTxnForm({ ...txnForm, reference: e.target.value })} />
          <div />
          <button className="btn col-span-1" onClick={addTransaction}>Add Transaction</button>
        </div>
      </div>

      {/* --- Transactions List Section --- */}
      <div className="card p-4">
        <h3 className="font-semibold mb-2">Transactions</h3>

        <div className="flex gap-2 mb-2">
          <select className="input" value={search.type} onChange={e => setSearch({ ...search, type: e.target.value })}>
            <option value="">All Types</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
          </select>
          <input className="input" placeholder="Category" value={search.category} onChange={e => setSearch({ ...search, category: e.target.value })} />
          <input className="input" type="date" value={search.date} onChange={e => setSearch({ ...search, date: e.target.value })} />
          <button className="btn" onClick={loadTransactions}>Search</button>
        </div>

        <div className="overflow-x-auto">
          <table className="table-auto w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-2 py-1">Type</th>
                <th className="px-2 py-1">Category</th>
                <th className="px-2 py-1">Amount</th>
                <th className="px-2 py-1">Date</th>
                <th className="px-2 py-1">Method</th>
                <th className="px-2 py-1">Reference</th>
                <th className="px-2 py-1">Description</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id} className="border-b hover:bg-gray-100">
                  <td className="px-2 py-1">{tx.type}</td>
                  <td className="px-2 py-1">{tx.category}</td>
                  <td className="px-2 py-1">₹{tx.amount}</td>
                  <td className="px-2 py-1">{new Date(tx.date).toLocaleDateString()}</td>
                  <td className="px-2 py-1">{tx.method}</td>
                  <td className="px-2 py-1">{tx.reference}</td>
                  <td className="px-2 py-1">{tx.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
