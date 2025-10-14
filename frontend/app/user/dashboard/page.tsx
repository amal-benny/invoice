"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { authFetch } from "../../../lib/api";
import { useRouter } from "next/navigation";

// Dynamically import all browser-dependent components
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

import type { InvoicePayload } from "../../../components/InvoiceForm";

type TabKey =
  | "dashboard"
  | "invoice"
  | "customers"
  | "settings"
  | "reports"
  | "register"
  | "payments"
  | "invoiceview"
  | "setpassword";

interface User {
  id: number;
  email: string;
  fullName?: string;
  role: "USER" | "ADMIN" | string;
  tempPassword?: boolean;
}

interface Invoice {
  id: number;
  customerId?: number;
  invoiceNumber?: string;
  date?: string;
  total?: number;
  status?: string;
}

interface Settings {
  name?: string;
  logoPath?: string;
  logoPreview?: string | null;
  [key: string]: unknown;
}

export default function UserDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [selected, setSelected] = useState<TabKey>("dashboard");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [viewInvoiceId, setViewInvoiceId] = useState<number | undefined>();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (!u) {
      router.push("/login");
      return;
    }
    const parsed: User = JSON.parse(u);
    if (parsed.role === "ADMIN") {
      router.push("/admin/dashboard");
      return;
    }
    setUser(parsed);

    const savedSettings = localStorage.getItem("settings");
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    } else {
      loadSettings();
    }

    loadSummary();
    loadInvoices();
  }, [router]);

  async function loadSettings() {
    try {
      const s: Settings = await authFetch("/api/settings");
      if (s) {
        const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";
        const updated: Settings = {
          ...s,
          logoPreview: s.logoPath ? `${API}${s.logoPath}` : null,
        };
        setSettings(updated);
        localStorage.setItem("settings", JSON.stringify(updated));
      }
    } catch (error) {
      console.error("Failed to load settings", error);
    }
  }

  async function loadSummary() {
    try {
      await authFetch("/api/reports/summary");
    } catch (error) {
      console.error("Failed to load summary", error);
    }
  }

  async function loadInvoices() {
    try {
      const data: Invoice[] = await authFetch("/api/invoices");
      setInvoices(data || []);
    } catch (error) {
      console.error("Failed to load invoices", error);
      setInvoices([]);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  }

  const sidebarLogo = settings?.logoPreview || undefined;

  return (
    <div className="min-h-screen flex">
      <Sidebar
        role="USER"
        selected={selected}
        onSelect={(k: TabKey) => setSelected(k)}
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
                onPaymentSuccess={loadInvoices}
                onView={(id: number) => {
                  setViewInvoiceId(id);
                  setSelected("invoiceview");
                }}
                onEdit={async (id: number) => {
                  try {
                    const inv: Invoice = await authFetch(`/api/invoices/${id}`);
                    setEditInvoice(inv);
                    setSelected("invoice");
                  } catch {
                    console.error("Failed to load invoice for edit");
                  }
                }}
                onDelete={async (id: number) => {
                  if (!confirm("Are you sure you want to delete this invoice?")) return;
                  try {
                    await authFetch(`/api/invoices/${id}`, { method: "DELETE" });
                    loadInvoices();
                  } catch {
                    alert("Failed to delete invoice.");
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
              initialSettings={settings}
              onSettingsUpdate={(s: Settings) => {
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
    } catch (error) {
      if (error instanceof Error) alert("Failed: " + error.message);
      else alert("Failed: " + String(error));
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
