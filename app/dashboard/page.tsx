import { redirect } from "next/navigation";
import { SupabaseSetupNotice } from "@/components/SupabaseSetupNotice";
import { createAgentWalletClient } from "@/lib/circle/agentWallet";
import { getCurrentAgentContext } from "@/lib/currentAgent";
import { isSupabaseConfigured } from "@/lib/supabase/server";

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

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Agent Wallet</h1>

      {walletPending && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Agent Wallet chưa được tạo thật (Circle chưa cấu hình xong CIRCLE_API_KEY /
          CIRCLE_ENTITY_SECRET / CIRCLE_WALLET_SET_ID) — xem docs/SETUP.md. Địa chỉ dưới đây chỉ là placeholder.
        </p>
      )}

      <div className="rounded-xl border border-slate-200 p-6 shadow-sm">
        <p className="text-3xl font-semibold">{balanceUsdc.toFixed(2)} USDC</p>
        {balanceError && <p className="mt-1 text-xs text-red-600">{balanceError}</p>}
        <p className="mt-2 break-all text-xs text-slate-500">{wallet.address}</p>

        <div className="mt-4 flex justify-between text-sm text-slate-600">
          <span>Daily limit: {policy?.dailyLimitUsdc ?? "-"} USDC</span>
          <span>Per TX limit: {policy?.perTxLimitUsdc ?? "-"} USDC</span>
        </div>

        <div className="mt-6 flex gap-3">
          <a
            href="https://faucet.circle.com"
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-center text-white"
          >
            Nạp USDC (Faucet)
          </a>
          <a
            href={`https://testnet.arcscan.app/address/${wallet.address}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-center"
          >
            Xem trên Arcscan
          </a>
        </div>
      </div>
    </main>
  );
}
