"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogoMark } from "@/components/LogoMark";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", shortLabel: "Home" },
  { href: "/agent", label: "Agent", shortLabel: "Agent" },
  { href: "/policy", label: "Policy", shortLabel: "Policy" },
  { href: "/transactions", label: "Transactions", shortLabel: "Activity" },
];

/**
 * Điều hướng dùng chung cho các trang sau đăng nhập — sidebar dọc bên trái
 * trên desktop (md trở lên), thu gọn thành thanh ngang trên mobile (sidebar
 * dọc cố định 224px quá rộng trên màn hình nhỏ).
 */
export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      {/* Desktop: sidebar dọc */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-ink-line bg-ink-panel md:flex">
        <Link href="/dashboard" className="flex items-center gap-2 px-5 py-5 text-sm font-semibold text-paper">
          <LogoMark />
          AgentPay
        </Link>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  active ? "bg-confirmed/15 text-confirmed" : "text-paper/55 hover:text-paper"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-ink-line p-3">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-paper/40 transition hover:text-paper/70"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile: thanh ngang gọn */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-ink-line bg-ink-panel px-4 py-3 md:hidden">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2 text-sm font-semibold text-paper">
          <LogoMark />
        </Link>
        <nav className="flex min-w-0 flex-1 items-center justify-between gap-1">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs transition ${
                  active ? "bg-confirmed/15 text-confirmed" : "text-paper/55"
                }`}
              >
                {link.shortLabel}
              </Link>
            );
          })}
        </nav>
        <button type="button" onClick={handleSignOut} className="shrink-0 text-xs text-paper/40">
          Sign out
        </button>
      </header>
    </>
  );
}
