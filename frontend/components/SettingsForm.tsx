"use client";
import { useEffect, useState } from "react";
import { authFetch } from "../lib/api";
import QuotationCategories from "../components/QuotationCategories";
import PaymentLedgers from "../components/PaymentLedgers";

type Settings = {
  id?: number;
  name?: string;
  address?: string;
  contact?: string;
  gstNumber?: string;
  panNumber?: string;
  currency?: string;
  stateName?: string;
  stateCode?: string;
  taxPercent?: number | string;
  taxType?: string;
  logoPath?: string;
};

export default function SettingsForm({
  onSettingsUpdate,
}: {
  initialSettings?: Settings | null;
  onSettingsUpdate?: (s: Settings & { logoPreview?: string | null }) => void;
}) {
  const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState({
    name: "",
    address: "",
    contact: "",
    gstNumber: "",
    panNumber: "",
    currency: "INR",
    stateName: "",
    stateCode: "",
    taxPercent: "",
    taxType: "GST",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load user settings
  useEffect(() => {
    (async () => {
      try {
        const s = (await authFetch("/api/settings")) as Settings | null;
        if (s) {
          setSettings(s);
          setForm({
            name: s.name || "",
            address: s.address || "",
            contact: s.contact || "",
            gstNumber: s.gstNumber || "",
            panNumber: s.panNumber || "",
            currency: s.currency || "INR",
            stateName: s.stateName || "",
            stateCode: s.stateCode || "",
            taxPercent: s.taxPercent ? String(s.taxPercent) : "",
            taxType: s.taxType || "GST",
          });
          const previewUrl =
            s.logoPath && s.logoPath.startsWith("http")
              ? s.logoPath
              : s.logoPath
              ? `${API}${s.logoPath}`
              : null;
          setLogoPreview(previewUrl);
          onSettingsUpdate?.({ ...s, logoPreview: previewUrl });
        }
      } catch (err) {
        console.error("Failed to load settings", err);
      }
    })();
  }, []);

  function handleLogoChange(file: File | null) {
    setLogoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      const url = settings?.logoPath ? `${API}${settings.logoPath}` : null;
      setLogoPreview(url);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (logoFile) fd.append("logo", logoFile);

    try {
      const token = localStorage.getItem("token") || "";
      const raw = await fetch(`${API}/api/settings`, {
        method: "POST",
        body: fd,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!raw.ok) throw new Error(await raw.text());
      const res: Settings = await raw.json();
      const logoUrl = res.logoPath ? `${API}${res.logoPath}` : null;
      setSettings(res);
      setLogoPreview(logoUrl);
      onSettingsUpdate?.({ ...res, logoPreview: logoUrl });
      alert("Settings saved successfully!");
    } catch (err: any) {
      alert("Save failed: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">Company Details</h3>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <input
            className="input"
            placeholder="Company name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className="input"
            placeholder="Contact"
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
            required
          />
          <input
            className="input col-span-2"
            placeholder="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            required
          />
          <input
            className="input"
            placeholder="GST Number"
            value={form.gstNumber}
            onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
          />
          <input
            className="input"
            placeholder="PAN Number"
            value={form.panNumber}
            onChange={(e) => setForm({ ...form, panNumber: e.target.value })}
            required
          />
          <input
            className="input"
            placeholder="State Name"
            value={form.stateName}
            onChange={(e) => setForm({ ...form, stateName: e.target.value })}
            required
          />
          <input
            className="input"
            placeholder="State Code"
            value={form.stateCode}
            onChange={(e) => setForm({ ...form, stateCode: e.target.value })}
            required
          />
          <select
            className="input"
            value={form.taxType}
            onChange={(e) => setForm({ ...form, taxType: e.target.value })}
            required
          >
            <option value="GST">GST</option>
            <option value="VAT">VAT</option>
            <option value="SalesTax">Sales Tax</option>
          </select>
          <input
            className="input"
            type="number"
            step="0.01"
            placeholder="Tax %"
            value={form.taxPercent}
            onChange={(e) => setForm({ ...form, taxPercent: e.target.value })}
            required
          />
          <select
            className="input"
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
            required
          >
            <option value="INR">INR</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
          <div>
            <label className="kv">Logo</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleLogoChange(e.target.files?.[0] ?? null)}
            />
            {logoPreview && (
              <img src={logoPreview} alt="logo" className="h-16 mt-2" />
            )}
          </div>
          <div />
          <div className="col-span-2 flex justify-end">
            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>

      <QuotationCategories />
      <PaymentLedgers />
    </>
  );
}
