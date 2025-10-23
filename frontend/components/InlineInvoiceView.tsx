"use client";
import { useEffect, useState, useRef } from "react";
import { authFetch } from "../lib/api";
import html2pdf from "html2pdf.js";
import InvoiceForm from "./InvoiceForm";
import type { Invoice } from "../src/types/invoice";



 

/* ---------- Types ---------- */

type InvoiceItem = {
  description: string;
  quantity: number;
  price: number;
  gstPercent?: number | null;
  discount?: number | null;
  category?: string | null;
  advance?: number | null;
  remark?: string | null;
  hsn?: string | null;
};

type CompanyDetails = {
  name?: string;
  address?: string;
  contact?: string;
  defaultNote?: string;
  [key: string]: unknown;
};

declare global {
  interface Window {
    updateInvoiceRefresh?: (invoiceId?: number | string) => Promise<void>;
  }
}

/* --------------------------- */

export default function InlineInvoiceView({
  invoiceId,
  companyLogo,
  companyDetails,
  onBack,
}: {
  invoiceId?: number | string | undefined;
  companyLogo?: string;
  companyDetails?: CompanyDetails;
  onBack?: () => void;
}) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const company = (invoice?.company as CompanyDetails) || companyDetails || {};
  const componentRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchInvoice() {
      if (!invoiceId) return;
      try {
        const data = (await authFetch(`/api/invoices/${invoiceId}`)) as Invoice;
        if (!mounted) return;
        setInvoice(data);
      } catch (e) {
        if (!mounted) return;
        console.error("Failed to fetch invoice:", e);
        setInvoice(null);
      }
    }

    // initial fetch
    fetchInvoice();

    // expose a typed global refresh helper that reuses fetchInvoice
    window.updateInvoiceRefresh = async (maybeId?: number | string) => {
      // if a specific id is provided but it doesn't match this view, ignore the call
      if (maybeId !== undefined && String(maybeId) !== String(invoiceId))
        return;
      await fetchInvoice();
    };

    return () => {
      mounted = false;
      try {
        delete window.updateInvoiceRefresh;
      } catch {}
    };
  }, [invoiceId]);

  const handlePrint = (pageSize: "A4" | "A5" = "A4") => {
    if (!componentRef.current) return;

    // Optional: include existing <style> and <link> elements from the current document
    const styles = Array.from(
      document.querySelectorAll("style, link[rel='stylesheet']")
    )
      .map((el) => el.outerHTML)
      .join("\n");

    // Explicit print CSS (matches invoice container look & layout)
    const compactCss = `
  /* Reset for print */
  html, body { margin:0; padding:0; -webkit-print-color-adjust: exact; color-adjust: exact; font-size:10px; }
  body { font-family: Inter, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial; color:#111827; }

  /* Invoice card */
  .invoice-card { 
    box-sizing: border-box; 
    width:100%; 
    max-width:700px; 
    margin:0px auto; 
    padding:12px; 
    background:#ffffff; 
    border:1px solid #e6e6e6; 
    border-radius:4px; 
  }

  /* Header */
  .invoice-header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
  .invoice-left { display:flex; align-items:center; gap:8px; }
  .company-logo { height:40px; width:auto; object-fit:contain; }
  .company-name { font-size:14px; font-weight:700; line-height:1.1; }
  .company-meta { font-size:8px; color:rgba(0,0,0,0.65); margin-top:1px; }
  .invoice-right { text-align:right; }
  .invoice-type { font-size:16px; font-weight:700; letter-spacing:0.3px; }
  .invoice-meta { margin-top:4px; display:inline-block; background:#f3f4f6; padding:4px 6px; border-radius:3px; font-size:8px; color:#111827; }

  /* Bill To block */
  .bill-to { margin-top:8px; background:#f9fafb; padding:8px; border-radius:3px; border:1px solid #f1f1f1; font-size:9px; color:#111827; }

  /* Items table */
  .items-table { width:100%; border-collapse:collapse; margin-top:8px; font-size:9px; }
  .items-table thead tr { background:#6b2135; color:#fff; }
  .items-table th, .items-table td { padding:4px 4px; border-bottom:1px solid #eee; vertical-align:top; }
  .items-table th { font-weight:700; font-size:9px; text-align:left; }
  .items-table td { color:#111827; }
  .items-table .text-right { text-align:right; }
  .items-table .text-center { text-align:center; }

  /* Summary box */
  .summary-wrap { display:flex; justify-content:flex-end; margin-top:8px; }
  .summary-box { width:200px; background:#f9fafb; border:1px solid #ececec; border-radius:4px; padding:6px; font-size:9px; }
  .summary-row { display:flex; justify-content:space-between; padding:2px 0; color:#111827; }
  .summary-row.small { font-size:8px; color:rgba(0,0,0,0.7); }
  .balance { font-weight:700; color:#7b2540; font-size:12px; margin-top:4px; }

  /* Notes */
  .notes { margin-top:6px; background:#f9fafb; padding:6px; border-radius:3px; border:1px solid #ececec; font-size:9px; }

  /* Utility classes */
  .kv { font-size:8px; color:rgba(0,0,0,0.65); }
  .small { font-size:8px; color:rgba(0,0,0,0.65); }

  /* Print page size and margins */
  @media print {
    @page { size: ${pageSize} portrait; margin: 3mm; }
    body { margin: 0; }
    .invoice-card { box-shadow:none !important; }
  }
`;

    // Build the HTML for print window. We wrap the card in a container invoice-card
    // We take the existing component outerHTML and wrap. Also ensure table classes replaced
    // so our print CSS applies. (componentRef contains the invoice card already styled with classes)
    const invoiceHtml = componentRef.current.outerHTML;

    const printWindow = window.open("", "", "width=900,height=700");
    if (!printWindow) return;

    printWindow.document.write(`
    <html>
      <head>
        <title>${
          invoice ? `Invoice-${invoice.invoiceNumber}` : "Invoice"
        }</title>
        ${styles}
        <style>${compactCss}</style>
      </head>
      <body>
        ${invoiceHtml}
        <script>
          // Inline script to remove any interaction-only elements and force links/images to load
          (function(){
            // Force images to load (useful if base64 or remote)
            const imgs = document.images;
            for (let i=0;i<imgs.length;i++){
              const img = imgs[i];
              // if image has data-src attribute, set src
              if(!img.complete && img.dataset && img.dataset.src){
                img.src = img.dataset.src;
              }
            }
          })();
        </script>
      </body>
    </html>
  `);

    printWindow.document.close();

    // Wait for images/fonts to load before print (small delay ensures layout is ready)
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 350);
  };

  const handleDownloadPDF = (pageSize: "A4" | "A5" = "A4") => {
    if (!componentRef.current) return;

    // Capture any <style> and <link> tags from the document (for Tailwind or custom fonts)
    const styles = Array.from(
      document.querySelectorAll("style, link[rel='stylesheet']")
    )
      .map((el) => el.outerHTML)
      .join("\n");

    // Define invoice-specific styling (same as print layout)
    const compactCss = `
  /* Reset for print */
  html, body { margin:0; padding:0; -webkit-print-color-adjust: exact; color-adjust: exact; font-size:10px; }
  body { font-family: Inter, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial; color:#111827; }

  /* Invoice card */
  .invoice-card { 
    box-sizing: border-box; 
    width:100%; 
    max-width:700px; 
    margin:10px auto; 
    padding:16px; 
    background:#ffffff; 
    border:1px solid #e6e6e6; 
    border-radius:4px; 
  }

  /* Header */
  .invoice-header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
  .invoice-left { display:flex; align-items:center; gap:8px; }
  .company-logo { height:40px; width:auto; object-fit:contain; }
  .company-name { font-size:14px; font-weight:700; line-height:1.1; }
  .company-meta { font-size:8px; color:rgba(0,0,0,0.65); margin-top:1px; }
  .invoice-right { text-align:right; }
  .invoice-type { font-size:16px; font-weight:700; letter-spacing:0.3px; }
  .invoice-meta { margin-top:4px; display:inline-block; background:#f3f4f6; padding:4px 6px; border-radius:3px; font-size:8px; color:#111827; }

  /* Bill To block */
  .bill-to { margin-top:8px; background:#f9fafb; padding:8px; border-radius:3px; border:1px solid #f1f1f1; font-size:9px; color:#111827; }

  /* Items table */
  .items-table { width:100%; border-collapse:collapse; margin-top:8px; font-size:9px; }
  .items-table thead tr { background:#6b2135; color:#fff; }
  .items-table th, .items-table td { padding:4px 4px; border-bottom:1px solid #eee; vertical-align:top; }
  .items-table th { font-weight:700; font-size:9px; text-align:left; }
  .items-table td { color:#111827; }
  .items-table .text-right { text-align:right; }
  .items-table .text-center { text-align:center; }

  /* Summary box */
  .summary-wrap { display:flex; justify-content:flex-end; margin-top:8px; }
  .summary-box { width:200px; background:#f9fafb; border:1px solid #ececec; border-radius:4px; padding:6px; font-size:9px; }
  .summary-row { display:flex; justify-content:space-between; padding:2px 0; color:#111827; }
  .summary-row.small { font-size:8px; color:rgba(0,0,0,0.7); }
  .balance { font-weight:700; color:#7b2540; font-size:12px; margin-top:4px; }

  /* Notes */
  .notes { margin-top:6px; background:#f9fafb; padding:6px; border-radius:3px; border:1px solid #ececec; font-size:9px; }

  /* Utility classes */
  .kv { font-size:8px; color:rgba(0,0,0,0.65); }
  .small { font-size:8px; color:rgba(0,0,0,0.65); }

  /* Print page size and margins */
  @media print {
    @page { size: ${pageSize} portrait; margin:6mm; }
    body { margin: 0;padding: 0; }
    .invoice-card { box-shadow:none !important; }
  }
`;

    // Clone the invoice HTML and inject styles so html2pdf captures it correctly
    const invoiceClone = componentRef.current.cloneNode(true) as HTMLElement;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
    <html>
      <head>
        ${styles}
        <style>${compactCss}</style>
      </head>
      <body>
        ${invoiceClone.outerHTML}
      </body>
    </html>
  `;

    html2pdf()
      .set({
        margin: 10,
        filename: invoice
          ? `Invoice-${invoice.invoiceNumber}.pdf`
          : "invoice.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: {
          unit: "mm",
          format: pageSize.toLowerCase(),
          orientation: "portrait",
        },
      })
      .from(wrapper)
      .save();
  };

  if (!invoiceId) return <div className="p-6">Please select an invoice.</div>;
  if (!invoice) return <div className="p-6">Loading invoice...</div>;

  // <-- If editing, show InvoiceForm in edit mode
  if (editing) {
    return (
      <div className="p-6">
        <button
          className="mb-4 px-3 py-2 rounded-md border border-neutral-200 dark:border-neutral-700 text-sm shadow-sm hover:shadow-md transition"
          onClick={() => setEditing(false)}
        >
          Cancel Edit
        </button>
        <InvoiceForm
          initialInvoice={invoice}
          onCreated={(updatedInvoice: Invoice) => {
            setInvoice(updatedInvoice); // update view after save
            setEditing(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 font-inter text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900 transition-colors duration-300">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onBack?.()}
            className="px-3 py-2 rounded-md border border-neutral-200 dark:border-neutral-700 text-sm shadow-sm hover:shadow-md transition"
          >
            Back to Dashboard
          </button>
        </div>
        <div className="flex items-center gap-2">
          
         
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 rounded-md border border-neutral-200 dark:border-neutral-700 text-sm shadow-sm hover:shadow-md transition"
          >
            Edit
          </button>

          <button
            onClick={() => handlePrint("A4")}
            className="px-4 py-2 rounded-md border border-neutral-200 dark:border-neutral-700 text-sm shadow-sm hover:shadow-md transition"
          >
            Print A4
          </button>
          <button
            onClick={() => handlePrint("A5")}
            className="px-4 py-2 rounded-md border border-neutral-200 dark:border-neutral-700 text-sm shadow-sm hover:shadow-md transition"
          >
            Print A5
          </button>

          <button
            onClick={() => handleDownloadPDF("A4")}
            className="px-4 py-2 rounded-md bg-primary text-white font-semibold shadow hover:opacity-95 transition"
          >
            Download PDF A4
          </button>
          <button
            onClick={() => handleDownloadPDF("A5")}
            className="px-4 py-2 rounded-md bg-primary text-white font-semibold shadow hover:opacity-95 transition"
          >
            Download PDF A5
          </button>
        </div>
      </div>

      {/* Invoice container */}
      <div
        ref={componentRef}
        className="bg-white dark:bg-neutral-800 rounded-lg shadow-md p-8 border border-neutral-100 dark:border-neutral-700"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-6">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt="Company logo"
                className="h-24 w-auto object-contain"
              />
            ) : (
              <div className="h-16 w-16 rounded-md bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-sm font-semibold">
                {company?.name ? String(company.name).charAt(0) : "C"}
              </div>
            )}
            <div className="leading-tight">
              <div className="text-xl font-semibold">{company?.name}</div>
              {company?.address && (
                <div className="text-sm opacity-80">{company.address}</div>
              )}
              {company?.contact && (
                <div className="text-sm opacity-80">{company.contact}</div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-extrabold tracking-tight">
              {invoice.type === "QUOTE" ? "QUOTATION" : "INVOICE"}
            </div>
            <div className="mt-2 bg-neutral-50 dark:bg-neutral-700 p-3 rounded-md inline-block text-sm">
              <div className="font-medium">{invoice.invoiceNumber}</div>
              <div className="text-xs opacity-80">Date: {invoice.date}</div>
              <div className="text-xs opacity-80">
                Due Date: {invoice.dueDate}
              </div>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-6">
          <div className="bg-neutral-50 dark:bg-neutral-700 p-4 rounded-lg border border-neutral-100 dark:border-neutral-600">
            <div className="text-sm text-neutral-500 mb-2">Bill To</div>
            <div className="font-semibold">{invoice.customer?.name}</div>
            {invoice.customer?.company && (
              <div className="text-sm opacity-80">
                {invoice.customer.company}
              </div>
            )}
            {invoice.customer?.email && (
              <div className="text-sm opacity-80">{invoice.customer.email}</div>
            )}
            {invoice.customer?.phone && (
              <div className="text-sm opacity-80">{invoice.customer.phone}</div>
            )}
            {invoice.customer?.address && (
              <div className="text-sm opacity-80">
                {invoice.customer.address}
              </div>
            )}
            {invoice.customer?.panNumber && (
              <div className="text-sm opacity-80">
                PAN:{invoice.customer.panNumber}
              </div>
            )}
            {invoice.customer?.gstNumber && (
              <div className="text-sm opacity-80">
                GSTIN:{invoice.customer.gstNumber}
              </div>
            )}
          </div>
        </div>

        {/* Items table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="bg-primary text-white">
                <th className="p-3 text-left">Description</th>
                <th className="p-3 text-center w-20">HSN</th>
                <th className="p-3 text-center w-24">Qty</th>
                <th className="p-3 text-right w-36">Price</th>
                <th className="p-3 text-right w-36">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-700">
              {invoice.items?.map((it: InvoiceItem, i: number) => (
                <tr key={i} className="align-top">
                  <td className="p-4">{it.description}</td>
                  <td className="p-4 text-center">{it.hsn || "-"}</td>
                  <td className="p-4 text-center">{it.quantity}</td>
                  <td className="p-4 text-right">
                    {invoice.currency} {Number(it.price).toFixed(2)}
                  </td>
                  <td className="p-4 text-right font-medium">
                    {invoice.currency} {(it.quantity * it.price).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        {(() => {
          // compute the values defensively (strings or missing fields)
          const subtotalNum = Number(invoice.subtotal ?? 0);
          const discountNum = Number(invoice.totalDiscount ?? 0);
          const taxNum = Number(invoice.totalGST ?? 0);
          const advanceNum = Number(invoice.advancePaid ?? 0);

          // If your backend returns totalGST as a percent (e.g. 18), change this to:
          // const taxAmount = subtotalNum * (taxNum / 100);
          // But default here treats totalGST as absolute amount (same as your existing UI).
          const taxAmount = taxNum;

          const computedTotal = Math.max(
            0,
            subtotalNum - discountNum + taxAmount
          );
          const computedBalanceDue = Math.max(
            0,
            Number((computedTotal - advanceNum).toFixed(2))
          );

          return (
            <div className="flex justify-end mt-6">
              <div className="w-full md:w-1/3 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-700 border border-neutral-100 dark:border-neutral-600">
                <div className="flex justify-between py-1 text-sm">
                  <span>Subtotal</span>
                  <span>
                    {invoice.currency} {subtotalNum.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span>Tax</span>
                  <span>
                    {invoice.currency} {taxAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span>Discount</span>
                  <span>
                    - {invoice.currency} {discountNum.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span>Advance</span>
                  <span>
                    - {invoice.currency} {advanceNum.toFixed(2)}
                  </span>
                </div>
                <hr className="my-3 border-neutral-200 dark:border-neutral-600" />
                <div className="flex justify-between font-bold text-lg text-primary">
                  <span>Balance Due</span>
                  <span>
                    {invoice.currency} {computedBalanceDue.toFixed(2)}
                  </span>
                </div>

                {/* optional: show server total (kept as-is) */}
                {/* <div className="text-xs text-gray-500 mt-2">Server total: {invoice.total}</div> */}
              </div>
            </div>
          );
        })()}

        {/* Notes */}
        {(invoice.note || company.defaultNote) && (
          <div className="mt-6 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-700 border border-neutral-100 dark:border-neutral-600">
            <div className="text-sm font-medium mb-2">Notes</div>
            <div className="text-sm opacity-90">
              {invoice.note || company.defaultNote}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
