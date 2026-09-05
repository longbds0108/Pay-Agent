import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SpendingPolicy, Wallet, WalletType } from "@/types";

export interface CurrentAgentContext {
  userId: string;
  agentId: string;
  wallet: Wallet;
  policy: SpendingPolicy | null;
}

/**
 * Lấy agent (1-1 với user, đúng scope MVP) + wallet + policy của user hiện
 * tại (theo Supabase auth session trong cookie). Trả về null nếu chưa đăng
 * nhập hoặc chưa onboard xong (ví dụ Circle chưa cấu hình nên chưa tạo được agent).
 *
 * Query từng bảng riêng (không dùng embed quan hệ 1-1 lồng nhau) để tránh
 * PostgREST trả về object hay array tuỳ version khi embed theo chiều "has-one".
 */
export async function getCurrentAgentContext(): Promise<CurrentAgentContext | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: agentRow, error: agentError } = await supabase
    .from("agents")
    .select("id, wallet_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (agentError) throw agentError;
  if (!agentRow) return null;

  const { data: walletRow, error: walletError } = await supabase
    .from("wallets")
    .select("id, user_id, type, address, provider_wallet_id")
    .eq("id", agentRow.wallet_id)
    .single();

  if (walletError) throw walletError;

  const { data: policyRow, error: policyError } = await supabase
    .from("spending_policies")
    .select("*")
    .eq("agent_id", agentRow.id)
    .maybeSingle();

  if (policyError) throw policyError;

  const wallet: Wallet = {
    id: walletRow.id as string,
    userId: walletRow.user_id as string,
    type: walletRow.type as WalletType,
    address: walletRow.address as string,
    providerWalletId: (walletRow.provider_wallet_id as string | null) ?? null,
  };

  const policy: SpendingPolicy | null = policyRow
    ? {
        id: policyRow.id as string,
        agentId: policyRow.agent_id as string,
        dailyLimitUsdc: Number(policyRow.daily_limit_usdc),
        perTxLimitUsdc: Number(policyRow.per_tx_limit_usdc),
        allowedToken: policyRow.allowed_token,
        allowedNetwork: policyRow.allowed_network,
        requireApprovalAboveUsdc: Number(policyRow.require_approval_above_usdc),
        allowedRecipients: policyRow.allowed_recipients,
      }
    : null;

  return { userId: user.id, agentId: agentRow.id as string, wallet, policy };
}

/** Tổng USDC đã chi (transactions đã confirmed) trong ngày hôm nay, theo giờ server. */
export async function getSpentTodayUsdc(agentId: string): Promise<number> {
  const supabase = createSupabaseServerClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data: intentIds, error: intentError } = await supabase
    .from("payment_intents")
    .select("id")
    .eq("agent_id", agentId);

  if (intentError) throw intentError;

  const ids = (intentIds ?? []).map((row) => row.id as string);
  if (ids.length === 0) return 0;

  const { data, error } = await supabase
    .from("transactions")
    .select("amount_usdc, confirmed_at, payment_intent_id")
    .in("payment_intent_id", ids)
    .not("confirmed_at", "is", null)
    .gte("confirmed_at", startOfDay.toISOString());

  if (error) throw error;

  return (data ?? []).reduce((sum, row) => sum + Number(row.amount_usdc), 0);
}
