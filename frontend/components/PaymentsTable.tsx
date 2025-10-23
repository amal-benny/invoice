// components/PaymentsTable.tsx
"use client";

import { useEffect, useState } from "react";
import { authFetch } from "../lib/api";
import type { Invoicepay } from "@/src/types/invoice";

type Payment = {
  id: number;
  amount: number;
  method: string;
  date: string;
  note?: string;
  reference?: string;
  invoice: Invoicepay & {
    invoiceNumber: string;
    subtotal: number;
    totalDiscount: number;
    totalGST: number;
    advancePaid: number;
    total: number;
    status: string;
  };
};

export default function PaymentsTable() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPayments() {
      setLoading(true);
      try {
        const data = (await authFetch("/api/payments")) as Payment[];
        setPayments(data);
      } catch (err) {
        setError("Failed to fetch payments: " + String(err));
      } finally {
        setLoading(false);
      }
    }
    fetchPayments();
  }, []);

  if (loading) return <div className="text-center py-4">Loading payments...</div>;
  if (error) return <div className="text-red-600 text-center py-4">{error}</div>;
  if (payments.length === 0) return <div className="text-center py-4">No payments found</div>;

  const formatAmount = (value: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);

  return (
    <div className="overflow-x-auto p-4 bg-white shadow-md rounded-lg">
      <h3 className="font-semibold text-lg mb-4">Receipt List</h3>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-indigo-50">
          <tr>
            {[
              "Invoice #", "Date", "Method", "Amount", "Subtotal",
              "Discount", "Tax", "Total", "Advance Paid", "Remaining",
              "Status", "Reference", "Note",
            ].map((header) => (
              <th
                key={header}
                className="px-4 py-2 text-left text-sm font-medium text-gray-700 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
  {payments.map((p) => {
    const subtotalNum = Number(p.invoice?.subtotal ?? 0);
    const discountNum = Number(p.invoice?.totalDiscount ?? 0);
    const taxable = subtotalNum - discountNum;

    // Treat totalGST as absolute (like PaymentModal)
    const taxAmount = Number(p.invoice?.totalGST ?? 0);

    // Total = taxable + taxAmount
    const total = taxable + taxAmount;

    // Advance paid from invoice
    const advancePaid = Number(p.invoice?.advancePaid ?? 0);

    // Remaining = total - advance
    const remaining = Math.max(0, total - advancePaid);

    return (
      <tr key={p.id} className="hover:bg-indigo-50 transition-colors">
        <td className="px-4 py-2 text-gray-800">{p.invoice.invoiceNumber}</td>
        <td className="px-4 py-2 text-gray-700">{new Date(p.date).toLocaleDateString()}</td>
        <td className="px-4 py-2">{p.method}</td>
        <td className="px-4 py-2 font-medium">{formatAmount(p.amount)}</td>
        <td className="px-4 py-2">{formatAmount(subtotalNum)}</td>
        <td className="px-4 py-2">{formatAmount(discountNum)}</td>
        <td className="px-4 py-2">{formatAmount(taxAmount)}</td>
        <td className="px-4 py-2 font-semibold">{formatAmount(total)}</td>
        <td className="px-4 py-2">{formatAmount(advancePaid)}</td>
        <td className="px-4 py-2">{formatAmount(remaining)}</td>
        <td className="px-4 py-2">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              p.invoice.status === "PAID"
                ? "bg-green-100 text-green-800"
                : p.invoice.status === "PARTIAL"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {p.invoice.status}
          </span>
        </td>
        <td className="px-4 py-2">{p.reference || "-"}</td>
        <td className="px-4 py-2">{p.note || "-"}</td>
      </tr>
    );
  })}
</tbody>

      </table>
    </div>
  );
}
