// components/PaymentsTable.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { authFetch } from "../lib/api";
import type { Invoicepay } from "@/src/types/invoice";

type Payment = {
  id: number;
  amount: number;
  method: string;
  date: string;
  note?: string;
  reference?: string;
  invoice: Invoicepay & {
    invoiceNumber: string;
    subtotal: number;
    totalDiscount: number;
    totalGST: number;
    advancePaid: number;
    total: number;
    status: string;
  };
};

export default function PaymentsTable() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    async function fetchPayments() {
      setLoading(true);
      try {
        const data = (await authFetch("/api/payments")) as Payment[];
        setPayments(data);
      } catch (err) {
        setError("Failed to fetch payments: " + String(err));
      } finally {
        setLoading(false);
      }
    }
    fetchPayments();
  }, []);

  // reset query when input is cleared; reset to first page when search input changes
  useEffect(() => {
    if (searchInput.trim() === "") {
      setSearchQuery("");
    }
    setCurrentPage(1);
  }, [searchInput]);

  const filteredPayments = useMemo(() => {
    if (searchQuery.trim() === "") return payments;
    return payments.filter((p) =>
      p.invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [payments, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedPayments = filteredPayments.slice(startIndex, startIndex + itemsPerPage);

  if (loading) return <div className="text-center py-4">Loading payments...</div>;
  if (error) return <div className="text-red-600 text-center py-4">{error}</div>;
  if (payments.length === 0) return <div className="text-center py-4">No payments found</div>;

  const formatAmount = (value: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);

  const handleSearch = () => {
    setSearchQuery(searchInput.trim());
    setCurrentPage(1);
  };

  const handleClear = () => {
    setSearchInput("");
    setSearchQuery("");
    setCurrentPage(1);
  };  

    function formatDateToDMY(dateInput?: string | Date): string {
  if (!dateInput) return "";
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return "";
  // en-GB gives dd/mm/yyyy
  return d.toLocaleDateString("en-GB");
}

  return (
    <div className="overflow-x-auto p-3 bg-white shadow-md rounded-lg">
      {/* Header + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
        <h3 className="font-semibold text-base sm:text-lg">Receipt List</h3>
        <div className="flex gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search by Invoice #"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm flex-grow focus:outline-none"
            style={{ transition: "all 0.2s ease" }}
            onFocus={(e) => {
              (e.target as HTMLInputElement).style.borderColor = "rgb(128, 41, 73)";
              (e.target as HTMLInputElement).style.boxShadow = "0 0 0 3px rgba(128, 41, 73, 0.18)";
            }}
            onBlur={(e) => {
              (e.target as HTMLInputElement).style.borderColor = "#d1d5db";
              (e.target as HTMLInputElement).style.boxShadow = "none";
            }}
          />
          <button
            onClick={handleSearch}
            className="px-4 py-1.5 text-white rounded-md text-sm font-medium hover:opacity-90 transition"
            style={{ backgroundColor: "rgb(128, 41, 73)" }}
          >
            Search
          </button>
          <button
            onClick={handleClear}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50 transition"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-indigo-50 text-gray-700">
          <tr>
            {[
              "Invoice #",
              "Date",
              "Method",
              "Amount",
              "Subtotal",
              "Discount",
              "Tax",
              "Total",
              "Advance",
              "Remaining",
              "Status",
             
            ].map((header) => (
              <th
                key={header}
                className="px-2 py-2 text-left font-medium uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {displayedPayments.length === 0 ? (
            <tr>
              <td colSpan={13} className="text-center py-3 text-gray-500">
                No results found
              </td>
            </tr>
          ) : (
            displayedPayments.map((p) => {
              const subtotalNum = Number(p.invoice?.subtotal ?? 0);
              const discountNum = Number(p.invoice?.totalDiscount ?? 0);
              const taxable = subtotalNum - discountNum;
              const taxAmount = Number(p.invoice?.totalGST ?? 0);
              const total = taxable + taxAmount;
              const advancePaid = Number(p.invoice?.advancePaid ?? 0);
              const remaining = Math.max(0, total - advancePaid);

              return (
                <tr key={p.id} className="hover:bg-indigo-50 transition-colors">
                  <td className="px-2 py-1 text-gray-800">{p.invoice.invoiceNumber}</td>
                  <td className="px-2 py-1 text-gray-700">
                     {formatDateToDMY(p.date)}
                  </td>
                  <td className="px-2 py-1">{p.method}</td>
                  <td className="px-2 py-1 font-medium">{formatAmount(p.amount)}</td>
                  <td className="px-2 py-1">{formatAmount(subtotalNum)}</td>
                  <td className="px-2 py-1">{formatAmount(discountNum)}</td>
                  <td className="px-2 py-1">{formatAmount(taxAmount)}</td>
                  <td className="px-2 py-1 font-semibold">{formatAmount(total)}</td>
                  <td className="px-2 py-1">{formatAmount(advancePaid)}</td>
                  <td className="px-2 py-1">{formatAmount(remaining)}</td>
                  <td className="px-2 py-1">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.invoice.status === "PAID"
                          ? "bg-green-100 text-green-800"
                          : p.invoice.status === "PARTIAL"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {p.invoice.status}
                    </span>
                  </td>
                  
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Page numbers only */}
      {filteredPayments.length > itemsPerPage && (
        <div className="flex justify-center items-center gap-2 mt-4">
          {[...Array(totalPages)].map((_, idx) => {
            const pageNum = idx + 1;
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`px-3 py-1 rounded border text-sm ${
                  currentPage === pageNum
                    ? "bg-[rgb(128,41,73)] text-white border-[rgb(128,41,73)]"
                    : "border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
