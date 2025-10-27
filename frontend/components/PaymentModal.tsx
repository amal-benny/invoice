// components/PaymentModal.tsx
"use client";
import { useState, useMemo } from "react";
import { authFetch } from "../lib/api";
import type { Invoicepay } from "@/src/types/invoice";


type MethodType = "Cash" | "Bank Transfer" | "UPI" | "Card" | "Other";
type WindowMethodType = "UPI" | "CASH" | "BANK" | "CARD";

declare global {
  interface Window {
    updateDashboardIncome?: (method: WindowMethodType, amount: number) => void;
    updateInvoiceRefresh?: (invoiceId?: number | string) => Promise<void>;
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

  // Calculate totals dynamically
 const { subtotalNum, discountNum, taxable, taxAmount, total } = useMemo(() => {
  const subtotalNum = Number(invoice?.subtotal ?? 0);
  const discountNum = Number(invoice?.totalDiscount ?? 0);
  const taxable = subtotalNum - discountNum;

  // Treat totalGST as absolute
  const taxAmount = Number(invoice?.totalGST ?? 0);

  const total = taxable + taxAmount;

  return { subtotalNum, discountNum, taxable, taxAmount, total };
}, [invoice]);


const existingAdvance = Number(invoice?.advancePaid ?? 0); // 85
const remaining = Number((total - existingAdvance).toFixed(2)); // 385-85=300

  const [amount, setAmount] = useState(remaining);
  const [method, setMethod] = useState<MethodType>("Cash");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [reference, setReference] = useState("");
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
    const roundedAmount = Math.round(amount * 100) / 100;

    const payload = {
      invoiceId: invoice.id,
      amount: roundedAmount,
      method,
      date,
      note,
      ...(reference && { reference }),
    };

    const resp = await authFetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // --- TypeScript-safe handling of response ---
    let updatedInvoice: Invoicepay;

    if ("invoice" in resp && resp.invoice) {
      updatedInvoice = resp.invoice; // safe, has id
    } else if (!("invoice" in resp)) {
      updatedInvoice = resp as Invoicepay; // resp itself is Invoicepay
    } else {
      throw new Error("Payment response missing invoice data");
    }

    // Ensure numeric fields are rounded
    updatedInvoice.advancePaid = Number(
      Number(updatedInvoice.advancePaid ?? 0).toFixed(2)
    );
    updatedInvoice.total = Number(
      Number(updatedInvoice.total ?? total).toFixed(2)
    );

    // Determine status if not present
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

    // Map frontend method to window method
    const methodMap: Record<MethodType, WindowMethodType> = {
      Cash: "CASH",
      UPI: "UPI",
      "Bank Transfer": "BANK",
      Card: "CARD",
      Other: "CASH",
    };

    const windowMethod = methodMap[method];

    if (window.updateDashboardIncome) {
      window.updateDashboardIncome(windowMethod, roundedAmount);
    }

    if (typeof window.updateInvoiceRefresh === "function") {
      try {
        await window.updateInvoiceRefresh(invoice.id);
      } catch (e) {
        console.warn("updateInvoiceRefresh failed:", e);
      }
    }
  } catch (err) {
    setError("Payment failed: " + String(err));
    
  } finally {
    setLoading(false);
  }
}


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2" role="dialog" aria-modal="true">
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
              <button type="button" className="px-3 py-1 border rounded text-sm" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn px-3 py-1 text-sm" disabled={!canSubmit || loading}>
                {loading ? "Processing..." : "Save Payment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
