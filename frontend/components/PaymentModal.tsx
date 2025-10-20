// components/PaymentModal.tsx
"use client";
import { useState, useMemo } from "react";
import { authFetch } from "../lib/api";
import type { Invoicepay } from "@/src/types/invoice";

type MethodType = "Cash" | "Bank Transfer" | "UPI" | "Card" | "Other";
type WindowMethodType = "UPI" | "CASH" | "BANK" | "CARD";

declare global {
  interface Window {
    // NOTE: method first, amount second — match DashboardSummary
    updateDashboardIncome?: (method: WindowMethodType, amount: number) => void;
  }
}

export default function PaymentModal({
  invoice,
  onClose,
  onSuccess,
  allowOverpay = false,
}: {
  invoice: Invoicepay;
  onClose: () => void;
  onSuccess: (updatedInvoice: Invoicepay) => void;
  allowOverpay?: boolean;
}) {
  const currency = invoice?.currency ?? "INR";

  // Compute subtotal, discount, taxable, taxAmount, total
  const { subtotalNum, discountNum, taxable, taxAmount, total } =
    useMemo(() => {
      const subtotalNum = Number(invoice?.subtotal ?? 0);
      const discountNum = Number(invoice?.totalDiscount ?? 0);
      const taxRaw = Number(invoice?.totalGST ?? 0); // could be fraction, percent, or absolute

      const taxable = Math.max(0, subtotalNum - discountNum);

      let taxAmount = 0;
      if (taxRaw !== 0) {
        if (Math.abs(taxRaw) <= 1) {
          // fraction like 0.1 => 10% of taxable
          taxAmount = taxable * taxRaw;
        } else if (taxRaw > 1 && taxRaw <= 100) {
          // percentage like 10 => 10% of taxable
          taxAmount = taxable * (taxRaw / 100);
        } else {
          // absolute amount
          taxAmount = taxRaw;
        }
      }

      const total = Math.max(0, taxable + taxAmount);

      return {
        subtotalNum: Number(subtotalNum.toFixed(2)),
        discountNum: Number(discountNum.toFixed(2)),
        taxable: Number(taxable.toFixed(2)),
        taxAmount: Number(taxAmount.toFixed(2)),
        total: Number(total.toFixed(2)),
      };
    }, [invoice]);

  const existingAdvance = Number(invoice?.advancePaid ?? 0);
  const remaining = Math.max(0, Number((total - existingAdvance).toFixed(2)));

  const [amount, setAmount] = useState<number>(remaining || 0);
  const [method, setMethod] = useState<MethodType>("Cash");
  const [date, setDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [note, setNote] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const canSubmit = amount > 0 && !isNaN(amount);

  function onAmountChange(raw: string) {
    const parsed = Number(raw);
    if (isNaN(parsed)) {
      setAmount(0);
      return;
    }
    const rounded = Math.round(parsed * 100) / 100;
    setAmount(rounded);

    if (!allowOverpay && rounded > remaining) {
      setWarning(null);
      setError(
        `Amount exceeds remaining balance (${currency} ${remaining.toFixed(2)})`
      );
    } else if (allowOverpay && rounded > remaining) {
      setError(null);
      setWarning(
        `Entered amount is greater than remaining balance. This will be recorded as an overpayment (excess: ${currency} ${(
          rounded - remaining
        ).toFixed(2)}).`
      );
    } else {
      setError(null);
      setWarning(null);
    }
  }

  async function submitPayment(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!canSubmit) {
      setError("Enter a valid amount greater than 0");
      return;
    }
    if (!allowOverpay && amount > remaining) {
      setError(
        `Amount exceeds remaining balance (${currency} ${remaining.toFixed(2)})`
      );
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // round once and reuse
      const roundedAmount = Math.round(amount * 100) / 100;

      const payload: {
        invoiceId: number;
        amount: number;
        method: MethodType;
        date: string;
        note: string;
        reference?: string;
      } = {
        invoiceId: invoice.id,
        amount: roundedAmount,
        method,
        date,
        note,
      };

      if (reference) payload.reference = reference;

      const resp = (await authFetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })) as { invoice?: Invoicepay } | Invoicepay;

      const updatedInvoice: Invoicepay =
        "invoice" in resp && resp.invoice ? resp.invoice : (resp as Invoicepay);

      updatedInvoice.advancePaid = Number(
        Number(updatedInvoice.advancePaid ?? 0).toFixed(2)
      );
      updatedInvoice.total = Number(
        Number(updatedInvoice.total ?? total).toFixed(2)
      );

      if (!updatedInvoice.status) {
        if (updatedInvoice.total <= 0) updatedInvoice.status = "PAID";
        else if ((updatedInvoice.advancePaid || 0) <= 0)
          updatedInvoice.status = "PENDING";
        else if ((updatedInvoice.advancePaid || 0) >= updatedInvoice.total)
          updatedInvoice.status = "PAID";
        else updatedInvoice.status = "PARTIAL";
      }

      onSuccess(updatedInvoice);
      onClose();

      const methodMap: Record<MethodType, WindowMethodType> = {
        Cash: "CASH",
        UPI: "UPI",
        "Bank Transfer": "BANK",
        Card: "CARD",
        Other: "CASH",
      };

      const windowMethod = methodMap[method];

      // --- IMPORTANT: method first, amount second ---
      if (window.updateDashboardIncome) {
        window.updateDashboardIncome(windowMethod, roundedAmount);
      }
    } catch (err) {
      setError("Payment failed: " + String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
   <div
  className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2"
  role="dialog"
  aria-modal="true"
>
  <div className="w-full max-w-xl bg-white rounded-lg shadow-lg p-3"> 
    <h3 className="text-lg font-semibold mb-1">Record Payment</h3>

    <div className="space-y-1.5 mb-1.5">
      <div className="text-sm text-gray-700">
        <div><strong>Invoice:</strong> {invoice.invoiceNumber}</div>
        <div><strong>Subtotal:</strong> {currency} {subtotalNum.toFixed(2)}</div>
        <div><strong>Discount:</strong> {currency} {discountNum.toFixed(2)}</div>
        <div><strong>Taxable:</strong> {currency} {taxable.toFixed(2)}</div>
        <div><strong>Tax:</strong> {currency} {taxAmount.toFixed(2)}</div>
        <div><strong>Total:</strong> {currency} {total.toFixed(2)}</div>
        <div><strong>Already Paid:</strong> {currency} {existingAdvance.toFixed(2)}</div>
        <div><strong>Remaining:</strong> {currency} {remaining.toFixed(2)}</div>
      </div>

      <form onSubmit={submitPayment} className="space-y-1">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="kv text-sm">Amount ({currency})</label>
            <input
              className="input text-sm"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              placeholder={`${remaining.toFixed(2)}`}
            />
          </div>

          <div>
            <label className="kv text-sm">Date</label>
            <input
              className="input text-sm"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="kv text-sm">Payment Method</label>
            <select
              className="input text-sm"
              value={method}
              onChange={(e) => setMethod(e.target.value as MethodType)}
            >
              <option>Cash</option>
              <option>UPI</option>
              <option>Bank Transfer</option>
              <option>Card</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="kv text-sm">Reference</label>
            <input
              className="input text-sm"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="kv text-sm">Note</label>
          <textarea
            className="input text-sm"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {error && <div className="text-xs text-red-600">{error}</div>}
        {!error && warning && <div className="text-xs text-yellow-700">{warning}</div>}

        <div className="flex gap-2 mt-2 justify-end">
          <button
            type="button"
            className="px-3 py-1 border rounded text-sm"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn px-3 py-1 text-sm"
            disabled={!canSubmit || loading}
          >
            {loading ? "Processing..." : "Save Payment"}
          </button>
        </div>
      </form>
    </div>
  </div>
</div>

  );
}
