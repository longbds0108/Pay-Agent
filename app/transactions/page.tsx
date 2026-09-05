import { redirect } from "next/navigation";
import { SupabaseSetupNotice } from "@/components/SupabaseSetupNotice";
import { getCurrentAgentContext } from "@/lib/currentAgent";
import { listPaymentsForAgent } from "@/lib/payments/list";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const STATUS_LABEL: Record<string, string> = {
  created: "Đang tạo",
  policy_check: "Đang kiểm tra policy",
  pending_user_approval: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Đã từ chối",
  executing: "Đang thực thi",
  confirmed: "Thành công",
  failed: "Thất bại",
};

export default async function TransactionsPage() {
  if (!isSupabaseConfigured()) return <SupabaseSetupNotice />;

  const context = await getCurrentAgentContext();
  if (!context) redirect("/login");

  const payments = await listPaymentsForAgent(context.agentId);

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Payment History</h1>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2">Recipient</th>
              <th className="py-2">Amount</th>
              <th className="py-2">Status</th>
              <th className="py-2">Tx</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-400">
                  Chưa có giao dịch nào.
                </td>
              </tr>
            )}
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-slate-100">
                <td className="max-w-[10rem] truncate py-2" title={p.recipient}>
                  {p.recipient}
                </td>
                <td className="py-2">{p.amountUsdc.toFixed(2)} USDC</td>
                <td className="py-2">{STATUS_LABEL[p.status] ?? p.status}</td>
                <td className="py-2">
                  {p.txHash ? (
                    <a
                      className="text-slate-900 underline"
                      href={`https://testnet.arcscan.app/tx/${p.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Xem
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
