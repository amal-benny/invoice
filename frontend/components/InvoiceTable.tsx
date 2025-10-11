
// "use client";
// import { useEffect, useState } from "react";
// import { authFetch } from "../lib/api";
// import { Eye, Edit, Trash } from "lucide-react";
// import PaymentModal from "../components/PaymentModal";

// export default function InvoiceTable({
//   invoices,
//   onConvert,
//   onView,
//   onEdit,
//   onDelete,
//   onPaymentSuccess, // optional callback when payment saved
// }: {
//   invoices: any[];
//   onConvert?: (id: number) => void;
//   onView?: (id: number) => void;
//   onEdit?: (id: number) => void;
//   onDelete?: (id: number) => void;
//   onPaymentSuccess?: (updatedInvoice: any) => void;
// }) {
//   // Keep a local copy to allow optimistic updates if parent doesn't pass onPaymentSuccess
//   const [localInvoices, setLocalInvoices] = useState<any[]>(invoices || []);
//   const [payInvoice, setPayInvoice] = useState<any | null>(null);

//   useEffect(() => {
//     setLocalInvoices(invoices || []);
//   }, [invoices]);

//   async function convertToInvoice(id: number) {
//     try {
//       await authFetch(`/api/invoices/${id}/convert`, { method: "POST" });
//       if (onConvert) onConvert(id);
//     } catch (err) {
//       alert("Failed to convert quotation.");
//     }
//   }

//   // derive paid amount: prefer advancePaid, fallback to sum of payments array
//   function paidAmount(inv: any) {
//     const adv = Number(inv?.advancePaid ?? NaN);
//     if (!Number.isNaN(adv)) return adv;
//     if (Array.isArray(inv?.payments)) {
//       return inv.payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
//     }
//     return 0;
//   }

//   function computeStatus(inv: any) {
//     // keep OVERDUE if present from server
//     if (inv?.status === "OVERDUE") return "OVERDUE";

//     const total = Number(inv?.total || 0);
//     const paid = paidAmount(inv);

//     if (total <= 0) return "PAID";
//     if (paid <= 0) return "PENDING";
//     if (paid >= total) return "PAID";
//     return "PARTIAL";
//   }

//   function typeColor(type: "QUOTE" | "INVOICE") {
//     return type === "QUOTE" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800";
//   }

//   function statusColor(status: string) {
//     switch (status) {
//       case "PAID":
//         return "bg-green-100 text-green-800";
//       case "PARTIAL":
//         return "bg-yellow-100 text-yellow-800";
//       case "OVERDUE":
//         return "bg-red-100 text-red-800";
//       case "PENDING":
//       default:
//         return "bg-gray-100 text-gray-800";
//     }
//   }

//   // Called when payment modal returns updated invoice
//   function handlePaymentSuccess(updatedInvoice: any) {
//     // First, notify parent if provided
//     if (onPaymentSuccess) {
//       try {
//         onPaymentSuccess(updatedInvoice);
//       } catch (e) {
//         // ignore parent failures
//       }
//     }

//     // Also update local copy so table reflects immediately
//     setLocalInvoices((prev) => prev.map((inv) => (inv.id === updatedInvoice.id ? updatedInvoice : inv)));
//   }

//   return (
//     <>
//       <div className="card mt-6">
//         <h3 className="text-lg font-semibold mb-3">Invoices / Quotations</h3>
//         <div className="overflow-x-auto">
//           <table className="w-full table-auto border border-gray-200">
//             <thead>
//               <tr className="bg-gray-50 text-left">
//                 <th className="px-3 py-2 border-b">#</th>
//                 <th className="px-3 py-2 border-b">Number</th>
//                 <th className="px-3 py-2 border-b">Type</th>
//                 <th className="px-3 py-2 border-b">Customer</th>
//                 <th className="px-3 py-2 border-b">Date</th>
//                 <th className="px-3 py-2 border-b">Total</th>
//                 <th className="px-3 py-2 border-b">Status</th>
//                 <th className="px-3 py-2 border-b">Action</th>
//               </tr>
//             </thead>
//             <tbody>
//               {localInvoices.length === 0 ? (
//                 <tr>
//                   <td colSpan={8} className="text-center py-4">
//                     No invoices yet.
//                   </td>
//                 </tr>
//               ) : (
//                 localInvoices.map((inv, idx) => {
//                   const status = computeStatus(inv);
//                   const paid = paidAmount(inv);
//                   return (
//                     <tr key={inv.id} className="hover:bg-gray-50">
//                       <td className="px-3 py-2 border-b">{idx + 1}</td>
//                       <td className="px-3 py-2 border-b">{inv.invoiceNumber || "-"}</td>
//                       <td className="px-3 py-2 border-b">
//                         <span className={`px-3 py-1 font-semibold text-center ${typeColor(inv.type)} rounded-full inline-block`}>
//                           {inv.type}
//                         </span>
//                       </td>
//                       <td className="px-3 py-2 border-b">{inv.customer?.name || "-"}</td>
//                       <td className="px-3 py-2 border-b">
//                         {inv.date ? new Date(inv.date).toLocaleDateString() : "-"}
//                       </td>
//                       <td className="px-3 py-2 border-b">
//                         {inv.currency} {Number(inv.total || 0).toFixed(2)}
//                       </td>
//                       <td className="px-3 py-2 border-b">
//                         <div className="flex items-center gap-2">
//                           <span className={`px-3 py-1 font-semibold text-center ${statusColor(status)} rounded-full inline-block`}>
//                             {status}
//                           </span>
//                           <div className="text-sm kv">({inv.currency} {paid.toFixed(2)} paid)</div>
//                         </div>
//                       </td>
//                       <td className="px-3 py-2 border-b flex gap-2 items-center">
//                         {inv.type === "QUOTE" ? (
//                           <button className="px-3 py-2 text-white rounded" style={{ backgroundColor: "rgb(128, 41, 73)" }} onClick={() => convertToInvoice(inv.id)}>
//                             Convert
//                           </button>
//                         ) : (
//                           <button className="px-2 py-1 bg-green-500 text-white rounded" onClick={() => setPayInvoice(inv)}>
//                             Pay
//                           </button>
//                         )}

