"use client";
import { useState, useEffect } from "react";
import InvoiceTable from "../components/InvoiceTable";
import InlineInvoiceView from "../components/InlineInvoiceView";
import InvoiceForm from "../components/InvoiceForm";
import { authFetch } from "../lib/api";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(
    null
  );
  const [editInvoice, setEditInvoice] = useState<any | null>(null); // <-- new

  // Load invoices
  useEffect(() => {
    (async () => {
      try {
        const data = await authFetch("/api/invoices");
        setInvoices(data);
      } catch (err) {}
    })();
  }, []);

  // Refresh invoices after edit
  async function refreshInvoices() {
    try {
      const data = await authFetch("/api/invoices");
      setInvoices(data);
    } catch (err) {}
  }

  return (
    <div>
      {selectedInvoiceId ? (
        <InlineInvoiceView
          invoiceId={selectedInvoiceId}
          onBack={() => setSelectedInvoiceId(null)}
        />
      ) : editInvoice ? (
        <InvoiceForm
          onCreated={async (updatedInvoice) => {
            setEditInvoice(null);
            await refreshInvoices();
          }}
          // Pass the invoice to edit
          initialInvoice={editInvoice} // <-- we’ll handle this in InvoiceForm
        />
      ) : (
        <InvoiceTable
          invoices={invoices}
          onView={(id) => setSelectedInvoiceId(id)}
          onEdit={async (id) => {
            try {
              const inv = await authFetch(`/api/invoices/${id}`);
              setEditInvoice(inv);
            } catch (err) {}
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
              alert("Failed to delete invoice.");
            }
          }}
        />
      )}
    </div>
  );
}
