"use client";
import React, { useEffect, useState } from "react";
import { authFetch } from "../lib/api";
import { Edit, Trash } from "lucide-react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Define types
export type Payment = {
  id: number;
  amount: number;
};

export type Invoice = {
  id: number;
  subtotal?: number;
  totalGST?: number;
  totalDiscount?: number;
  advancePaid?: number;
  payments?: Payment[];
};

export type Customer = {
  id: number;
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  panNumber?: string;
  gstNumber?: string;
  stateName?: string;
  stateCode?: string;
  invoices?: Invoice[];
};

type CustomerForm = Omit<Customer, "id" | "invoices">;

type FormErrors = Partial<Record<keyof CustomerForm, string>>;
type Touched = Partial<Record<keyof CustomerForm, boolean>>;

export default function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(""); // ✅ search state

  // form state (shared for create & edit)
  const [form, setForm] = useState<CustomerForm>({
    name: "",
    company: "",
    email: "",
    phone: "",
    address: "",
    panNumber: "",
    gstNumber: "",
    stateName: "",
    stateCode: "",
  });

  const [editing, setEditing] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // validation-related state
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Touched>({});

  // local deleted ids (UI-only delete)
  const [deletedIds, setDeletedIds] = useState<number[]>([]);

  // NEW: modal state for confirmation
  const [pendingDelete, setPendingDelete] = useState<{
    id: number | null;
    name?: string;
  }>({ id: null, name: undefined });

  async function load() {
    setLoading(true);
    try {
      // include invoices & payments so we can calculate paid/balance
      const data = (await authFetch("/api/customers")) as Customer[];
      setCustomers(data || []);
    } catch (err) {
      toast.error("Failed to load customers: " + String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // load customers
    load();

    // load deleted ids from localStorage
    try {
      const saved = localStorage.getItem("local_deleted_customers");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setDeletedIds(parsed.map((v) => Number(v)).filter((n) => !Number.isNaN(n)));
      }
    } catch (e) {
      // ignore parse errors
      console.error("Failed to read local deleted customers", e);
    }
  }, []);

  function resetForm() {
    setForm({
      name: "",
      company: "",
      email: "",
      phone: "",
      address: "",
      panNumber: "",
      gstNumber: "",
      stateName: "",
      stateCode: "",
    });
    setEditing(null);
    setErrors({});
    setTouched({});
  }

  function startEdit(cust: Customer) {
    setForm({
      name: cust.name || "",
      company: cust.company || "",
      email: cust.email || "",
      phone: cust.phone || "",
      address: cust.address || "",
      panNumber: cust.panNumber || "",
      gstNumber: cust.gstNumber || "",
      stateName: cust.stateName || "",
      stateCode: cust.stateCode || "",
    });
    setEditing(cust.id ?? null);
    setErrors({});
    setTouched({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ---------- Validation logic ----------
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\d{10}$/;
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/i; // PAN typical pattern
  const stateCodeRegex = /^\d{1,2}$/; // typically 1-2 digit codes (adjust as needed)

  function validateField<K extends keyof CustomerForm>(key: K, value: CustomerForm[K]): string | undefined {
    const v = (value ?? "").toString().trim();

    switch (key) {
      case "name":
        if (!v) return "Name is required.";
        if (v.length < 2) return "Name must be at least 2 characters.";
        return undefined;

      case "email":
        if (!v) return undefined; // email optional
        if (!emailRegex.test(v)) return "Enter a valid email address.";
        return undefined;

      case "phone":
        if (!v) return undefined; // phone optional
        if (!phoneRegex.test(v)) return "Phone must be 10 digits.";
        return undefined;

      case "panNumber":
        if (!v) return undefined; // optional
        if (!panRegex.test(v)) return "PAN format seems invalid (e.g. AAAAA9999A).";
        return undefined;

      case "stateCode":
        if (!v) return undefined; // optional
        if (!stateCodeRegex.test(v)) return "State code should be 1 or 2 digits.";
        return undefined;

      case "address":
        if (!v) return undefined; // optional
        if (v.length < 5) return "Address is too short.";
        return undefined;

      // company, stateName => optional, no strict checks
      case "company":
      case "stateName":
      default:
        return undefined;
    }
  }

  function validateAll(currentForm: CustomerForm): FormErrors {
    const newErrors: FormErrors = {};
    // required fields: name
    (Object.keys(currentForm) as (keyof CustomerForm)[]).forEach((k) => {
      const err = validateField(k, currentForm[k]);
      if (err) newErrors[k] = err;
    });

    // enforce name required specifically
    if (!currentForm.name || String(currentForm.name).trim() === "") {
      newErrors.name = "Name is required.";
    }

    return newErrors;
  }

  function handleChange<K extends keyof CustomerForm>(key: K, value: CustomerForm[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // validate on change if field already touched
      if (touched[key]) {
        setErrors((prevErr) => {
          const copy = { ...prevErr };
          const err = validateField(key, value);
          if (err) copy[key] = err; else delete copy[key];
          return copy;
        });
      }
      return next;
    });
  }

  function handleBlur<K extends keyof CustomerForm>(key: K) {
    setTouched((t) => ({ ...t, [key]: true }));
    const err = validateField(key, form[key]);
    setErrors((prev) => {
      const copy = { ...prev };
      if (err) copy[key] = err; else delete copy[key];
      return copy;
    });
  }

  // ---------- Submit ----------
  async function createOrUpdateCustomer(e: React.FormEvent) {
    e.preventDefault();

    // Validate all
    const newErrors = validateAll(form);
    setErrors(newErrors);
    // mark all touched so errors show
    setTouched({
      name: true,
      company: true,
      email: true,
      phone: true,
      address: true,
      panNumber: true,
      gstNumber: true,
      stateName: true,
      stateCode: true,
    });

    if (Object.keys(newErrors).length > 0) {
      // do not submit
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSaving(true);
    try {
      if (editing !== null) {
        await authFetch(`/api/customers/${editing}`, {
          method: "PUT",
          body: JSON.stringify(form),
          headers: { "Content-Type": "application/json" },
        });
        toast.success("Customer updated successfully!");
      } else {
        await authFetch("/api/customers", {
          method: "POST",
          body: JSON.stringify(form),
          headers: { "Content-Type": "application/json" },
        });
        toast.success("Customer created successfully!");
      }
      resetForm();
      load();
    } catch (err) {
      // replaced alert with toast
      toast.error("Save failed: " + String(err));
    } finally {
      setSaving(false);
    }
  }

  // helper that actually performs the local-only delete (same behavior as before)
  function performLocalDelete(id: number) {
    setDeletedIds((prev) => {
      const updated = Array.from(new Set([...prev, id]));
      try {
        localStorage.setItem("local_deleted_customers", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to persist local deleted customers", e);
      }
      return updated;
    });

    toast.info("Customer marked as deleted");
  }

  // OPEN the confirmation modal (replaces confirm(...))
  function openDeleteModal(id: number, name?: string) {
    setPendingDelete({ id, name });
  }

  // Called when modal user clicks OK
  function confirmDeleteFromModal() {
    if (pendingDelete.id != null) {
      performLocalDelete(pendingDelete.id);
    }
    setPendingDelete({ id: null, name: undefined });
  }

  // Called when modal user clicks Cancel / closes modal
  function cancelDeleteModal() {
    setPendingDelete({ id: null, name: undefined });
  }

  // Backwards-compatible handler (used in UI buttons) — now opens modal
  function handleDelete(id: number, name?: string) {
    // previously used confirm(); now open modal instead
    openDeleteModal(id, name);
  }

  // Calculate totals for a customer
  function computeCustomerAmounts(customer: Customer) {
    const invs = Array.isArray(customer?.invoices) ? customer.invoices : [];
    let totalDue = 0;
    let totalPaid = 0;

    for (const inv of invs) {
      const subtotal = Number(inv?.subtotal || 0);
      const gst = Number(inv?.totalGST || 0);
      const discount = Number(inv?.totalDiscount || 0);

      const invoiceAmount = subtotal - discount + gst;
      totalDue += invoiceAmount;

      const advance = Number(inv?.advancePaid || 0);
      const paymentsSum = Array.isArray(inv?.payments)
        ? inv.payments.reduce((s, p) => s + Number(p?.amount || 0), 0)
        : 0;

      totalPaid += advance + paymentsSum;
    }

    totalDue = Math.round(totalDue * 100) / 100;
    totalPaid = Math.round(totalPaid * 100) / 100;
    const balance = Math.max(totalDue - totalPaid, 0);

    return { totalDue, totalPaid, balance };
  }

  // filter customers by search (name or company)
  const filteredCustomers = customers.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const name = String(c.name || "").toLowerCase();
    const company = String(c.company || "").toLowerCase();
    return name.includes(q) || company.includes(q);
  });

  // helper to show error message under input
  function FieldError({ name }: { name: keyof CustomerForm }) {
    if (!touched[name]) return null;
    const msg = errors[name];
    if (!msg) return null;
    return <div className="text-sm text-red-600 mt-1">{msg}</div>;
  }

  const isFormInvalid = Object.keys(errors).length > 0;

  return (
    <div>
      {/* Create/Edit Form */}
      <div className="card mb-4">
        <h3 className="font-semibold mb-3">{editing !== null ? "Edit Customer" : "Create Customer"}</h3>
        <form onSubmit={createOrUpdateCustomer} className="grid grid-cols-2 gap-2">
          <div>
            <input
              className={`input ${errors.name && touched.name ? "border-red-400" : ""}`}
              placeholder="Name"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              onBlur={() => handleBlur("name")}
              required
              aria-invalid={!!errors.name}
            />
            <FieldError name="name" />
          </div>

          <div>
            <input
              className={`input ${errors.company && touched.company ? "border-red-400" : ""}`}
              placeholder="Company"
              value={form.company}
              onChange={(e) => handleChange("company", e.target.value)}
              onBlur={() => handleBlur("company")}
              required
            />
            <FieldError name="company" />
          </div>

          <div>
            <input
              className={`input ${errors.email && touched.email ? "border-red-400" : ""}`}
              placeholder="Email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              onBlur={() => handleBlur("email")}
              required
            />
            <FieldError name="email" />
          </div>

          <div>
            <input
              className={`input ${errors.phone && touched.phone ? "border-red-400" : ""}`}
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              onBlur={() => handleBlur("phone")}
              required
            />
            <FieldError name="phone" />
          </div>

          <div>
            <input
              className={`input ${errors.panNumber && touched.panNumber ? "border-red-400" : ""}`}
              placeholder="PAN Number"
              value={form.panNumber}
              onChange={(e) => handleChange("panNumber", e.target.value.toUpperCase())}
              onBlur={() => handleBlur("panNumber")}
              required
            />
            <FieldError name="panNumber" />
          </div>

          <div>
            <input
              className={`input ${errors.gstNumber && touched.gstNumber ? "border-red-400" : ""}`}
              placeholder="GSTIN"
              value={form.gstNumber}
              onChange={(e) => handleChange("gstNumber", e.target.value.toUpperCase())}
              onBlur={() => handleBlur("gstNumber")}
            />
            <FieldError name="gstNumber" />
          </div>

          <div>
            <input
              className={`input ${errors.stateName && touched.stateName ? "border-red-400" : ""}`}
              placeholder="State Name"
              value={form.stateName}
              onChange={(e) => handleChange("stateName", e.target.value)}
              onBlur={() => handleBlur("stateName")}
              required
            />
            <FieldError name="stateName" />
          </div>

          <div>
            <input
              className={`input ${errors.stateCode && touched.stateCode ? "border-red-400" : ""}`}
              placeholder="State Code"
              value={form.stateCode}
              onChange={(e) => handleChange("stateCode", e.target.value)}
              onBlur={() => handleBlur("stateCode")}
              required
            />
            <FieldError name="stateCode" />
          </div>

          <div className="col-span-2">
            <input
              className={`input col-span-2 ${errors.address && touched.address ? "border-red-400" : ""}`}
              placeholder="Address"
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
              onBlur={() => handleBlur("address")}
              required
            />
            <FieldError name="address" />
          </div>

          <div />
          <div className="flex gap-2 justify-end">
            {editing !== null && (
              <button type="button" className="px-3 py-2 rounded-md border" onClick={resetForm}>Cancel</button>
            )}
            <button className="btn" disabled={saving || isFormInvalid}>
              {saving ? "Saving..." : (editing !== null ? "Update Customer" : "Create Customer")}
            </button>
          </div>
        </form>
      </div>

      {/* Search Input */}
      <div className="flex justify-end mb-3 relative w-64 ml-auto">
        <input
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input rounded-full border px-4 py-2 pr-10 text-sm shadow-sm focus:outline-none focus:ring-2 placeholder:text-gray-400"
          style={{ borderColor: "rgb(128,41,73)" }}
        />
        <svg
          className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
        </svg>
      </div>

      {/* Customer List */}
      <div className="card">
        <h3 className="font-semibold mb-2">Customers</h3>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="space-y-2">
            {filteredCustomers.length === 0 && <div className="text-sm text-gray-500">No customers found.</div>}
            {filteredCustomers.map((c) => {
              const { totalPaid, balance } = computeCustomerAmounts(c);
              const isDeleted = deletedIds.includes(c.id);

              return (
                <div
                  key={c.id}
                  className="p-3 border rounded-md flex justify-between items-start shadow-sm hover:shadow-md transition"
                  style={{
                    backgroundColor: isDeleted ? "#fff5f6" : "white", // light red for deleted
                    opacity: isDeleted ? 0.8 : 1,
                    textDecoration: isDeleted ? "line-through" : "none",
                  }}
                >
                  <div className="flex-1 pr-4">
                    <div className="font-semibold">
                      {c.name} <span className="kv">({c.company || "—"})</span>
                    </div>
                    <div className="kv">{c.email || "—"} • {c.phone || "—"}</div>
                    <div className="kv mt-1">
                      {c.stateName && <>State: {c.stateName} ({c.stateCode}) • </>}
                      {c.panNumber ? <>PAN: {c.panNumber} • </> : null}
                      {c.gstNumber ? <>GSTIN: {c.gstNumber}</> : null}
                    </div>
                    {c.address && <div className="text-sm mt-1">{c.address}</div>}
                  </div>

                  {/* Right side: Paid & Balance + Actions */}
                  <div className="flex flex-col items-end gap-3">
                    <div className="text-sm text-right">
                      <div className="mb-1">
                        <span className="text-xs kv">Paid</span>
                        <div className="font-semibold text-green-700">
                          ₹ {Number(totalPaid || 0).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs kv">Balance</span>
                        <div className={`font-semibold ${balance > 0 ? "text-red-700" : "text-gray-600"}`}>
                          ₹ {Number(balance || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {!isDeleted ? (
                        <>
                          <button title="Edit" onClick={() => startEdit(c)} className="p-2 rounded-md border-2 border-yellow-400 hover:bg-yellow-50 transition flex items-center gap-2">
                            <Edit size={16} className="text-yellow-600" /> Edit
                          </button>
                          <button title="Delete" onClick={() => handleDelete(c.id, c.name)} className="p-2 rounded-md border-2 border-red-400 hover:bg-red-50 transition flex items-center gap-2">
                            <Trash size={16} className="text-red-600" /> Delete
                          </button>
                        </>
                      ) : (
                        <span className="px-3 py-1 bg-red-200 text-red-800 rounded-full text-sm font-semibold">Deleted (read-only)</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {pendingDelete.id != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={cancelDeleteModal} />
          <div className="bg-white rounded-lg shadow-lg z-10 w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-2">Confirm mark deleted</h3>
            <p className="mb-4">
              Are you sure you want to mark this customer as deleted?
              <br />
              
            </p>

            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-md border"
                onClick={cancelDeleteModal}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-md text-white"
                style={{ backgroundColor: "rgb(128,41,73)" }}
                onClick={confirmDeleteFromModal}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
