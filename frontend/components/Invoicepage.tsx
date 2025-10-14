"use client";
import { useState, useEffect } from "react";
import InvoiceTable from "../components/InvoiceTable";
import InlineInvoiceView from "../components/InlineInvoiceView";
import InvoiceForm from "../components/InvoiceForm";
import { authFetch } from "../lib/api";

type Invoice = {
  id: number;
  invoiceNumber?: string;
  date?: string;
  customerId?: number;
  total?: number;
  status?: string;
  // Add other fields as needed
};
// ...existing code...

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(
    null
  );
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null); // <-- new

  // Load invoices
  useEffect(() => {
    (async () => {
      try {
        // const data = await authFetch("/api/invoices");
        // setInvoices(data);
        const data = await authFetch("/api/invoices");
        setInvoices(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load invoices:", error);
      }
    })();
  }, []);

  // Refresh invoices after edit
  async function refreshInvoices() {
    try {
      // const data = await authFetch("/api/invoices");
      // setInvoices(data);
      const data = await authFetch("/api/invoices");
      setInvoices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to refresh invoices:", error);
    }
  }
  return (
    <div>
      {selectedInvoiceId ? (
        <InlineInvoiceView
          invoiceId={selectedInvoiceId}
          onBack={() => setSelectedInvoiceId(null)}
        />
      ) : editInvoice ? (
        // <InvoiceForm
        //   onCreated={async (updatedInvoice) => {
        //     setEditInvoice(null);
        //     await refreshInvoices();
        //   }}
        //   // Pass the invoice to edit
        //   initialInvoice={editInvoice} // <-- we’ll handle this in InvoiceForm
        // />

        <InvoiceForm
          onCreated={async () => {
            setEditInvoice(null);
            await refreshInvoices();
          }}
          initialInvoice={
            editInvoice
              ? {
                  id: editInvoice.id,
                  type: "INVOICE", // default or fetch from backend if available
                  customerId: editInvoice.customerId,
                  customerName: "", // default empty if not present
                  customerCompany: "",
                  customerEmail: "",
                  customerPhone: "",
                  customerAddress: "",
                  date:
                    editInvoice.date || new Date().toISOString().slice(0, 10),
                  items: [], // empty array if backend doesn't send items here
                  currency: "INR",
                  subtotal: 0,
                  totalGST: 0,
                  totalDiscount: 0,
                  advancePaid: 0,
                  total: editInvoice.total || 0,
                  remark: "",
                  note: "",
                }
              : undefined
          }
        />
      ) : (
        <InvoiceTable
          invoices={invoices}
          onView={(id) => setSelectedInvoiceId(id)}
          onEdit={async (id) => {
            try {
              const inv = await authFetch(`/api/invoices/${id}`);
              setEditInvoice(inv);
            } catch (error) {
              console.error("Failed to fetch invoice for edit:", error);
            }
          }}
          onDelete={async (id) => {
            if (!confirm("Are you sure you want to delete this invoice?"))
              return;

            try {
              await authFetch(`/api/invoices/${id}`, { method: "DELETE" });
              // Refresh table
              const data = await authFetch("/api/invoices");
              setInvoices(data);
            } catch (err) {
              console.error("Failed to delete invoice:", err);
              alert("Failed to delete invoice.");
            }
          }}
        />
      )}
    </div>
  );
}
