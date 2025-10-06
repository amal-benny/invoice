"use client";
import { useEffect, useState } from "react";
import { authFetch } from "../lib/api";

export default function SettingsForm({
  initialSettings,
  onSettingsUpdate,
}: {
  initialSettings?: any;
  onSettingsUpdate?: (s: any) => void;
}) {
  const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

  const [settings, setSettings] = useState<any>(initialSettings || null);
  const [form, setForm] = useState({
    name: initialSettings?.name || "",
    address: initialSettings?.address || "",
    contact: initialSettings?.contact || "",
    gstNumber: initialSettings?.gstNumber || "",
    panNumber: initialSettings?.panNumber || "",
    currency: initialSettings?.currency || "INR",
    taxPercent:
      initialSettings?.taxPercent !== undefined &&
      initialSettings?.taxPercent !== null
        ? String(initialSettings.taxPercent)
        : "",
    taxType: initialSettings?.taxType || "GST",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    initialSettings?.logoPath ? `${API}${initialSettings.logoPath}` : null
  );

  useEffect(() => {
    if (!initialSettings) {
      (async () => {
        try {
          const s = await authFetch("/api/settings");
          if (s) {
            setSettings(s);
            setForm({
              name: s.name || "",
              address: s.address || "",
              contact: s.contact || "",
              gstNumber: s.gstNumber || "",
              panNumber: s.panNumber || "",
              currency: s.currency || "INR",
              taxPercent:
                s.taxPercent !== undefined && s.taxPercent !== null
                  ? String(s.taxPercent)
                  : "",
              taxType: s.taxType || "GST",
            });
            setLogoPreview(s.logoPath ? `${API}${s.logoPath}` : null);
            onSettingsUpdate?.({
              ...s,
              logoPreview: s.logoPath ? `${API}${s.logoPath}` : null,
            });
          }
        } catch (err) {
          console.error("Failed to load settings", err);
        }
      })();
    }
  }, [initialSettings]);

  useEffect(() => {
    const updated = { ...settings, ...form, logoPreview };
    onSettingsUpdate?.(updated);
  }, [form, logoPreview]);

  function handleLogoChange(file: File | null) {
    setLogoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setLogoPreview(reader.result as string);
        onSettingsUpdate?.({
          ...settings,
          ...form,
          logoPreview: reader.result,
        });
      };
      reader.readAsDataURL(file);
    } else {
      const url = settings?.logoPath ? `${API}${settings.logoPath}` : null;
      setLogoPreview(url);
      onSettingsUpdate?.({ ...settings, ...form, logoPreview: url });
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.append("name", form.name);
    fd.append("address", form.address);
    fd.append("contact", form.contact);
    fd.append("gstNumber", form.gstNumber);
    fd.append("panNumber", form.panNumber);
    fd.append("currency", form.currency);
    if (form.taxPercent) fd.append("taxPercent", form.taxPercent);
    if (form.taxType) fd.append("taxType", form.taxType);
    if (logoFile) fd.append("logo", logoFile);

    try {
      const raw = await fetch(`${API}/api/settings`, {
        method: "POST",
        body: fd,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });

      if (!raw.ok) throw new Error(await raw.text());
      const res = await raw.json();
      setSettings(res);
      setLogoPreview(res.logoPath ? `${API}${res.logoPath}` : null);
      onSettingsUpdate?.({
        ...res,
        logoPreview: res.logoPath ? `${API}${res.logoPath}` : null,
      });
      alert("Settings saved successfully!");
    } catch (err: any) {
      alert("Save failed: " + (err.message || err));
    }
  }

  return (
    <div className="card">
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
        />
        <input
          className="input col-span-2"
          placeholder="Address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
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
        />

        <select
          className="input"
          value={form.currency}
          onChange={(e) => setForm({ ...form, currency: e.target.value })}
        >
          <option value="INR">INR</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>

        <input
          className="input"
          type="number"
          step="0.01"
          placeholder="Tax %"
          value={form.taxPercent}
          onChange={(e) => setForm({ ...form, taxPercent: e.target.value })}
        />
        <select
          className="input"
          value={form.taxType}
          onChange={(e) => setForm({ ...form, taxType: e.target.value })}
        >
          <option value="GST">GST</option>
          <option value="VAT">VAT</option>
          <option value="SalesTax">Sales Tax</option>
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
          <button className="btn">Save Settings</button>
        </div>
      </form>
    </div>
  );
}
