"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { authFetch } from "../../../lib/api";

// Types
import type { Invoice, User, Settings, Stats, TabKey } from "@/src/types/invoice";

// Dynamic imports with SSR disabled
const Sidebar = dynamic(() => import("../../../components/Sidebar"), { ssr: false });
const Topbar = dynamic(() => import("../../../components/Topbar"), { ssr: false });
const DashboardSummary = dynamic(() => import("../../../components/DashboardSummary"), { ssr: false });
const InvoiceForm = dynamic(() => import("../../../components/InvoiceForm"), { ssr: false });
const CustomerList = dynamic(() => import("../../../components/CustomerList"), { ssr: false });
const SettingsForm = dynamic(() => import("../../../components/SettingsForm"), { ssr: false });
const Payments = dynamic(() => import("@/components/Payments"), { ssr: false });
const InlineInvoiceView = dynamic(() => import("@/components/InlineInvoiceView"), { ssr: false });
const InvoiceTable = dynamic(() => import("@/components/InvoiceTable"), { ssr: false });
const Reports = dynamic(() => import("@/components/Reports"), { ssr: false });



export default function UserDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [selected, setSelected] = useState<TabKey>("dashboard");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [, setStats] = useState<Stats | null>(null);
  const [viewInvoiceId, setViewInvoiceId] = useState<number | undefined>(undefined);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (!u) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(u);
    if (parsed.role === "ADMIN") {
      router.push("/admin/dashboard");
      return;
    }
    setUser(parsed);

    // Load settings from localStorage first
    const savedSettings = localStorage.getItem("settings");
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    } else {
      loadSettings();
    }

    loadSummary();
    loadInvoices();
  }, []);

  async function loadSettings() {
    try {
      const s = await authFetch("/api/settings");
      if (s) {
        const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";
        const updated = {
          ...s,
          logoPreview: s.logoPath ? `${API}${s.logoPath}` : null,
        };
        setSettings(updated);
        localStorage.setItem("settings", JSON.stringify(updated));
      }
    } catch (err) {
      console.error("Failed to load settings", err);
    }
  }

  async function loadSummary() {
    try {
      const s = await authFetch("/api/reports/summary");
      setStats(s);
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

  // Sidebar logo: uses saved logoPreview if exists
  const sidebarLogo = settings?.logoPreview;

  return (
    <div className="min-h-screen flex">
     <Sidebar
        role="USER"
        selected={selected}
        onSelect={(k) => setSelected(k)}
        logoUrl={sidebarLogo  ?? undefined}
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
              <DashboardSummary  />

              <InvoiceTable
                invoices={invoices}
                onConvert={loadInvoices} 
                onPaymentSuccess={loadInvoices}
                onView={(id) => {
                  setViewInvoiceId(id);
                  setSelected("invoiceview");
                }}
                onEdit={async (id) => {
                  try {
                    const inv = await authFetch(`/api/invoices/${id}`);
                    setSelected("invoice");
                    setEditInvoice(inv);
                  } catch (err) {
                    alert("Failed"+ (err))
                  }
                }}
                onDelete={async (id) => {
                  if (!confirm("Are you sure you want to delete this invoice?")) return;
                  try {
                    await authFetch(`/api/invoices/${id}`, { method: "DELETE" });
                    loadInvoices();
                  } catch (err) {
                    alert("Failed to delete invoice."+ (err));
                  }
                }}
              />
            </>
          )}

          {selected === "invoice" && (
            <InvoiceForm
              initialInvoice={editInvoice ?? undefined}
              onCreated={(inv) => {
                setViewInvoiceId(inv?.id);
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
              companyLogo={sidebarLogo  ?? undefined}
              companyDetails={settings ?? undefined}
              onBack={() => setSelected("invoice")}
            />
          )}

          {selected === "customers" && <CustomerList />}
          {selected === "settings" && (
            <SettingsForm
              initialSettings={settings}
              onSettingsUpdate={(s) => {
                setSettings(s);
                localStorage.setItem("settings", JSON.stringify(s));
              }}
            />
          )}
          {selected === "setpassword" && <SetPasswordPanel />}
          {selected === "payments" && <Payments />}
          {selected === "reports" && <Reports />}
        </div>
      </div>
    </div>
  );
}

function SetPasswordPanel() {
  const [oldPassword, setOld] = useState("");
  const [newPassword, setNew] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await authFetch("/api/users/change-password", {
        method: "POST",
        body: JSON.stringify({ oldPassword, newPassword }),
        headers: { "Content-Type": "application/json" },
      });
      alert("Password changed - you can now login again");
    } catch (err) {
      alert("Failed: " + (err));
    }
  }
  return (
    <div className="card">
      <form onSubmit={submit} className="grid grid-cols-1 gap-2">
        <input
          className="input"
          type="password"
          placeholder="Old password (leave blank if forced change)"
          value={oldPassword}
          onChange={(e) => setOld(e.target.value)}
        />
        <input
          className="input"
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNew(e.target.value)}
          required
        />
        <div className="flex justify-end">
          <button className="btn">Change Password</button>
        </div>
      </form>
    </div>
  );
}
