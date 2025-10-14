"use client";
import ThemeToggle from "./ThemeToggle";

interface User {
  fullName?: string;
  email?: string;
  role?: string;
}

// export default function Topbar({ user, onLogout }: { user: any, onLogout: ()=>void }) {
export default function Topbar({ user, onLogout }: { user: User | null; onLogout: () => void }) {
  return (
    <div className="flex items-center justify-between py-3 px-4 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
      <div className="flex items-center gap-4">
        <div className="text-xl font-semibold" style={{ color: "var(--primary)" }}>
          Invoice Maker
        </div>
        <div className="kv">Welcome back, <strong>{user?.fullName || user?.email || "User"}</strong></div>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <button className="px-3 py-1 bg-gray-100 rounded-lg" onClick={onLogout}>Logout</button>
      </div>
    </div>
  );
}
