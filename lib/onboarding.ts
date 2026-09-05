import { createAgentWalletClient } from "@/lib/circle/agentWallet";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LoginMethod } from "@/types";

type SupabaseServerClient = ReturnType<typeof createSupabaseServerClient>;

export interface OnboardResult {
  agentId: string;
  walletId: string;
  walletAddress: string;
  /** Lỗi (nếu có) khi tạo Circle smart account — không chặn onboarding, chỉ để dashboard hiển thị banner. */
  walletSetupError: string | null;
}

/**
 * Đảm bảo user hiện tại (đã có Supabase auth session) có đủ: users row,
 * 1 wallet, 1 agent, 1 spending_policy mặc định. Gọi ngay sau khi đăng nhập
 * lần đầu (Google OAuth callback, hoặc sau signInWithWeb3 cho ví EVM).
 *
 * Idempotent: nếu agent đã tồn tại, trả về luôn thông tin cũ, không tạo lại.
 */
export async function ensureOnboarded(
  supabase: SupabaseServerClient,
  userId: string,
  loginMethod: LoginMethod,
  evmAddress?: string
): Promise<OnboardResult> {
  const { data: existingAgent, error: existingAgentError } = await supabase
    .from("agents")
    .select("id, wallet_id, wallets(address)")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingAgentError) throw existingAgentError;

  if (existingAgent) {
    const walletRow = existingAgent.wallets as unknown as { address: string } | null;
    return {
      agentId: existingAgent.id as string,
      walletId: existingAgent.wallet_id as string,
      walletAddress: walletRow?.address ?? "",
      walletSetupError: null,
    };
  }

  const { data: existingUser, error: existingUserError } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (existingUserError) throw existingUserError;

  if (!existingUser) {
    const { error } = await supabase.from("users").insert({ id: userId, login_method: loginMethod });
    if (error) throw error;
  }

  let walletAddress = "";
  let providerWalletId: string | null = null;
  let walletSetupError: string | null = null;
  const walletType = loginMethod === "google" ? "circle_smart_account" : "external_evm";

  if (loginMethod === "google") {
    try {
      const circle = createAgentWalletClient();
      const result = await circle.createSmartAccount(userId);
      walletAddress = result.address;
      providerWalletId = result.providerWalletId;
    } catch (err) {
      // Chưa cấu hình xong Circle (thiếu API key/entity secret/wallet set) —
      // không chặn tạo tài khoản, chỉ ghi nhận lỗi để dashboard nhắc user.
      walletSetupError = err instanceof Error ? err.message : "Không tạo được Agent Wallet.";
    }
  } else {
    if (!evmAddress) {
      throw new Error("Thiếu địa chỉ ví EVM khi onboarding user đăng nhập bằng ví.");
    }
    walletAddress = evmAddress;
  }

  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .insert({
      user_id: userId,
      type: walletType,
      address: walletAddress || `pending-${userId}`,
      provider_wallet_id: providerWalletId,
    })
    .select("id, address")
    .single();

  if (walletError) throw walletError;

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .insert({ user_id: userId, wallet_id: wallet.id, name: "My Agent" })
    .select("id")
    .single();

  if (agentError) throw agentError;

  const { error: policyError } = await supabase.from("spending_policies").insert({ agent_id: agent.id });
  if (policyError) throw policyError;

  return {
    agentId: agent.id as string,
    walletId: wallet.id as string,
    walletAddress: wallet.address as string,
    walletSetupError,
  };
}
