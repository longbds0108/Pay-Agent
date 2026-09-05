import Link from "next/link";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { SupabaseSetupNotice } from "@/components/SupabaseSetupNotice";
import { createAgentWalletClient } from "@/lib/circle/agentWallet";
import { getCurrentAgentContext } from "@/lib/currentAgent";
import { getAuditReport } from "@/lib/payments/audit";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const STATUS_LABEL: Record<string, string> = {
  created: "Creating",
  policy_check: "Checking policy",
  pending_user_approval: "Needs your OK",
  approved: "Approved",
  rejected: "Rejected",
  executing: "Executing",
  confirmed: "Confirmed",
  failed: "Failed",
};

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) return <SupabaseSetupNotice />;

  const context = await getCurrentAgentContext();
  if (!context) redirect("/login");

  const { wallet, policy } = context;
  const walletPending = wallet.type === "circle_smart_account" && !wallet.providerWalletId;

  let balanceUsdc = 0;
  let balanceError: string | null = null;

  if (wallet.type === "circle_smart_account" && wallet.providerWalletId) {
    try {
      const circle = createAgentWalletClient();
      balanceUsdc = await circle.getBalanceUsdc(wallet.providerWalletId);
    } catch (err) {
      balanceError = err instanceof Error ? err.message : "Không lấy được số dư từ Circle.";
    }
  }

  const report = await getAuditReport(context.agentId);
  const recentRows = report.rows.slice(0, 4);

  return (
    <div className="flex min-h-screen flex-col bg-ink text-paper md:flex-row">
      <AppSidebar />

      <main className="min-w-0 flex-1 px-6 py-10 lg:px-10">
        <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold">Agent Wallet</h1>
        <p className="mt-1 text-sm text-paper/50">Your agent&rsquo;s wallet, capped by the policy you set.</p>

        {walletPending && (
          <p className="mt-4 rounded-xl bg-pending/10 px-4 py-3 text-sm text-pending">
            Agent Wallet chưa được tạo thật (Circle chưa cấu hình xong CIRCLE_API_KEY / CIRCLE_ENTITY_SECRET /
            CIRCLE_WALLET_SET_ID) — xem docs/SETUP.md. Địa chỉ dưới đây chỉ là placeholder.
          </p>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          {/* Balance card */}
          <div className="rounded-2xl border border-ink-line bg-ink-panel p-6">
            <p className="text-xs uppercase tracking-[0.1em] text-paper/40">Balance</p>
            <p className="mt-2 font-mono text-4xl font-medium">
              {balanceUsdc.toFixed(2)} <span className="text-lg font-normal text-paper/40">USDC</span>
            </p>
            {balanceError && <p className="mt-2 text-xs text-denied">{balanceError}</p>}
            <p className="mt-3 break-all font-mono text-xs text-paper/40">{wallet.address}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="https://faucet.circle.com"
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-full bg-paper px-4 py-2.5 text-center text-sm font-medium text-ink transition hover:bg-[#c9ff5c]"
              >
                Fund via faucet
              </a>
              <a
                href={`https://testnet.arcscan.app/address/${wallet.address}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-full border border-ink-line px-4 py-2.5 text-center text-sm transition hover:border-paper/30"
              >
                View on Arcscan
              </a>
            </div>
          </div>

          {/* Policy summary */}
          <div className="rounded-2xl border border-ink-line bg-ink-panel p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.1em] text-paper/40">Policy</p>
              <Link href="/policy" className="text-xs text-confirmed hover:underline">
                Edit
              </Link>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-paper/50">Daily limit</dt>
                <dd className="font-mono">{policy?.dailyLimitUsdc ?? "-"} USDC</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-paper/50">Per-transaction limit</dt>
                <dd className="font-mono">{policy?.perTxLimitUsdc ?? "-"} USDC</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-paper/50">Approval required above</dt>
                <dd className="font-mono">{policy?.requireApprovalAboveUsdc ?? "-"} USDC</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Recent activity */}
        <div className="mt-4 rounded-2xl border border-ink-line bg-ink-panel p-6">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.1em] text-paper/40">Recent activity</p>
            <Link href="/transactions" className="text-xs text-confirmed hover:underline">
              Full audit log
            </Link>
          </div>

          {recentRows.length === 0 ? (
            <p className="mt-4 text-sm text-paper/40">
              No payments yet — go to{" "}
              <Link href="/agent" className="text-confirmed hover:underline">
                Agent
              </Link>{" "}
              to try one.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-ink-line/60">
              {recentRows.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="min-w-0 truncate text-paper/70">{row.serviceName ?? row.recipient}</span>
                  <span className="flex shrink-0 items-center gap-3 font-mono text-xs">
                    <span className="text-paper/40">{row.amountUsdc.toFixed(2)} USDC</span>
                    <span className="text-paper/50">{STATUS_LABEL[row.status] ?? row.status}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        </div>
      </main>
    </div>
  );
}
