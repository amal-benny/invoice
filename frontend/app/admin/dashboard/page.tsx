"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { authFetch } from "../../../lib/api";

// Types
import type { Invoice, User, Settings, TabKey } from "@/src/types/invoice";

// Dynamic imports (disable SSR for browser-only components)
const Sidebar = dynamic(() => import("../../../components/Sidebar"), { ssr: false });
const Topbar = dynamic(() => import("../../../components/Topbar"), { ssr: false });
const DashboardSummary = dynamic(() => import("../../../components/DashboardSummary"), { ssr: false });
const InvoiceForm = dynamic(() => import("../../../components/InvoiceForm"), { ssr: false });
const CustomerList = dynamic(() => import("../../../components/CustomerList"), { ssr: false });
const SettingsForm = dynamic(() => import("../../../components/SettingsForm"), { ssr: false });
const Payments = dynamic(() => import("@/components/Payments"), { ssr: false });
const InlineInvoiceView = dynamic(() => import("@/components/InlineInvoiceView"), { ssr: false });
const InvoiceTable = dynamic(() => import("@/components/InvoiceTable"), { ssr: false });



export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [selected, setSelected] = useState<TabKey>("dashboard");
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  
  const [viewInvoiceId, setViewInvoiceId] = useState<number | undefined>(
    undefined
  );
  const [, setEditInvoice] = useState<Invoice | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    const u =
      typeof window !== "undefined" ? localStorage.getItem("user") : null;
    if (!u) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(u);
    if (parsed.role !== "ADMIN") {
      router.push("/user/dashboard");
      return;
    }
    setUser(parsed);
    loadSettings();
    loadInvoices();
  }, []);

  async function loadSettings() {
    try {
      const s = await authFetch("/api/settings");
      if (s?.logoPath) setLogoUrl(s.logoPath);
    } catch (err) {
       console.error("Failed to load ", err);
    }
  }

 

  async function loadInvoices() {
    try {
      const data = await authFetch("/api/invoices");
      setInvoices(data || []);
    } catch (err) {
       console.error("Failed to load ", err);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  }

  const sidebarLogo =
    settings?.logoPreview ||
    (settings?.logoPath
      ? `${process.env.NEXT_PUBLIC_API_BASE}${settings.logoPath}`
      : undefined);

  return (
    <div className="min-h-screen flex">
      <Sidebar
        role="ADMIN"
        selected={selected}
        onSelect={(k) => setSelected(k)}
        logoUrl={sidebarLogo}
        companyName={settings?.name || "Invoice Maker"}
      />
      <div className="flex-1 p-6">
        <Topbar user={user} onLogout={logout} />
        <div className="mt-6 space-y-6">
          {selected === "dashboard" && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Dashboard</h2>
                <button onClick={() => setSelected("invoice")} className="btn">
                  New Quotation
                </button>
              </div>
              <DashboardSummary />

              <InvoiceTable
                invoices={invoices}
                onConvert={loadInvoices} // Keep as is for convert
                onView={(id) => {
                  setViewInvoiceId(id);
                  setSelected("invoiceview");
                }}
                onEdit={async (id) => {
                  try {
                    const inv = await authFetch(`/api/invoices/${id}`);
                    setSelected("invoice");
                    // Pass invoice to form for editing
                    setEditInvoice(inv); // need a state to hold editing invoice
                  } catch (err) {
                    console.error("Failed to load ", err)
                  }
                }}
                onDelete={async (id) => {
                  if (!confirm("Are you sure you want to delete this invoice?"))
                    return;

                  try {
                    await authFetch(`/api/invoices/${id}`, {
                      method: "DELETE",
                    });
                    loadInvoices(); // refresh after deletion
                  } catch (err) {
                    alert("Failed to delete invoice.");
                    console.error("Failed to load ", err)
                  }
                }}
              />
            </>
          )}

          {selected === "invoice" && (
            <InvoiceForm
              onCreated={(inv) => {
                // show the created invoice in the same tab area
                setViewInvoiceId(inv?.id);
                setSelected("invoiceview");
                 // refresh summary
                loadInvoices();
                setEditInvoice(null);
              }}
            />
          )}

          {selected === "invoiceview" && (
            <div>
              <InlineInvoiceView
                invoiceId={viewInvoiceId}
                companyLogo={logoUrl}
                companyDetails={settings ?? undefined}
                onBack={() => {
                  // back to create form (or to dashboard as you prefer)
                  setSelected("invoice");
                }}
              />
            </div>
          )}

          {selected === "customers" && <CustomerList />}

          {selected === "settings" && (
            <SettingsForm
              initialSettings={settings}
              onSettingsUpdate={(s) => setSettings(s)}
            />
          )}

          {selected === "payments" && <Payments />}

          {selected === "register" && (
            <div className="card">
              <RegisterUser onDone={() => alert("User registered")} />
            </div>
          )}

          

          {selected === "reports" && (
            <div className="card">
              <h3 className="font-semibold">Reports</h3>
              <pre>{JSON.stringify( null)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* small RegisterUser component */
// inside AdminDashboard file — replace the RegisterUser component with this

type Users = {
  id: number;
  email: string;
  fullName: string;
  role: "USER" | "ADMIN";
  tempPassword?: boolean;
};

function RegisterUser({ onDone }: { onDone?: () => void }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"USER" | "ADMIN">("USER");
  const [password, setPassword] = useState("");

  const [users, setUsers] = useState<Users[]>([]);
  const [editUserId, setEditUserId] = useState<number | null>(null);

  async function loadUsers() {
    try {
      const data: Users[] = await authFetch("/api/admin/users");
      setUsers(data || []);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editUserId) {
        await authFetch(`/api/admin/users/${editUserId}`, {
          method: "PUT",
          body: JSON.stringify({ fullName, role }),
          headers: { "Content-Type": "application/json" },
        });

        if (password && password.trim().length > 0) {
          await authFetch(`/api/admin/users/${editUserId}/password`, {
            method: "PUT",
            body: JSON.stringify({ password, forceChange: true }),
            headers: { "Content-Type": "application/json" },
          });
        }

        setEditUserId(null);
        alert("User updated");
      } else {
        const body: Partial<User> & { password?: string } = { email, fullName, role };
        if (password && password.trim().length > 0) {
          body.password = password;
        }

        const res: { tempPassword?: string } = await authFetch("/api/admin/register-user", {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        });

        alert("Created. Temp password: " + (res?.tempPassword || "—"));
      }

      setEmail("");
      setFullName("");
      setRole("USER");
      setPassword("");
      loadUsers();
      if (onDone) onDone();
    } catch (err) {
      alert("Failed: " + (err));
    }
  }

  async function deleteUser(id: number) {
    if (!confirm("Delete this user?")) return;
    try {
      await authFetch(`/api/admin/users/${id}`, { method: "DELETE" });
      loadUsers();
    } catch (err) {
      alert("Delete failed" + (err));
       
    }
  }

  function editUser(user: Users) {
    setEditUserId(user.id);
    setEmail(user.email);
    setFullName(user.fullName);
    setRole(user.role);
    setPassword("");
  }

  async function setPasswordForUser(userId: number) {
    const p = prompt("Enter new temporary password for user (will be hashed):");
    if (!p) return;
    const force = confirm("Require user to change password on next login?");
    try {
      await authFetch(`/api/admin/users/${userId}/password`, {
        method: "PUT",
        body: JSON.stringify({ password: p, forceChange: force }),
        headers: { "Content-Type": "application/json" },
      });
      alert("Password set");
      loadUsers();
    } catch (err) {
      alert("Failed to set password" + (err));
       
    }
  }

  async function clearTempFlag(userId: number) {
    if (!confirm("Clear 'temporary password' flag for this user?")) return;
    try {
      await authFetch(`/api/admin/users/${userId}/password`, { method: "DELETE" });
      alert("Temp flag cleared");
      loadUsers();
    } catch (err) {
      alert("Failed" + (err));
      
    }
  }

  return (
    <div>
      {/* Registration Form */}
      <form onSubmit={submit} className="grid grid-cols-2 gap-3 mb-4">
        <input
          className="input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required={!editUserId}
        />
        <input
          className="input"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <select
          className="input"
          value={role}
          onChange={(e) => setRole(e.target.value as "USER" | "ADMIN")}
        >
          <option value="USER">User</option>
          <option value="ADMIN">Admin</option>
        </select>

        <input
          className="input"
          placeholder="Temporary password (optional)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="col-span-2 flex justify-end">
          <button className="btn">{editUserId ? "Update" : "Register"}</button>
        </div>
      </form>

      {/* Users Table */}
      <div>
        <h3 className="font-semibold mb-2">Registered Users</h3>
        <table className="table-auto w-full border">
          <thead>
            <tr>
              <th className="border p-2">ID</th>
              <th className="border p-2">Email</th>
              <th className="border p-2">Full Name</th>
              <th className="border p-2">Role</th>
              <th className="border p-2">Temp Password</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="border p-2">{u.id}</td>
                <td className="border p-2">{u.email}</td>
                <td className="border p-2">{u.fullName}</td>
                <td className="border p-2">{u.role}</td>
                <td className="border p-2">{u.tempPassword ? "Yes" : "No"}</td>
                <td className="border p-2 space-x-2">
                  <button className="btn btn-sm" onClick={() => editUser(u)}>
                    Edit
                  </button>
                  <button className="btn btn-sm" onClick={() => setPasswordForUser(u.id)}>
                    Set Password
                  </button>
                  <button className="btn btn-sm" onClick={() => clearTempFlag(u.id)}>
                    Clear Temp
                  </button>
                  <button className="btn btn-sm btn-red" onClick={() => deleteUser(u.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
/* Receipts / Payments panel (simple) */
