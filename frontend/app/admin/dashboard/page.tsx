"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { authFetch } from "../../../lib/api";
import { useRouter } from "next/navigation";

// Components dynamically imported to prevent SSR errors
const Sidebar = dynamic(() => import("../../../components/Sidebar"), { ssr: false });
const Topbar = dynamic(() => import("../../../components/Topbar"), { ssr: false });
const DashboardSummary = dynamic(() => import("../../../components/DashboardSummary"), { ssr: false });
const InvoiceForm = dynamic(() => import("../../../components/InvoiceForm"), { ssr: false });
const CustomerList = dynamic(() => import("../../../components/CustomerList"), { ssr: false });
const SettingsForm = dynamic(() => import("../../../components/SettingsForm"), { ssr: false });
const Payments = dynamic(() => import("@/components/Payments"), { ssr: false });
const InlineInvoiceView = dynamic(() => import("@/components/InlineInvoiceView"), { ssr: false });
const InvoiceTable = dynamic(() => import("@/components/InvoiceTable"), { ssr: false });

import type { TabKey } from "@/src/types/ui";
import type { Settings } from "../../../components/SettingsForm";
import type { InvoicePayload } from "../../../components/InvoiceForm";

type Invoice = {
  id: number;
  customerId?: number;
  invoiceNumber?: string;
  date?: string;
  total?: number;
  status?: string;
};

interface User {
  id: number;
  email: string;
  fullName?: string;
  role?: "USER" | "ADMIN" | string;
  tempPassword?: boolean;
}

