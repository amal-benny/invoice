"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface User {
  id: number;
  email: string;
  fullName?: string;
  role: "USER" | "ADMIN" | string;
  tempPassword?: boolean;
}

interface LoginResponse {
  token: string;
  user: User;
  message?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000"}/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );
     

      const data: LoginResponse = await res.json();

      if (!res.ok) throw new Error(data.message || "Login failed");

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (data.user.role === "ADMIN") router.push("/admin/dashboard");
      else router.push("/user/dashboard");
      toast.success("Login successful!");
    } catch (err: unknown) {
      // properly handle unknown type
      if (err instanceof Error) {
        toast.error("Login failed: " + err.message);
      } else {
        toast.error("Login failed: " + String(err));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-75 max-w-md bg-white rounded-lg shadow-md p-8">
        <div className="flex flex-col items-center mb-6">
          <div
            className="w-12 h-12 flex items-center justify-center rounded-full text-white mb-2"
            style={{ backgroundColor: "rgb(128, 41, 73)" }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h6l6 6v8a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Worqit Invoice Maker</h1>
          <p className="text-gray-500 mt-1 text-center">
            Create and manage professional invoices
          </p>
        </div>

        <form onSubmit={submit} className="space-y-2 text-center">
          <h2 className="text-xl font-semibold text-gray-800">Welcome back</h2>
          <p className="text-gray-500 text-sm">Login to access your invoices</p>

          <input
            type="email"
            placeholder="Enter your email"
            className="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-purple-700"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Enter your Password"
            className="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-purple-700"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            className="w-full text-white p-3 rounded-md font-semibold disabled:opacity-50"
            style={{ backgroundColor: "rgb(128, 41, 73)" }}
            disabled={loading}
          >
            {loading ? "Signing..." : "Login"}
          </button>
        </form>
      </div>
      
    </div>
  );
}
