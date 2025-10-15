"use client";
import { useState, useEffect } from "react";
import InvoiceTable from "../components/InvoiceTable";
import InlineInvoiceView from "../components/InlineInvoiceView";
import InvoiceForm from "../components/InvoiceForm";
import { authFetch } from "../lib/api";
import type { Invoice } from "../src/types/invoice";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(
    null
  );
  const [editInvoice, setEditInvoice] = useState<Invoice | undefined>();

  useEffect(() => {
    (async () => {
      try {
        const data: Invoice[] = await authFetch("/api/invoices");
        setInvoices(data);
      } catch (err) {
        alert("Failed ."+err);
      }
    })();
  }, []);

  async function refreshInvoices() {
    try {
      const data: Invoice[] = await authFetch("/api/invoices");
      setInvoices(data);
    } catch (err) {
      alert("Failed ."+err);
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
        <InvoiceForm
          initialInvoice={editInvoice}
          onCreated={async () => {
            setEditInvoice(undefined);
            await refreshInvoices();
          }}
        />
      ) : (
        <InvoiceTable
          invoices={invoices}
          onView={(id) => setSelectedInvoiceId(id)}
          onEdit={async (id) => {
            try {
              const inv: Invoice = await authFetch(`/api/invoices/${id}`);
              setEditInvoice(inv);
            } catch (err) {
              alert("Failed ."+err);
            }
          }}
          onDelete={async (id) => {
            if (!confirm("Are you sure you want to delete this invoice?"))
              return;

            try {
              await authFetch(`/api/invoices/${id}`, { method: "DELETE" });
              const data: Invoice[] = await authFetch("/api/invoices");
              setInvoices(data);
            } catch (err) {
              alert("Failed to delete invoice."+err);
            }
          }}
        />
      )}
    </div>
  );
}
