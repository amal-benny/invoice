


// "use client";
// import { useEffect, useState } from "react";
// import { authFetch } from "../lib/api";
// import { Edit, Trash } from "lucide-react";

// export default function CustomerList() {
//   const [customers, setCustomers] = useState<any[]>([]);
//   const [loading, setLoading] = useState(false);

//   // form state (shared for create & edit)
//   const [form, setForm] = useState({
//     name: "",
//     company: "",
//     email: "",
//     phone: "",
//     address: "",
//     panNumber: "",
//     gstNumber: "",
//     stateName: "",  // ✅ added
//     stateCode: "",
//   });

//   // editing: null = create mode, otherwise customer id
//   const [editing, setEditing] = useState<number | null>(null);
//   const [saving, setSaving] = useState(false);

//   async function load() {
//     setLoading(true);
//     try {
//       // Make sure backend includes invoices in the response (your backend already does)
//       const data = await authFetch("/api/customers");
//       setCustomers(data || []);
//     } catch (err) {
//       alert("Failed to load customers");
//     } finally {
//       setLoading(false);
//     }
//   }

//   useEffect(() => {
//     load();
//   }, []);

//   // prepare form for create
//   function resetForm() {
//     setForm({ name: "", company: "", email: "", phone: "", address: "", panNumber: "", gstNumber: "" ,stateName:"",stateCode:""});
//     setEditing(null);
//   }

//   // prepare form for edit
//   function startEdit(cust: any) {
//     setForm({
//       name: cust.name || "",
//       company: cust.company || "",
//       email: cust.email || "",
//       phone: cust.phone || "",
//       address: cust.address || "",
//       panNumber: cust.panNumber || "",
//       gstNumber: cust.gstNumber || "",
//       stateName: cust.stateName || "",
//       stateCode: cust.stateCode || "",
//     });
//     setEditing(cust.id);
//     window.scrollTo({ top: 0, behavior: "smooth" });
//   }

//   async function createOrUpdateCustomer(e: React.FormEvent) {
//     e.preventDefault();
//     setSaving(true);
//     try {
//       if (editing) {
//         // update
//         await authFetch(`/api/customers/${editing}`, {
//           method: "PUT",
//           body: JSON.stringify(form),
//           headers: { "Content-Type": "application/json" },
//         });
//       } else {
//         // create
//         await authFetch("/api/customers", {
//           method: "POST",
//           body: JSON.stringify(form),
//           headers: { "Content-Type": "application/json" },
//         });
//       }

//       resetForm();
//       load();
//     } catch (err: any) {
//       alert("Save failed: " + (err.message || err));
//     } finally {
//       setSaving(false);
//     }
//   }

//   async function handleDelete(id: number) {
//     if (!confirm("Delete this customer? This will remove the record permanently.")) return;
//     try {
//       await authFetch(`/api/customers/${id}`, { method: "DELETE" });
//       if (editing === id) resetForm();
//       load();
//     } catch (err: any) {
//       if (err?.message) alert("Delete failed: " + err.message);
//       else alert("Delete failed");
//     }
//   }

//   // derive payment status per-customer from invoices array (backend returns invoices)
//   function customerPaymentStatus(customer: any) {
//     const invs = Array.isArray(customer?.invoices) ? customer.invoices : [];
//     if (invs.length === 0) return "UNPAID";

//     const allPaid = invs.every((inv: any) => {
//       const total = Number(inv.total || 0);
//       const paid = Number(inv.advancePaid ?? inv.payments?.reduce?.((s: number, p: any) => s + Number(p.amount || 0), 0) ?? 0);
//       return total <= 0 || paid >= total;
//     });

//     if (allPaid) return "PAID";

//     const anyPartial = invs.some((inv: any) => {
//       const total = Number(inv.total || 0);
//       const paid = Number(inv.advancePaid ?? inv.payments?.reduce?.((s: number, p: any) => s + Number(p.amount || 0), 0) ?? 0);
//       return paid > 0 && paid < total;
//     });

//     if (anyPartial) return "PARTIAL";
//     return "UNPAID";
//   }

//   function statusColor(status: string) {
//     switch (status) {
//       case "PAID":
//         return "bg-green-100 text-green-800";
//       case "PARTIAL":
//         return "bg-yellow-100 text-yellow-800";
//       default:
//         return "bg-gray-100 text-gray-800";
//     }
//   }

