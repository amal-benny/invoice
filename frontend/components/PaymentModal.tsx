// components/PaymentModal.tsx
"use client";
import { useState } from "react";
import { authFetch } from "../lib/api";

type Invoice = {
  id: number;
  invoiceNumber?: string;
  currency?: string;
  total?: number;
  advancePaid?: number;
  status?: string;
  payments?: Payment[];
};

type Payment = {
  id: number;
  amount: number;
  date?: string;
  method?: string;
  reference?: string;
  note?: string;
};

export default function PaymentModal({
  invoice,
  onClose,
  onSuccess,
}: {
  invoice: Invoice;
  onClose: () => void;
  onSuccess: (updatedInvoice: Invoice) => void;
}) {
  const existingAdvance = Number(invoice?.advancePaid || 0);
  const total = Number(invoice?.total || 0);
  const remaining = Math.max(0, total - existingAdvance);

  const [amount, setAmount] = useState<number>(remaining || 0);
  const [method, setMethod] = useState<string>("Cash");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOverpayAllowed = true;
  const canSubmit = amount > 0 && !isNaN(amount);

  async function submitPayment(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!canSubmit) {
      setError("Enter a valid amount greater than 0");
      return;
    }
    if (!isOverpayAllowed && amount > remaining) {
      setError("Amount exceeds remaining balance");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const payload: {
        invoiceId: number;
        amount: number;
        method: string;
        date: string;
        note: string;
        reference?: string;
      } = {
        invoiceId: invoice.id,
        amount,
        method,
        date,
        note,
      };
      if (reference) payload.reference = reference;

      const resp = await authFetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const updatedInvoice: Invoice = resp?.invoice ?? resp;

      // Ensure numbers and fallback status
      if (updatedInvoice) {
        updatedInvoice.advancePaid = Number(updatedInvoice.advancePaid ?? 0);
        updatedInvoice.total = Number(updatedInvoice.total ?? 0);

        if (!updatedInvoice.status) {
          if (updatedInvoice.total <= 0) updatedInvoice.status = "PAID";
          else if ((updatedInvoice.advancePaid || 0) <= 0) updatedInvoice.status = "PENDING";
          else if ((updatedInvoice.advancePaid || 0) >= updatedInvoice.total) updatedInvoice.status = "PAID";
          else updatedInvoice.status = "PARTIAL";
        }
      }

      onSuccess(updatedInvoice);
      onClose();

      const amountPaid = amount;
      const methodType =
        method === "Cash"
          ? "CASH"
          : method === "Bank Transfer"
          ? "BANK"
          : method === "Card"
          ? "CARD"
          : method === "UPI"
          ? "UPI"
          : "CASH"; // fallback

      if (window.updateDashboardIncome) {
        window.updateDashboardIncome(amountPaid, methodType);
      }
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Payment failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-3">Record Payment</h3>

        <div className="space-y-3 mb-3">
          <div className="text-sm text-gray-700">
            <div>
              <strong>Invoice:</strong> {invoice.invoiceNumber}
            </div>
            <div>
              <strong>Total:</strong> {invoice.currency} {total.toFixed(2)}
            </div>
            <div>
              <strong>Already Paid (advance):</strong> {invoice.currency} {existingAdvance.toFixed(2)}
            </div>
            <div>
              <strong>Remaining:</strong> {invoice.currency} {remaining.toFixed(2)}
            </div>
          </div>

          <form onSubmit={submitPayment} className="space-y-2">
            <div>
              <label className="kv">Amount ({invoice.currency})</label>
              <input
                className="input"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value || 0))}
              />
            </div>

            <div>
              <label className="kv">Date</label>
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div>
              <label className="kv">Payment Method</label>
              <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option>Cash</option>
                <option>UPI</option>
                <option>Bank Transfer</option>
                <option>Card</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="kv">Reference (optional)</label>
              <input className="input" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>

            <div>
              <label className="kv">Note</label>
              <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <div className="flex gap-2 mt-3">
              <button type="button" className="px-4 py-2 border rounded" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn px-4 py-2" disabled={!canSubmit || loading}>
                {loading ? "Processing..." : "Save Payment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
