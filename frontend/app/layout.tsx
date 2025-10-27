import "./globals.css";
import { ReactNode } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";




export const metadata = {
  title: " Worqit Invoice Maker",
  description: "Admin & user dashboard"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="min-h-screen">
          {children}
          <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
        </main>
      </body>
    </html>
  );
}