//   return (
//     <div>
//       <div className="card mb-4">
//         <h3 className="font-semibold mb-3">{editing ? "Edit Customer" : "Create Customer"}</h3>
//         <form onSubmit={createOrUpdateCustomer} className="grid grid-cols-2 gap-2">
//           <input className="input" placeholder="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required/>
//           <input className="input" placeholder="Company" value={form.company} onChange={e=>setForm({...form, company:e.target.value})}/>
//           <input className="input" placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})}/>
//           <input className="input" placeholder="Phone" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})}/>
//           <input className="input" placeholder="PAN Number" value={form.panNumber} onChange={e=>setForm({...form, panNumber:e.target.value})}/>
//           <input className="input" placeholder="GSTIN" value={form.gstNumber} onChange={e=>setForm({...form, gstNumber:e.target.value})}/>
//           <input className="input" placeholder="State Name" value={form.stateName} onChange={e=>setForm({...form, stateName:e.target.value})}/>
//           <input className="input" placeholder="State Code" value={form.stateCode} onChange={e=>setForm({...form, stateCode:e.target.value})}/>
//           <input className="input col-span-2" placeholder="Address" value={form.address} onChange={e=>setForm({...form, address:e.target.value})}/>
//           <div />
//           <div className="flex gap-2 justify-end">
//             {editing && (
//               <button type="button" className="px-3 py-2 rounded-md border" onClick={resetForm}>Cancel</button>
//             )}
//             <button className="btn" disabled={saving}>{saving ? "Saving..." : (editing ? "Update Customer" : "Create Customer")}</button>
//           </div>
//         </form>
//       </div>

//       <div className="card">
//         <h3 className="font-semibold mb-2">Customers</h3>

//         {loading ? (
//           <div>Loading...</div>
//         ) : (
//           <div className="space-y-2">
//             {customers.length === 0 && <div className="text-sm text-gray-500">No customers yet.</div>}

//             {customers.map(c => {
//               const status = customerPaymentStatus(c);
//               return (
//                 <div key={c.id} className="p-3 border rounded-md flex justify-between items-start">
//                   <div>
//                     <div className="font-semibold">
//                       {c.name} <span className="kv">({c.company || "—"})</span>
//                     </div>
//                     <div className="kv">{c.email || "—"} • {c.phone || "—"}</div>
//                     <div className="kv mt-1">
//                       {c.stateName && <>State: {c.stateName} ({c.stateCode}) • </>}
//                       {c.panNumber ? <>PAN: {c.panNumber} • </> : null}
//                       {c.gstNumber ? <>GSTIN: {c.gstNumber}</> : null}
//                     </div>
                    
//                     {c.address && <div className="text-sm mt-1">{c.address}</div>}
//                   </div>

//                   <div className="flex flex-col items-end gap-2">
//                     <div className="flex items-center gap-2">
//                       <div className={`px-3 py-1 rounded-full ${statusColor(status)} font-semibold text-sm`}>
//                         {status}
//                       </div>
//                       <div className="kv">Invoices: {c.invoices?.length ?? 0}</div>
//                     </div>

//                     <div className="flex gap-2">
//                       <button title="Edit" onClick={() => startEdit(c)} className="p-2 rounded-md border-2 border-yellow-400 hover:bg-yellow-50 transition">
//                         <Edit size={16} className="text-yellow-600" />
//                       </button>

//                       <button title="Delete" onClick={() => handleDelete(c.id)} className="p-2 rounded-md border-2 border-red-400 hover:bg-red-50 transition">
//                         <Trash size={16} className="text-red-600" />
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// ....................................................................................................................

// "use client";
// import { useEffect, useState } from "react";
// import { authFetch } from "../lib/api";
// import { Edit, Trash } from "lucide-react";

// export default function CustomerList() {
//   const [customers, setCustomers] = useState<any[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [search, setSearch] = useState(""); // ✅ search state

//   // form state (shared for create & edit)
//   const [form, setForm] = useState({
//     name: "",
//     company: "",
//     email: "",
//     phone: "",
//     address: "",
//     panNumber: "",
//     gstNumber: "",
//     stateName: "",
//     stateCode: "",
//   });

//   const [editing, setEditing] = useState<number | null>(null);
//   const [saving, setSaving] = useState(false);

