// // "use client";
// // import { useState } from "react";

// // type TabKey = "dashboard"|"invoice"|"receipt"|"customers"|"settings"|"reports"|"register"|"setpassword";

// // export default function Sidebar({ role, selected, onSelect, logoUrl }: {
// //   role: string,
// //   selected: TabKey,
// //   onSelect: (k: TabKey)=>void,
// //   logoUrl?: string
// // }) {

// //  const items = [
// //   { key: "dashboard" as TabKey, label: "Dashboard" },
// //   { key: "invoice" as TabKey, label: "New Quotation" },
// //   { key: "receipt" as TabKey, label: "Receipt / Payments" },
// //   { key: "customers" as TabKey, label: "Customers" },
// //   { key: "settings" as TabKey, label: "Settings" },
// //   { key: "reports" as TabKey, label: "Reports" },
// //   ...(role === "ADMIN"
// //     ? [{ key: "register" as TabKey, label: "Register User" }]
// //     : [{ key: "setpassword" as TabKey, label: "Set Password" }]
// //   )
// // ];
// //   return (
// //     <aside className="w-72 p-4 space-y-6 border-r" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
// //       <div className="flex items-center gap-3">
// //         {logoUrl ? (
// //           // logo from backend
// //           // ensure backend serves uploads at /uploads
// //           // next/image later if allowed
// //           <img src={`${logoUrl}`} alt="logo" className="h-12 w-12 rounded-md object-cover"/>
// //         ) : (
// //           <div className="h-12 w-12 rounded-md bg-primary text-white flex items-center justify-center">IM</div>
// //         )}
// //         <div>
// //           <div className="font-semibold">Company</div>
// //           <div className="kv">Invoice Maker</div>
// //         </div>
// //       </div>

// //       <nav className="flex flex-col gap-1">
// //         {items.map(it => (
// //           <button
// //             key={it.key}
// //             onClick={() => onSelect(it.key)}
// //             className={`text-left px-3 py-2 rounded-lg flex items-center justify-between ${selected === it.key ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-gray-50"}`}
// //           >
// //             {it.label}
// //           </button>
// //         ))}
// //       </nav>

// //       <div className="kv text-sm mt-6">Logged role: <strong>{role}</strong></div>
// //     </aside>
// //   );
// // }

// "use client";
// import { useState } from "react";

// type TabKey =
//   | "dashboard"
//   | "invoice"
//   | "receipt"
//   | "customers"
//   | "settings"
//   | "reports"
//   | "register"
//   | "setpassword";

// export default function Sidebar({
//   role,
//   selected,
//   onSelect,
//   logoUrl,
//   companyName,
// }: {
//   role: string;
//   selected: TabKey;
//   onSelect: (k: TabKey) => void;
//   logoUrl?: string;
//   companyName?: string;
// }) {
//   const items = [
//     { key: "dashboard" as TabKey, label: "Dashboard" },
//     { key: "invoice" as TabKey, label: "New Quotation" },
//     { key: "receipt" as TabKey, label: "Receipt / Payments" },
//     { key: "customers" as TabKey, label: "Customers" },
//     { key: "settings" as TabKey, label: "Settings" },
//     { key: "reports" as TabKey, label: "Reports" },
//     ...(role === "ADMIN"
//       ? [{ key: "register" as TabKey, label: "Register User" }]
//       : [{ key: "setpassword" as TabKey, label: "Set Password" }]),
//   ];

//   return (
//     <aside className="w-72 p-4 space-y-6 border-r" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
//       <div className="flex items-center gap-3">
//         {logoUrl ? (
//           <img src={logoUrl} alt="logo" className="h-12 w-12 rounded-md object-cover" />
//         ) : (
//           <div className="h-12 w-12 rounded-md bg-primary text-white flex items-center justify-center">IM</div>
//         )}
//         <div>
//           <div className="font-semibold">{companyName || "Company"}</div>
//           <div className="kv">Invoice Maker</div>
//         </div>
//       </div>

//       <nav className="flex flex-col gap-1">
//         {items.map((it) => (
//           <button
//             key={it.key}
//             onClick={() => onSelect(it.key)}
//             className={`text-left px-3 py-2 rounded-lg flex items-center justify-between ${
//               selected === it.key ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-gray-50"
//             }`}
//           >
//             {it.label}
//           </button>
//         ))}
//       </nav>

//       <div className="kv text-sm mt-6">
//         Logged role: <strong>{role}</strong>
//       </div>
//     </aside>
//   );
// }

"use client";
import { useState } from "react";
import {
  LayoutDashboard,
  FilePlus,
  Receipt,
  Users,
  Settings,
  BarChart3,
  UserPlus,
  KeyRound,
  DollarSign
} from "lucide-react";

type TabKey =
  | "dashboard"
  | "invoice"
  | "customers"
  | "settings"
  | "reports"
  | "register"
  | "setpassword"
  | "payments"; // ✅ added


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
