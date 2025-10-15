

"use client";

import {
  LayoutDashboard,
  FilePlus,
  Users,
  Settings,
  BarChart3,
  UserPlus,
  KeyRound,
  DollarSign
} from "lucide-react";
import type { TabKey } from "@/src/types/invoice";




export default function Sidebar({
  role,
  selected,
  onSelect,
  logoUrl,
  companyName,
}: {
  role: string;
  selected: TabKey;
  onSelect: (k: TabKey) => void;
  logoUrl?: string;
  companyName?: string;
}) {
  const items = [
    { key: "dashboard" as TabKey, label: "Dashboard", icon: LayoutDashboard },
    { key: "invoice" as TabKey, label: "New Quotation", icon: FilePlus },
    { key: "payments" as TabKey, label: "Payments", icon: DollarSign },
    { key: "customers" as TabKey, label: "Customers", icon: Users },
    { key: "settings" as TabKey, label: "Settings", icon: Settings },
    { key: "reports" as TabKey, label: "Reports", icon: BarChart3 },
    ...(role === "ADMIN"
      ? [{ key: "register" as TabKey, label: "Register User", icon: UserPlus }]
      : [{ key: "setpassword" as TabKey, label: "Set Password", icon: KeyRound }]),
  ];

  return (
    <aside
      className="w-72 p-4 space-y-6 border-r"
      style={{ borderColor: "rgba(0,0,0,0.06)" }}
    >
      {/* Logo + Company */}
      <div className="flex items-center gap-3">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="logo"
            className="h-12 w-12 rounded-md object-cover"
          />
        ) : (
          <div className="h-12 w-12 rounded-md bg-primary text-white flex items-center justify-center">
            IM
          </div>
        )}
        <div>
          <div className="font-semibold">{companyName || "Company"}</div>
          <div className="kv">Invoice Maker</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <button
              key={it.key}
              onClick={() => onSelect(it.key)}
              className={`text-left px-3 py-2 rounded-lg flex items-center gap-3 ${
                selected === it.key
                  ? "bg-primary/10 ring-1 ring-primary/40"
                  : "hover:bg-gray-50"
              }`}
            >
              <Icon className="h-5 w-5 text-gray-600" />
              <span>{it.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="kv text-sm mt-6">
        Logged role: <strong>{role}</strong>
      </div>
    </aside>
  );
}