//   async function load() {
//     setLoading(true);
//     try {
//       const data = await authFetch("/api/customers");
//       setCustomers(data || []);
//     } catch (err) {
//       alert("Failed to load customers");
//     } finally {
//       setLoading(false);
//     }
//   }

//   useEffect(() => {
//     load();
//   }, []);

//   function resetForm() {
//     setForm({
//       name: "",
//       company: "",
//       email: "",
//       phone: "",
//       address: "",
//       panNumber: "",
//       gstNumber: "",
//       stateName: "",
//       stateCode: "",
//     });
//     setEditing(null);
//   }

//   function startEdit(cust: any) {
//     setForm({
//       name: cust.name || "",
//       company: cust.company || "",
//       email: cust.email || "",
//       phone: cust.phone || "",
//       address: cust.address || "",
//       panNumber: cust.panNumber || "",
//       gstNumber: cust.gstNumber || "",
//       stateName: cust.stateName || "",
//       stateCode: cust.stateCode || "",
//     });
//     setEditing(cust.id);
//     window.scrollTo({ top: 0, behavior: "smooth" });
//   }

//   async function createOrUpdateCustomer(e: React.FormEvent) {
//     e.preventDefault();
//     setSaving(true);
//     try {
//       if (editing) {
//         await authFetch(`/api/customers/${editing}`, {
//           method: "PUT",
//           body: JSON.stringify(form),
//           headers: { "Content-Type": "application/json" },
//         });
//       } else {
//         await authFetch("/api/customers", {
//           method: "POST",
//           body: JSON.stringify(form),
//           headers: { "Content-Type": "application/json" },
//         });
//       }
//       resetForm();
//       load();
//     } catch (err: any) {
//       alert("Save failed: " + (err.message || err));
//     } finally {
//       setSaving(false);
//     }
//   }

//   async function handleDelete(id: number) {
//     if (!confirm("Delete this customer? This will remove the record permanently.")) return;
//     try {
//       await authFetch(`/api/customers/${id}`, { method: "DELETE" });
//       if (editing === id) resetForm();
//       load();
//     } catch (err: any) {
//       if (err?.message) alert("Delete failed: " + err.message);
//       else alert("Delete failed");
//     }
//   }

//   function customerPaymentStatus(customer: any) {
//     const invs = Array.isArray(customer?.invoices) ? customer.invoices : [];
//     if (invs.length === 0) return "UNPAID";

//     const allPaid = invs.every((inv: any) => {
//       const total = Number(inv.total || 0);
//       const paid = Number(
//         inv.advancePaid ?? inv.payments?.reduce?.((s: number, p: any) => s + Number(p.amount || 0), 0) ?? 0
//       );
//       return total <= 0 || paid >= total;
//     });

//     if (allPaid) return "PAID";

//     const anyPartial = invs.some((inv: any) => {
//       const total = Number(inv.total || 0);
//       const paid = Number(
//         inv.advancePaid ?? inv.payments?.reduce?.((s: number, p: any) => s + Number(p.amount || 0), 0) ?? 0
//       );
//       return paid > 0 && paid < total;
//     });

//     if (anyPartial) return "PARTIAL";
//     return "UNPAID";
//   }

//   function statusColor(status: string) {
//     switch (status) {
//       case "PAID":
//         return "bg-green-100 text-green-800";
//       case "PARTIAL":
//         return "bg-yellow-100 text-yellow-800";
//       default:
//         return "bg-gray-100 text-gray-800";
//     }
//   }

//   // filter customers by search
//   const filteredCustomers = customers.filter(c =>
//     c.name.toLowerCase().includes(search.trim().toLowerCase())
//   );

