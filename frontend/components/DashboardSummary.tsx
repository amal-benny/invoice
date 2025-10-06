"use client";

import { DollarSign, ArrowUp, ArrowDown, TrendingUp, CreditCard } from "lucide-react";

interface TransactionStats {
  starting: number;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  closing: number;
}

export default function DashboardSummary({ stats }: { stats?: TransactionStats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
      {/* Starting Balance */}
      <div className="card p-4 flex items-center gap-3 shadow-md rounded-lg bg-white">
        <DollarSign className="w-8 h-8 text-purple-600" />
        <div>
          <div className="kv text-gray-600">Starting Balance</div>
          <div className="text-2xl font-bold">₹{stats?.starting ?? 0}</div>
        </div>
      </div>

      {/* Total Income */}
      <div className="card p-4 flex items-center gap-3 shadow-md rounded-lg bg-white">
        <ArrowUp className="w-8 h-8 text-green-600" />
        <div>
          <div className="kv text-gray-600">Total Income</div>
          <div className="text-2xl font-bold">₹{stats?.totalIncome ?? 0}</div>
        </div>
      </div>

      {/* Total Expenses */}
      <div className="card p-4 flex items-center gap-3 shadow-md rounded-lg bg-white">
        <ArrowDown className="w-8 h-8 text-red-600" />
        <div>
          <div className="kv text-gray-600">Total Expenses</div>
          <div className="text-2xl font-bold">₹{stats?.totalExpense ?? 0}</div>
        </div>
      </div>

      {/* Net Profit */}
      <div className="card p-4 flex items-center gap-3 shadow-md rounded-lg bg-white">
        <TrendingUp className="w-8 h-8 text-blue-600" />
        <div>
          <div className="kv text-gray-600">Net Profit</div>
          <div className="text-2xl font-bold">₹{stats?.netProfit ?? 0}</div>
        </div>
      </div>

      {/* Closing Balance */}
      <div className="card p-4 flex items-center gap-3 shadow-md rounded-lg bg-white">
        <CreditCard className="w-8 h-8 text-yellow-600" />
        <div>
          <div className="kv text-gray-600">Closing Balance</div>
          <div className="text-2xl font-bold">₹{stats?.closing ?? 0}</div>
        </div>
      </div>
    </div>
  );
}
