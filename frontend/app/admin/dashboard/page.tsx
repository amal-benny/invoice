"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../../components/Sidebar";
import Topbar from "../../../components/Topbar";
import DashboardSummary from "../../../components/DashboardSummary";
import InvoiceForm from "../../../components/InvoiceForm";
import CustomerList from "../../../components/CustomerList";
import SettingsForm from "../../../components/SettingsForm";
import Payments from "@/components/Payments";
import { authFetch } from "../../../lib/api";
import { useRouter } from "next/navigation";
import InlineInvoiceView from "@/components/InlineInvoiceView";
import InvoiceTable from "@/components/InvoiceTable";

type TabKey =
  | "dashboard"
  | "invoice"
  | "customers"
  | "settings"
  | "reports"
  | "register"
  | "setpassword"
  | "payments"
  | "invoiceview";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [selected, setSelected] = useState<TabKey>("dashboard");
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [stats, setStats] = useState<any>(null);
  const [viewInvoiceId, setViewInvoiceId] = useState<number | undefined>(
    undefined
  );
  const [editInvoice, setEditInvoice] = useState<any | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

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
    loadSummary();
    loadInvoices();
  }, []);

  async function loadSettings() {
    try {
      const s = await authFetch("/api/settings");
      if (s?.logoPath) setLogoUrl(s.logoPath);
    } catch (err) {}
  }

  async function loadSummary() {
    try {
      const s = await authFetch("/api/reports/summary");
      setStats(s);
    } catch (err) {}
  }

  async function loadInvoices() {
    try {
      const data = await authFetch("/api/invoices");
      setInvoices(data || []);
    } catch (err) {}
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
        selected={selected as any}
        onSelect={(k: any) => setSelected(k)}
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
              <DashboardSummary stats={stats} />

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
                  } catch (err) {}
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
                loadSummary(); // refresh summary
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
                companyDetails={settings}
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
              <pre>{JSON.stringify(stats, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* small RegisterUser component */
// inside AdminDashboard file — replace the RegisterUser component with this

function RegisterUser({ onDone }: { onDone?: () => void }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("USER");
  const [password, setPassword] = useState(""); // new password input

  const [users, setUsers] = useState<any[]>([]); // hold all users
  const [editUserId, setEditUserId] = useState<number | null>(null); // for edit mode

  // load users from backend
  async function loadUsers() {
    try {
      const data = await authFetch("/api/admin/users");
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
        // update basic user info (email usually shouldn't change but keeping symmetry)
        await authFetch(`/api/admin/users/${editUserId}`, {
          method: "PUT",
          body: JSON.stringify({ fullName, role }),
          headers: { "Content-Type": "application/json" },
        });

        // if admin supplied a password while editing, update password as well
        if (password && password.trim().length > 0) {
          await authFetch(`/api/admin/users/${editUserId}/password`, {
            method: "PUT",
            body: JSON.stringify({ password, forceChange: true }), // default: force user to change
            headers: { "Content-Type": "application/json" },
          });
        }

        setEditUserId(null);
        alert("User updated");
      } else {
        // register new user
        const body: any = { email, fullName, role };
        if (password && password.trim().length > 0) {
          body.password = password; // admin-provided temporary password
        }
        const res = await authFetch("/api/admin/register-user", {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        });

        // server returns the temp password if it generated one OR if admin provided it we can show it (server returns it too)
        alert("Created. Temp password: " + (res?.tempPassword || "—"));
      }

      // reset form
      setEmail("");
      setFullName("");
      setRole("USER");
      setPassword("");
      loadUsers(); // refresh table
      if (onDone) onDone();
    } catch (err: any) {
      alert("Failed: " + (err.message || err));
    }
  }

  async function deleteUser(id: number) {
    if (!confirm("Delete this user?")) return;
    try {
      await authFetch(`/api/admin/users/${id}`, { method: "DELETE" });
      loadUsers();
    } catch (err) {
      alert("Delete failed");
    }
  }

  function editUser(user: any) {
    setEditUserId(user.id);
    setEmail(user.email);
    setFullName(user.fullName);
    setRole(user.role);
    setPassword(""); // require admin to re-enter if they want to change
  }

  // admin sets password via prompt (simple UI). Optionally you can replace with modal/form.
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
      alert("Failed to set password");
    }
  }

  // admin clears the tempPassword flag (i.e., mark that user no longer needs to change password)
  async function clearTempFlag(userId: number) {
    if (!confirm("Clear 'temporary password' flag for this user?")) return;
    try {
      await authFetch(`/api/admin/users/${userId}/password`, { method: "DELETE" });
      alert("Temp flag cleared");
      loadUsers();
    } catch (err) {
      alert("Failed");
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
          required={!editUserId} // when editing, email change may be disallowed in your app. adjust as needed.
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
          onChange={(e) => setRole(e.target.value)}
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
                  <button
                    className="btn btn-sm"
                    onClick={() => setPasswordForUser(u.id)}
                  >
                    Set Password
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={() => clearTempFlag(u.id)}
                  >
                    Clear Temp
                  </button>
                  <button
                    className="btn btn-sm btn-red"
                    onClick={() => deleteUser(u.id)}
                  >
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
function ReceiptsPanel() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [invoiceId, setInvoiceId] = useState<number | undefined>();
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState("Cash");

  useEffect(() => {
    load();
  }, []);
  async function load() {
    setLoading(true);
    try {
      const p = await authFetch("/api/payments");
      setPayments(p);
    } catch (err) {}
    setLoading(false);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!invoiceId) return alert("Provide invoice id");
    try {
      await authFetch(`/api/payments/${invoiceId}`, {
        method: "POST",
        body: JSON.stringify({ method, amount }),
        headers: { "Content-Type": "application/json" },
      });
      setAmount(0);
      setInvoiceId(undefined);
      load();
    } catch (err: any) {
      alert("Payment failed: " + (err.message || err));
    }
  }

  return (
    <div>
      <div className="card mb-4">
        <form onSubmit={add} className="grid grid-cols-3 gap-2">
          <input
            className="input"
            type="number"
            placeholder="Invoice id"
            value={invoiceId ?? ""}
            onChange={(e) => setInvoiceId(Number(e.target.value) || undefined)}
          />
          <input
            className="input"
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
          <select
            className="input"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option>Cash</option>
            <option>UPI</option>
            <option>Bank</option>
          </select>
          <div />
          <div />
          <div className="flex justify-end">
            <button className="btn">Add Payment</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-2">Payments</h3>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div
                key={p.id}
                className="p-2 border rounded-md flex justify-between"
              >
                <div>
                  <div className="font-semibold">
                    {p.method} — {p.amount}
                  </div>
                  <div className="kv">
                    Invoice: {p.invoiceId} • {new Date(p.date).toLocaleString()}
                  </div>
                </div>
                <div className="kv">{p.note}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