//   return (
//     <div>
//       {/* Create/Edit Form */}
//       <div className="card mb-4">
//         <h3 className="font-semibold mb-3">{editing ? "Edit Customer" : "Create Customer"}</h3>
//         <form onSubmit={createOrUpdateCustomer} className="grid grid-cols-2 gap-2">
//           <input className="input" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
//           <input className="input" placeholder="Company" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
//           <input className="input" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
//           <input className="input" placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
//           <input className="input" placeholder="PAN Number" value={form.panNumber} onChange={e => setForm({ ...form, panNumber: e.target.value })} />
//           <input className="input" placeholder="GSTIN" value={form.gstNumber} onChange={e => setForm({ ...form, gstNumber: e.target.value })} />
//           <input className="input" placeholder="State Name" value={form.stateName} onChange={e => setForm({ ...form, stateName: e.target.value })} />
//           <input className="input" placeholder="State Code" value={form.stateCode} onChange={e => setForm({ ...form, stateCode: e.target.value })} />
//           <input className="input col-span-2" placeholder="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
//           <div />
//           <div className="flex gap-2 justify-end">
//             {editing && (
//               <button type="button" className="px-3 py-2 rounded-md border" onClick={resetForm}>Cancel</button>
//             )}
//             <button className="btn" disabled={saving}>{saving ? "Saving..." : (editing ? "Update Customer" : "Create Customer")}</button>
//           </div>
//         </form>
//       </div>

//       {/* Search Input */}
//       {/* Small Search Input */}
// <div className="flex justify-end mb-3 relative w-64 ml-auto">
//   <input
//     type="text"
//     placeholder="Search customers..."
//     value={search}
//     onChange={e => setSearch(e.target.value)}
//     className="input rounded-full border px-4 py-2 pr-10 text-sm shadow-sm focus:outline-none focus:ring-2 placeholder:text-gray-400"
//     style={{ borderColor: "rgb(128,41,73)" }}
//   />
//   <svg
//     className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
//     fill="none"
//     stroke="currentColor"
//     viewBox="0 0 24 24"
//   >
//     <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
//   </svg>
// </div>


//       {/* Customer List */}
//       <div className="card">
//         <h3 className="font-semibold mb-2">Customers</h3>
//         {loading ? (
//           <div>Loading...</div>
//         ) : (
//           <div className="space-y-2">
//             {filteredCustomers.length === 0 && <div className="text-sm text-gray-500">No customers found.</div>}
//             {filteredCustomers.map(c => {
//               const status = customerPaymentStatus(c);
//               return (
//                 <div key={c.id} className="p-3 border rounded-md flex justify-between items-start shadow-sm hover:shadow-md transition">
//                   <div>
//                     <div className="font-semibold">{c.name} <span className="kv">({c.company || "—"})</span></div>
//                     <div className="kv">{c.email || "—"} • {c.phone || "—"}</div>
//                     <div className="kv mt-1">
//                       {c.stateName && <>State: {c.stateName} ({c.stateCode}) • </>}
//                       {c.panNumber ? <>PAN: {c.panNumber} • </> : null}
//                       {c.gstNumber ? <>GSTIN: {c.gstNumber}</> : null}
//                     </div>
//                     {c.address && <div className="text-sm mt-1">{c.address}</div>}
//                   </div>
//                   <div className="flex flex-col items-end gap-2">
//                     <div className="flex items-center gap-2">
//                       <div className={`px-3 py-1 rounded-full ${statusColor(status)} font-semibold text-sm`}>{status}</div>
//                       <div className="kv">Invoices: {c.invoices?.length ?? 0}</div>
//                     </div>
//                     <div className="flex gap-2">
//                       <button title="Edit" onClick={() => startEdit(c)} className="p-2 rounded-md border-2 border-yellow-400 hover:bg-yellow-50 transition">
//                         <Edit size={16} className="text-yellow-600" /> Edit
//                       </button>
//                       <button title="Delete" onClick={() => handleDelete(c.id)} className="p-2 rounded-md border-2 border-red-400 hover:bg-red-50 transition">
//                         <Trash size={16} className="text-red-600" /> Delete
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }




"use client";
import { useEffect, useState } from "react";
import { authFetch } from "../lib/api";
import { Edit, Trash } from "lucide-react";

