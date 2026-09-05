import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: "AgentPay",
  description: "Give your agent a budget, not the keys. AI agent payments on Arc, capped by policy.",
  openGraph: {
    title: "AgentPay",
    description: "Give your agent a budget, not the keys. AI agent payments on Arc, capped by policy.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AgentPay",
    description: "Give your agent a budget, not the keys. AI agent payments on Arc, capped by policy.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
