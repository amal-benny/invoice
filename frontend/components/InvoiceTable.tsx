"use client";
import { useEffect, useState } from "react";
import { authFetch } from "../lib/api";
import { Eye, Edit, Trash } from "lucide-react";
import PaymentModal from "../components/PaymentModal";
import type { Invoice } from "../src/types/invoice";
import type { Invoicepay } from "@/src/types/invoice";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

type Payment = {
  id?: number;
  amount: number;
  date?: string;
  method?: string;
  note?: string;
};

export default function InvoiceTable({
  invoices,
  onConvert,
  onView,
  onEdit,
  onPaymentSuccess,
}: {
  invoices: Invoice[];
  onConvert?: (id: number) => void;
  onView?: (id: number) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onPaymentSuccess?: (updatedInvoice: Invoice) => void;
}) {
  const [localInvoices, setLocalInvoices] = useState<Invoice[]>(invoices || []);
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [searchText, setSearchText] = useState("");

  // Load deleted IDs from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("deletedInvoices");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setDeletedIds(parsed);
      } catch {
        // ignore
      }
    }
  }, []);

  // Keep localInvoices in sync when invoices prop changes
  useEffect(() => {
    setLocalInvoices(invoices || []);
  }, [invoices]);

  async function convertToInvoice(id: number) {
    try {
      await authFetch(`/api/invoices/${id}/convert`, { method: "POST" });
      if (onConvert) onConvert(id);
    } catch (err) {
      // replaced alert with toast
      toast.error("Failed to convert quotation: " + String(err));
    }
  }

  function paidAmount(inv: Invoice) {
    const adv = Number(inv?.advancePaid ?? NaN);
    if (!Number.isNaN(adv)) return adv;
    if (Array.isArray(inv?.payments)) {
      return inv.payments!.reduce(
        (s: number, p: Payment) => s + Number(p.amount || 0),
        0
      );
    }
    return 0;
  }

  function computeStatus(inv: Invoice) {
    if (inv?.status === "OVERDUE") return "OVERDUE";
    const total = Number(inv?.total || 0);
    const paid = paidAmount(inv);

    if (total <= 0) return "PAID";
    if (paid <= 0) return "PENDING";
    if (paid >= total) return "PAID";
    return "PARTIAL";
  }

  function typeColor(type: "QUOTE" | "INVOICE") {
    return type === "QUOTE"
      ? "bg-red-100 text-red-800"
      : "bg-green-100 text-green-800";
  }

  function statusColor(status: string) {
    switch (status) {
      case "PAID":
        return "bg-green-100 text-green-800";
      case "PARTIAL":
        return "bg-yellow-100 text-yellow-800";
      case "OVERDUE":
        return "bg-red-100 text-red-800";
      case "PENDING":
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  function handlePaymentSuccess(updatedInvoice: Invoice) {
    if (onPaymentSuccess) {
      try {
        onPaymentSuccess(updatedInvoice);
      } catch {}
    }
    setLocalInvoices((prev) =>
      prev.map((inv) => (inv.id === updatedInvoice.id ? updatedInvoice : inv))
    );
  }

  const handleDelete = (id: number) => {
    // mark locally deleted, persist to localStorage, do NOT call onDelete
    setDeletedIds((prev) => {
      const updated = Array.from(new Set([...prev, id]));
      try {
        localStorage.setItem("deletedInvoices", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to persist deletedInvoices", e);
      }
      return updated;
    });

    toast.info("Marked invoice as deleted ");
    // Do NOT call onDelete(id) — user requested no DB delete from this button
  };

  // --- NEW: typed helper to get phone and sanitize it (no `any`) ---
  type CustomerPhoneShape = {
    phone?: string;
    mobile?: string;
    contact?: string;
    telephone?: string;
    // keep it open in case your customer object has other fields
    [key: string]: unknown;
  };

  function getCustomerPhoneRaw(inv: Invoice): string {
    // Cast only for structural access to likely phone fields (safe and narrow)
    const customer = (inv as Invoice & { customer?: CustomerPhoneShape }).customer;
    if (!customer) return "";
    return (
      customer.phone ??
      customer.mobile ??
      customer.contact ??
      customer.telephone ??
      ""
    );
  }

  // --- NEW: function to open Whatsapp link (uses window.open so no change to app state) ---
  function openWhatsAppForInvoice(inv: Invoice, paid: number) {
    const rawPhone = getCustomerPhoneRaw(inv);
    if (!rawPhone) {
      toast.info("Customer phone number not available.");
      return;
    }
    // sanitize digits only for wa.me usage
    const digits = String(rawPhone).replace(/\D/g, "");
    if (!digits) {
      toast.info("Customer phone number not available.");
      return;
    }

    const total = Number(inv.total || 0);
    const balance = Number((total - paid).toFixed(2));
    const name = inv.customer?.name || "";
    const invoiceNumber = inv.invoiceNumber || "";

    const message = `Hello ${name},\nInvoice: ${invoiceNumber}\nPaid: ${inv.currency} ${paid.toFixed(
      2
    )}\nBalance: ${inv.currency} ${balance.toFixed(2)}\n\nIf you have any questions, please reply here.`;

    // Use wa.me link. Note: wa.me requires full international format ideally.
    const waUrl = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;

    // open in new tab
    window.open(waUrl, "_blank", "noopener,noreferrer");
  }
  // --- END NEW helper functions ---

  // Filter invoices based on searchText
  const filteredInvoices = localInvoices.filter((inv) => {
    const text = searchText.toLowerCase();
    const dateStr = inv.date ? new Date(inv.date).toLocaleDateString() : "";
    return (
      (inv.invoiceNumber || "").toLowerCase().includes(text) ||
      (inv.customer?.name || "").toLowerCase().includes(text) ||
      dateStr.includes(text)
    );
  });

  return (
    <>
      <div className="card mt-6">
        <h3 className="text-lg font-semibold mb-3">Invoices / Quotations</h3>

        {/* Search field */}
        <div className="mb-4 flex flex-col md:flex-row md:items-center gap-2">
          <div className="relative w-full md:w-1/3">
            {/* Search icon */}
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M12.9 14.32a8 8 0 111.414-1.414l4.387 4.387a1 1 0 01-1.414 1.414l-4.387-4.387zM8 14a6 6 0 100-12 6 6 0 000 12z"
                  clipRule="evenodd"
                />
              </svg>
            </span>

            {/* Input */}
            <input
              type="text"
              placeholder="Search by Number, Customer or Date"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="border border-gray-300 rounded-full px-10 py-2 w-full focus:outline-none focus:ring-2 focus:ring-rgb(128, 41, 73) transition-all"
            />
          </div>

          {/* Search Button */}
          <button
            onClick={() => setSearchText(searchText.trim())} // triggers filtering
            className="bg-purple-600  text-white font-semibold px-4 py-2 rounded-full shadow-md transition-all"
            style={{ backgroundColor: "rgb(128, 41, 73)" }}
          >
            Search
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-auto border border-gray-200">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-3 py-2 border-b">#</th>
                <th className="px-3 py-2 border-b">Number</th>
                <th className="px-3 py-2 border-b">Type</th>
                <th className="px-3 py-2 border-b">Customer</th>
                <th className="px-3 py-2 border-b">Date</th>
                <th className="px-3 py-2 border-b">Total</th>
                <th className="px-3 py-2 border-b">Status</th>
                <th className="px-3 py-2 border-b">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-4">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv, idx) => {
                  const status = computeStatus(inv);
                  const paid = paidAmount(inv);
                  const isDeleted = inv.id ? deletedIds.includes(inv.id) : false;

                  return (
                    <tr
                      key={inv.id}
                      className={`hover:bg-gray-50 ${isDeleted ? "opacity-50" : ""}`}
                    >
                      <td className="px-3 py-2 border-b">{idx + 1}</td>
                      <td className="px-3 py-2 border-b">
                        {inv.invoiceNumber || "-"}
                      </td>
                      <td className="px-3 py-2 border-b">
                        <span
                          className={`px-3 py-1 font-semibold text-center ${typeColor(
                            inv.type as "QUOTE" | "INVOICE"
                          )} rounded-full inline-block`}
                        >
                          {inv.type}
                        </span>
                      </td>
                      <td className="px-3 py-2 border-b">{inv.customer?.name || "-"}</td>
                      <td className="px-3 py-2 border-b">
                        {inv.date ? new Date(inv.date).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-3 py-2 border-b">
                        {inv.currency} {Number(inv.total || 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 border-b">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 font-semibold text-center ${statusColor(
                              status
                            )} rounded-full inline-block`}
                          >
                            {status}
                          </span>
                          <div className="text-sm kv">
                            ({inv.currency} {paid.toFixed(2)} paid)
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-2 border-b flex gap-2 items-center">
                        {isDeleted ? (
                          <span className="px-3 py-1 bg-red-300 text-gray-600 rounded-full text-sm font-semibold">
                            Deleted (read-only)
                          </span>
                        ) : (
                          <>
                            {inv.type === "QUOTE" ? (
                              <button
                                className="px-3 py-2 text-white rounded"
                                style={{ backgroundColor: "rgb(128, 41, 73)" }}
                                onClick={() => convertToInvoice(inv.id)}
                              >
                                Convert
                              </button>
                            ) : (
                              <button
                                className="px-2 py-1 bg-green-500 text-white rounded"
                                onClick={() => setPayInvoice(inv)}
                              >
                                Pay
                              </button>
                            )}

                            <button
                              className="p-2 bg-gray-200 hover:bg-gray-300 rounded"
                              onClick={() => onView?.(inv.id)}
                              title="View"
                            >
                              <Eye size={20} />
                            </button>
                            <button
                              className="p-2 bg-yellow-200 hover:bg-yellow-300 rounded"
                              onClick={() => onEdit?.(inv.id)}
                              title="Edit"
                            >
                              <Edit size={20} />
                            </button>

                            {/* --- WhatsApp button --- */}
                            <button
                              className="p-2 bg-green-600 hover:bg-green-700 text-white rounded flex items-center gap-1"
                              onClick={() => openWhatsAppForInvoice(inv, paid)}
                              title="Send WhatsApp"
                              aria-label={`Send WhatsApp to ${inv.customer?.name || "customer"}`}
                            >
                              {/* small WhatsApp SVG icon */}
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                aria-hidden="true"
                              >
                                <path d="M20.52 3.48A11.81 11.81 0 0012.06.5 11.93 11.93 0 001.5 11.9c0 2.11.55 4.17 1.6 6L.5 22.5l4.8-1.33a11.78 11.78 0 005.9 1.43h.01c6.63 0 12-5.37 12-12 0-1.98-.5-3.85-1.7-5.12zM12.06 20.5c-1.78 0-3.5-.47-5.02-1.36l-.36-.21-2.82.78.75-2.7-.23-.44A8.05 8.05 0 013.06 11.9c0-4.47 3.63-8.1 8.1-8.1 2.16 0 4.19.84 5.72 2.37a7.98 7.98 0 012.37 5.73c0 4.47-3.63 8.1-8.1 8.1z" />
                                <path d="M17.85 14.15c-.3-.15-1.78-.88-2.06-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.96 1.18-.18.2-.36.23-.67.08-.3-.15-1.26-.46-2.4-1.48-.89-.8-1.48-1.78-1.66-2.08-.18-.3-.02-.46.13-.61.13-.13.3-.36.45-.54.15-.18.2-.3.3-.5.1-.2 0-.38-.02-.53-.02-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.68-.51-.18-.01-.38-.01-.58-.01-.2 0-.53.08-.81.38-.28.3-1.06 1.04-1.06 2.55 0 1.5 1.09 2.96 1.24 3.17.15.2 2.14 3.34 5.2 4.68 3.06 1.34 3.06.89 3.62.83.56-.06 1.78-.72 2.03-1.41.25-.7.25-1.29.18-1.41-.06-.12-.28-.2-.58-.35z" />
                              </svg>
                            </button>

                            <button
                              className="p-2 bg-red-200 hover:bg-red-300 rounded"
                              onClick={() => handleDelete(inv.id)}
                              title="Delete"
                            >
                              <Trash size={20} />
                            </button>
                            {/* --- END WhatsApp button --- */}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {payInvoice && (
        <PaymentModal
          invoice={payInvoice as Invoicepay}
          onClose={() => setPayInvoice(null)}
          onSuccess={(updatedInvoice: Invoice) => {
            setPayInvoice(null);
            handlePaymentSuccess(updatedInvoice);
          }}
        />
      )}
    </>
  );
}