//                         <button className="p-1 bg-gray-200 hover:bg-gray-300 rounded" onClick={() => onView?.(inv.id)} title="View">
//                           <Eye size={20} />
//                         </button>
//                         <button className="p-1 bg-yellow-200 hover:bg-yellow-300 rounded" onClick={() => onEdit?.(inv.id)} title="Edit">
//                           <Edit size={20} />
//                         </button>
//                         <button className="p-1 bg-red-200 hover:bg-red-300 rounded" onClick={() => onDelete?.(inv.id)} title="Delete">
//                           <Trash size={20} />
//                         </button>
//                       </td>
//                     </tr>
//                   );
//                 })
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Payment modal */}
//       {payInvoice && (
//         <PaymentModal
//           invoice={payInvoice}
//           onClose={() => setPayInvoice(null)}
//           onSuccess={(updatedInvoice: any) => {
//             setPayInvoice(null);
//             handlePaymentSuccess(updatedInvoice);
//           }}
//         />
//       )}
//     </>
//   );
// }



"use client";
import { useEffect, useState } from "react";
import { authFetch } from "../lib/api";
import { Eye, Edit, Trash } from "lucide-react";
import PaymentModal from "../components/PaymentModal";

export default function InvoiceTable({
  invoices,
  onConvert,
  onView,
  onEdit,
  onDelete,
  onPaymentSuccess,
}: {
  invoices: any[];
  onConvert?: (id: number) => void;
  onView?: (id: number) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onPaymentSuccess?: (updatedInvoice: any) => void;
}) {
  const [localInvoices, setLocalInvoices] = useState<any[]>(invoices || []);
  const [payInvoice, setPayInvoice] = useState<any | null>(null);
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [searchText, setSearchText] = useState("");

  // Load deleted IDs from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("deletedInvoices");
    if (saved) setDeletedIds(JSON.parse(saved));
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
      alert("Failed to convert quotation.");
    }
  }

  function paidAmount(inv: any) {
    const adv = Number(inv?.advancePaid ?? NaN);
    if (!Number.isNaN(adv)) return adv;
    if (Array.isArray(inv?.payments)) {
      return inv.payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    }
    return 0;
  }

  function computeStatus(inv: any) {
    if (inv?.status === "OVERDUE") return "OVERDUE";
    const total = Number(inv?.total || 0);
    const paid = paidAmount(inv);

    if (total <= 0) return "PAID";
    if (paid <= 0) return "PENDING";
    if (paid >= total) return "PAID";
    return "PARTIAL";
  }

  function typeColor(type: "QUOTE" | "INVOICE") {
    return type === "QUOTE" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800";
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

  function handlePaymentSuccess(updatedInvoice: any) {
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
    setDeletedIds((prev) => {
      const updated = [...prev, id];
      localStorage.setItem("deletedInvoices", JSON.stringify(updated));
      return updated;
    });
  };

  // Filter invoices based on searchText
  const filteredInvoices = localInvoices.filter((inv) => {
    const text = searchText.toLowerCase();
    const dateStr = inv.date ? new Date(inv.date).toLocaleDateString() : "";
    return (
      inv.invoiceNumber?.toLowerCase().includes(text) ||
      inv.customer?.name?.toLowerCase().includes(text) ||
      dateStr.includes(text)
    );
  });

  return (
    <>
      <div className="card mt-6">
        <h3 className="text-lg font-semibold mb-3">Invoices / Quotations</h3>

        {/* Search field */}
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
      className="border border-gray-300 rounded-full px-10 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
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
                  const isDeleted = deletedIds.includes(inv.id);

                  return (
                    <tr
                      key={inv.id}
                      className={`hover:bg-gray-50 ${isDeleted ? "opacity-50" : ""}`}
                    >
                      <td className="px-3 py-2 border-b">{idx + 1}</td>
                      <td className="px-3 py-2 border-b">{inv.invoiceNumber || "-"}</td>
                      <td className="px-3 py-2 border-b">
                        <span
                          className={`px-3 py-1 font-semibold text-center ${typeColor(
                            inv.type
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
                            Deleted
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
                            <button
                              className="p-2 bg-red-200 hover:bg-red-300 rounded"
                              onClick={() => handleDelete(inv.id)}
                              title="Delete"
                            >
                              <Trash size={20} />
                            </button>
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
          invoice={payInvoice}
          onClose={() => setPayInvoice(null)}
          onSuccess={(updatedInvoice: any) => {
            setPayInvoice(null);
            handlePaymentSuccess(updatedInvoice);
          }}
        />
      )}
    </>
  );
}