type CreateUserResponse = { tempPassword?: string };

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [selected, setSelected] = useState<TabKey>("dashboard");
  const [, setLogoUrl] = useState<string | undefined>(undefined);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [viewInvoiceId, setViewInvoiceId] = useState<number | undefined>(undefined);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    const u = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    if (!u) {
      router.push("/login");
      return;
    }
    try {
      const parsed: User = JSON.parse(u);
      if (parsed.role !== "ADMIN") {
        router.push("/user/dashboard");
        return;
      }
      setUser(parsed);
      loadSettings();
      loadSummary();
      loadInvoices();
    } catch (error) {
      console.error("Failed to parse user object from localStorage", error);
      router.push("/login");
    }
  }, [router]);

  async function loadSettings() {
    try {
      const s = (await authFetch("/api/settings")) as { name?: string; logoPath?: string; logoPreview?: string } | null;
      if (s?.logoPath) setLogoUrl(s.logoPath);
      if (s) setSettings((prev) => ({ ...(prev || {}), ...s }));
    } catch (error) {
      console.error("loadSettings failed", error);
    }
  }

  async function loadSummary() {
    try {
      const s = await authFetch("/api/reports/summary");
      setStats(s as Record<string, unknown>);
    } catch (error) {
      console.error("loadSummary failed", error);
    }
  }

  async function loadInvoices() {
    try {
      const data = (await authFetch("/api/invoices")) as Invoice[] | null;
      setInvoices(data || []);
    } catch (error) {
      console.error("loadInvoices failed", error);
      setInvoices([]);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  }

  const sidebarLogo =
    settings?.logoPreview ||
    (settings?.logoPath ? `${process.env.NEXT_PUBLIC_API_BASE}${settings.logoPath}` : undefined);

  return (
    <div className="min-h-screen flex">
      <Sidebar
        role="ADMIN"
        selected={selected}
        onSelect={setSelected}
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
                onConvert={loadInvoices}
                onView={(id) => {
                  setViewInvoiceId(id);
                  setSelected("invoiceview");
                }}
                onEdit={async (id) => {
                  try {
                    const inv = (await authFetch(`/api/invoices/${id}`)) as Invoice;
                    setEditInvoice(inv);
                    setSelected("invoice");
                  } catch (error) {
                    console.error("Failed to load invoice for edit", error);
                  }
                }}
                onDelete={async (id) => {
                  if (!confirm("Are you sure you want to delete this invoice?")) return;
                  try {
                    await authFetch(`/api/invoices/${id}`, { method: "DELETE" });
                    loadInvoices();
                  } catch (error) {
                    alert("Failed to delete invoice.");
                    console.error("delete invoice failed", error);
                  }
                }}
              />
            </>
          )}

          {selected === "invoice" && (
            <InvoiceForm
              initialInvoice={
                editInvoice
                  ? {
                      id: editInvoice.id,
                      type: "INVOICE",
                      customerId: editInvoice.customerId,
                      customerName: "",
                      customerCompany: "",
                      customerEmail: "",
                      customerPhone: "",
                      customerAddress: "",
                      date: editInvoice.date || new Date().toISOString().slice(0, 10),
                      items: [],
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
              onCreated={(inv: InvoicePayload) => {
                setViewInvoiceId(inv.id);
                setSelected("invoiceview");
                loadSummary();
                loadInvoices();
                setEditInvoice(null);
              }}
            />
          )}

          {selected === "invoiceview" && (
            <InlineInvoiceView
              invoiceId={viewInvoiceId}
              companyLogo={sidebarLogo}
              companyDetails={
                settings
                  ? {
                      name: settings.name || "",
                      logoPath: settings.logoPath,
                      logoPreview: settings.logoPreview || undefined,
                    }
                  : undefined
              }
              onBack={() => setSelected("invoice")}
            />
          )}

          {selected === "customers" && <CustomerList />}
          {selected === "settings" && (
            <SettingsForm
              initialSettings={settings ?? undefined}
              onSettingsUpdate={(s: Settings) => setSettings(s)}
            />
          )}
          {selected === "payments" && <Payments />}
          {selected === "register" && <RegisterUser />}
          {selected === "reports" && (
            <div className="card">
              <h3 className="font-semibold">Reports</h3>
              <pre>{JSON.stringify(stats, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* RegisterUser component remains exactly the same as your original */


/* RegisterUser Component */
function RegisterUser({ onDone }: { onDone?: () => void }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"USER" | "ADMIN" | string>("USER");
  const [password, setPassword] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [editUserId, setEditUserId] = useState<number | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const data = (await authFetch("/api/admin/users")) as User[] | null;
      setUsers(data || []);
    } catch (error) {
      console.error("loadUsers failed", error);
      setUsers([]);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editUserId) {
        await authFetch(`/api/admin/users/${editUserId}`, {
          method: "PUT",
          body: JSON.stringify({ fullName, role }),
          headers: { "Content-Type": "application/json" },
        });
        if (password.trim().length) {
          await authFetch(`/api/admin/users/${editUserId}/password`, {
            method: "PUT",
            body: JSON.stringify({ password, forceChange: true }),
            headers: { "Content-Type": "application/json" },
          });
        }
        setEditUserId(null);
        alert("User updated");
      } else {
        const body: Record<string, unknown> = { email, fullName, role };
        if (password.trim().length) body.password = password;
        const res = (await authFetch("/api/admin/register-user", {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        })) as CreateUserResponse | null;
        alert("Created. Temp password: " + (res?.tempPassword ?? "—"));
      }

      setEmail("");
      setFullName("");
      setRole("USER");
      setPassword("");
      loadUsers();
      if (onDone) onDone();
    } catch (error: unknown) {
      alert("Failed: " + (error instanceof Error ? error.message : String(error)));
      console.error(error);
    }
  }

  async function deleteUser(id: number) {
    if (!confirm("Delete this user?")) return;
    try {
      await authFetch(`/api/admin/users/${id}`, { method: "DELETE" });
      loadUsers();
    } catch (error) {
      alert("Delete failed");
      console.error(error);
    }
  }

  function editUser(user: User) {
    setEditUserId(user.id);
    setEmail(user.email);
    setFullName(user.fullName || "");
    setRole(user.role || "USER");
    setPassword("");
  }

  async function setPasswordForUser(userId: number) {
    const p = prompt("Enter new temporary password:") || "";
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
    } catch (error) {
      alert("Failed to set password");
      console.error(error);
    }
  }

  async function clearTempFlag(userId: number) {
    if (!confirm("Clear 'temporary password' flag?")) return;
    try {
      await authFetch(`/api/admin/users/${userId}/password`, { method: "DELETE" });
      alert("Temp flag cleared");
      loadUsers();
    } catch (error) {
      alert("Failed");
      console.error(error);
    }
  }

  return (
    <div>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3 mb-4">
        <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required={!editUserId} />
        <input className="input" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <select className="input" value={role} onChange={(e) => setRole(e.target.value as "USER" | "ADMIN" | string)}>
          <option value="USER">User</option>
          <option value="ADMIN">Admin</option>
        </select>
        <input className="input" placeholder="Temporary password (optional)" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="col-span-2 flex justify-end">
          <button className="btn">{editUserId ? "Update" : "Register"}</button>
        </div>
      </form>

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
                  <button className="btn btn-sm" onClick={() => editUser(u)}>Edit</button>
                  <button className="btn btn-sm" onClick={() => setPasswordForUser(u.id)}>Set Password</button>
                  <button className="btn btn-sm" onClick={() => clearTempFlag(u.id)}>Clear Temp</button>
                  <button className="btn btn-sm btn-red" onClick={() => deleteUser(u.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
