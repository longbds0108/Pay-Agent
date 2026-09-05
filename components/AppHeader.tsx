"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogoMark } from "@/components/LogoMark";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/agent", label: "Agent" },
  { href: "/policy", label: "Policy" },
  { href: "/transactions", label: "Transactions" },
];

/** Header dùng chung cho các trang sau đăng nhập — nền tối, khớp với /login. */
export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b border-ink-line bg-ink-panel">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-3.5">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-paper">
            <LogoMark />
            <span className="hidden sm:inline">AgentPay</span>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-3 py-1.5 text-sm transition ${
                    active ? "bg-confirmed/15 text-confirmed" : "text-paper/55 hover:text-paper"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="text-sm text-paper/40 transition hover:text-paper/70"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
