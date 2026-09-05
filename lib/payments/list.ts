import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface PaymentRow {
  id: string;
  recipient: string;
  amountUsdc: number;
  reason: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  txHash: string | null;
  confirmedAt: string | null;
}

/** Payment intents + transaction (nếu có) của một agent, mới nhất trước. */
export async function listPaymentsForAgent(agentId: string): Promise<PaymentRow[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("payment_intents")
    .select("id, recipient, amount_usdc, reason, status, created_at, updated_at, transactions(tx_hash, confirmed_at)")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const transactions = row.transactions as unknown as { tx_hash: string; confirmed_at: string | null }[] | null;
    const tx = transactions?.[0] ?? null;

    return {
      id: row.id as string,
      recipient: row.recipient as string,
      amountUsdc: Number(row.amount_usdc),
      reason: (row.reason as string | null) ?? null,
      status: row.status as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      txHash: tx?.tx_hash ?? null,
      confirmedAt: tx?.confirmed_at ?? null,
    };
  });
}
