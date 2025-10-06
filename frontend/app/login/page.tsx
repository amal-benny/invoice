// "use client";
// import { useRouter } from "next/navigation";
// import { useState } from "react";

// export default function LoginPage() {
//   const router = useRouter();
//   const [email, setEmail] = useState("admin@example.com");
//   const [password, setPassword] = useState("Admin@123");
//   const [loading, setLoading] = useState(false);

//   async function submit(e: React.FormEvent) {
//     e.preventDefault();
//     setLoading(true);
//     try {
//       const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000"}/api/auth/login`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ email, password })
//       });
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.message || JSON.stringify(data));
//       // save token & user
//       localStorage.setItem("token", data.token);
//       localStorage.setItem("user", JSON.stringify(data.user));
//       // redirect based on role
//       if (data.user.role === "ADMIN") router.push("/admin/dashboard");
//       else router.push("/user/dashboard");
//     } catch (err:any) {
//       alert("Login failed: " + (err.message || err));
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <div className="min-h-screen flex items-center justify-center p-6">
//       <div className="w-full max-w-md card">
//         <h2 className="text-2xl font-semibold mb-4">Sign in</h2>
//         <form onSubmit={submit} className="space-y-3">
//           <input className="input" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
//           <input className="input" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required />
//           <div className="flex justify-between items-center">
//             <div className="kv">Demo: admin@example.com / Admin@123</div>
//             <button className="btn" disabled={loading}>{loading ? "Signing..." : "Sign in"}</button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }

"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("Admin@123");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000"
        }/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || JSON.stringify(data));
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.user.role === "ADMIN") router.push("/admin/dashboard");
      else router.push("/user/dashboard");
    } catch (err: any) {
      alert("Login failed: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
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
          <h1 className="text-2xl font-bold text-gray-900">
            Worqit Invoice Maker
          </h1>
          <p className="text-gray-500 mt-1 text-center">
            Create and manage professional invoices
          </p>
        </div>

        <form onSubmit={submit} className="space-y-2 text-center">
          <h2 className="text-xl font-semibold text-gray-800">Welcome back</h2>
          <p className="text-gray-500 text-sm">Login to access your invoices</p>

          <input
            type="email"
            placeholder="Email"
            className="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-purple-700"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
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

        {/* <p className="text-gray-400 text-sm mt-4 text-center">
          Demo: admin@example.com / Admin@123
        </p> */}
      </div>
    </div>
  );
}
