"use client";
import { useState, useEffect } from "react";
import InvoiceTable from "../components/InvoiceTable";
import InlineInvoiceView from "../components/InlineInvoiceView";
import InvoiceForm from "../components/InvoiceForm";
import { authFetch } from "../lib/api";
import type { InvoicePayload } from "../components/InvoiceForm";

type InvoiceItem = {
  description: string;
  hsn?: string;
  quantity: number;
  price: number;
};

type Customer = {
  id?: number;
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
};

type Invoice = {
  id: number;
  invoiceNumber?: string;
  date?: string;
  dueDate?: string;
  type?: "QUOTE" | "INVOICE";
  currency?: string;
  subtotal?: number;
  totalGST?: number;
  totalDiscount?: number;
  advancePaid?: number;
  total?: number;
  note?: string;
  remark?: string;
  items?: InvoiceItem[];
  customerId?: number;
  customer?: Customer;
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);

  // ---------------- Load invoices ----------------
  useEffect(() => {
    (async () => {
      try {
        const data = await authFetch("/api/invoices");
        setInvoices(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load invoices:", error);
      }
    })();
  }, []);

  // ---------------- Refresh invoices ----------------
  async function refreshInvoices() {
    try {
      const data = await authFetch("/api/invoices");
      setInvoices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to refresh invoices:", error);
    }
  }

  // ---------------- Map Invoice to InvoicePayload ----------------
  function mapInvoiceToPayload(inv: Invoice): InvoicePayload {
  return {
    id: inv.id,
    type: inv.type === "QUOTE" ? "QUOTE" : "INVOICE",
    customerId: inv.customerId ?? inv.customer?.id ?? 0,
    customerName: inv.customer?.name ?? "",
    customerCompany: inv.customer?.company ?? "",
    customerEmail: inv.customer?.email ?? "",
    customerPhone: inv.customer?.phone ?? "",
    customerAddress: inv.customer?.address ?? "",
    date: inv.date ?? new Date().toISOString().slice(0, 10),
    dueDate: inv.dueDate ?? undefined,
    items: inv.items?.map(it => ({
      description: it.description ?? "",
      hsn: it.hsn ?? "",
      quantity: it.quantity ?? 1,
      price: it.price ?? 0,
    })) ?? [],
    currency: inv.currency ?? "INR",
    subtotal: inv.subtotal ?? 0,
    totalGST: inv.totalGST ?? 0,
    totalDiscount: inv.totalDiscount ?? 0,
    advancePaid: inv.advancePaid ?? 0,
    total: inv.total ?? 0,
    note: inv.note ?? "",
    remark: inv.remark ?? "",
  };
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
          initialInvoice={mapInvoiceToPayload(editInvoice)}
          onCreated={async (updatedInvoice) => {
            // Update local state after save
            setEditInvoice(null);
            await refreshInvoices();
          }}
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
            if (!confirm("Are you sure you want to delete this invoice?")) return;
            try {
              await authFetch(`/api/invoices/${id}`, { method: "DELETE" });
              await refreshInvoices();
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