export default function CustomerList() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(""); // ✅ search state

  // form state (shared for create & edit)
  const [form, setForm] = useState({
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

  async function load() {
    setLoading(true);
    try {
      // include invoices & payments so we can calculate paid/balance
      const data = await authFetch("/api/customers");
      setCustomers(data || []);
    } catch (err) {
      alert("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
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
  }

  function startEdit(cust: any) {
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
    setEditing(cust.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function createOrUpdateCustomer(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await authFetch(`/api/customers/${editing}`, {
          method: "PUT",
          body: JSON.stringify(form),
          headers: { "Content-Type": "application/json" },
        });
      } else {
        await authFetch("/api/customers", {
          method: "POST",
          body: JSON.stringify(form),
          headers: { "Content-Type": "application/json" },
        });
      }
      resetForm();
      load();
    } catch (err: any) {
      alert("Save failed: " + (err.message || err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this customer? This will remove the record permanently.")) return;
    try {
      await authFetch(`/api/customers/${id}`, { method: "DELETE" });
      if (editing === id) resetForm();
      load();
    } catch (err: any) {
      if (err?.message) alert("Delete failed: " + err.message);
      else alert("Delete failed");
    }
  }

  // Calculate totals for a customer:
  // totalDue = sum of invoice.total
  // totalPaid = sum of invoice.advancePaid + sum(invoice.payments[].amount)
  // balance = max(totalDue - totalPaid, 0)
  function computeCustomerAmounts(customer: any) {
    const invs = Array.isArray(customer?.invoices) ? customer.invoices : [];
    let totalDue = 0;
    let totalPaid = 0;

    for (const inv of invs) {
      const invTotal = Number(inv?.total || 0);
      totalDue += invTotal;

      // Some invoices store advancePaid, and also may have payments array.
      const advance = Number(inv?.advancePaid || 0);
      const paymentsSum = Array.isArray(inv?.payments)
        ? inv.payments.reduce((s: number, p: any) => s + Number(p?.amount || 0), 0)
        : 0;

      // We sum both advancePaid and payments array to be safe (backend may record advance separately).
      totalPaid += advance + paymentsSum;
    }

    // ensure numbers and rounding to 2 decimal places
    totalDue = Math.round(totalDue * 100) / 100;
    totalPaid = Math.round(totalPaid * 100) / 100;
    const balance = Math.max(Math.round((totalDue - totalPaid) * 100) / 100, 0);

    return { totalDue, totalPaid, balance };
  }

  // filter customers by search (name or company)
  const filteredCustomers = customers.filter(c => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const name = String(c.name || "").toLowerCase();
    const company = String(c.company || "").toLowerCase();
    return name.includes(q) || company.includes(q);
  });

  return (
    <div>
      {/* Create/Edit Form */}
      <div className="card mb-4">
        <h3 className="font-semibold mb-3">{editing ? "Edit Customer" : "Create Customer"}</h3>
        <form onSubmit={createOrUpdateCustomer} className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <input className="input" placeholder="Company" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
          <input className="input" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <input className="input" placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <input className="input" placeholder="PAN Number" value={form.panNumber} onChange={e => setForm({ ...form, panNumber: e.target.value })} />
          <input className="input" placeholder="GSTIN" value={form.gstNumber} onChange={e => setForm({ ...form, gstNumber: e.target.value })} />
          <input className="input" placeholder="State Name" value={form.stateName} onChange={e => setForm({ ...form, stateName: e.target.value })} />
          <input className="input" placeholder="State Code" value={form.stateCode} onChange={e => setForm({ ...form, stateCode: e.target.value })} />
          <input className="input col-span-2" placeholder="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          <div />
          <div className="flex gap-2 justify-end">
            {editing && (
              <button type="button" className="px-3 py-2 rounded-md border" onClick={resetForm}>Cancel</button>
            )}
            <button className="btn" disabled={saving}>{saving ? "Saving..." : (editing ? "Update Customer" : "Create Customer")}</button>
          </div>
        </form>
      </div>

      {/* Search Input */}
      <div className="flex justify-end mb-3 relative w-64 ml-auto">
        <input
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
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
            {filteredCustomers.map(c => {
              const { totalDue, totalPaid, balance } = computeCustomerAmounts(c);

              return (
                <div key={c.id} className="p-3 border rounded-md flex justify-between items-start shadow-sm hover:shadow-md transition">
                  <div className="flex-1 pr-4">
                    <div className="font-semibold">{c.name} <span className="kv">({c.company || "—"})</span></div>
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
                      <button title="Edit" onClick={() => startEdit(c)} className="p-2 rounded-md border-2 border-yellow-400 hover:bg-yellow-50 transition flex items-center gap-2">
                        <Edit size={16} className="text-yellow-600" /> Edit
                      </button>
                      <button title="Delete" onClick={() => handleDelete(c.id)} className="p-2 rounded-md border-2 border-red-400 hover:bg-red-50 transition flex items-center gap-2">
                        <Trash size={16} className="text-red-600" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
