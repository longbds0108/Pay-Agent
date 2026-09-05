import { createAgentWalletClient } from "@/lib/circle/agentWallet";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureGatewayFunded, ensureGatewayWallet } from "@/lib/agent/x402/gatewayWallet";
import { getX402ResourceUrl, type X402Resource } from "@/lib/agent/x402/resources";
import { payX402Resource } from "@/lib/agent/x402/payClient";
import { createCircleGatewaySigner } from "@/lib/agent/x402/signer";
import type { CurrentAgentContext } from "@/lib/currentAgent";
import type { Wallet } from "@/types";

/**
 * Thực thi một payment intent đã ở trạng thái "approved": chuyển sang
 * "executing", gọi Circle Agent Wallet để gửi USDC trên Arc, ghi transaction,
 * rồi chuyển sang "confirmed" hoặc "failed".
 *
 * Chỉ ví `circle_smart_account` (Google login) mới tự gửi được — backend giữ
 * quyền ký qua Circle. Ví `external_evm` cần chính user ký trong ví của họ,
 * nên MVP đánh dấu failed kèm lý do thay vì giả vờ đã gửi.
 */
export async function executePayment(params: {
  paymentIntentId: string;
  wallet: Wallet;
  recipient: string;
  amountUsdc: number;
}): Promise<{ ok: true; txHash: string } | { ok: false; error: string }> {
  const supabase = createSupabaseServerClient();
  const now = () => new Date().toISOString();

  await supabase
    .from("payment_intents")
    .update({ status: "executing", updated_at: now() })
    .eq("id", params.paymentIntentId);

  if (params.wallet.type !== "circle_smart_account" || !params.wallet.providerWalletId) {
    await supabase
      .from("payment_intents")
      .update({ status: "failed", updated_at: now() })
      .eq("id", params.paymentIntentId);

    return {
      ok: false,
      error:
        "Ví EVM ngoài cần chính bạn ký giao dịch trong ví — MVP hiện chưa hỗ trợ agent tự gửi thay cho loại ví này.",
    };
  }

  try {
    const circle = createAgentWalletClient();
    const { txHash } = await circle.sendUsdc({
      providerWalletId: params.wallet.providerWalletId,
      to: params.recipient,
      amountUsdc: params.amountUsdc,
    });

    const { error: txError } = await supabase.from("transactions").insert({
      payment_intent_id: params.paymentIntentId,
      tx_hash: txHash,
      amount_usdc: params.amountUsdc,
      network: "arc",
      confirmed_at: now(),
    });

    if (txError) throw txError;

    await supabase
      .from("payment_intents")
      .update({ status: "confirmed", updated_at: now() })
      .eq("id", params.paymentIntentId);

    return { ok: true, txHash };
  } catch (err) {
    await supabase
      .from("payment_intents")
      .update({ status: "failed", updated_at: now() })
      .eq("id", params.paymentIntentId);

    return { ok: false, error: err instanceof Error ? err.message : "Thực thi thanh toán thất bại." };
  }
}

/**
 * Thực thi thanh toán x402: đảm bảo ví Gateway tồn tại + đủ số dư, rồi gọi
 * endpoint qua `wrapFetchWithPayment` (tự xử lý 402 -> ký -> gọi lại).
 * Khác `executePayment` ở chỗ tiền đi qua Circle Gateway (gộp settlement,
 * khả thi ở mức sub-cent) thay vì một giao dịch chuyển khoản riêng lẻ.
 */
export async function executeX402Payment(params: {
  paymentIntentId: string;
  context: CurrentAgentContext;
  resource: X402Resource;
}): Promise<{ ok: true; txHash: string } | { ok: false; error: string }> {
  const supabase = createSupabaseServerClient();
  const now = () => new Date().toISOString();

  await supabase
    .from("payment_intents")
    .update({ status: "executing", updated_at: now() })
    .eq("id", params.paymentIntentId);

  if (params.context.wallet.type !== "circle_smart_account" || !params.context.wallet.providerWalletId) {
    await supabase
      .from("payment_intents")
      .update({ status: "failed", updated_at: now() })
      .eq("id", params.paymentIntentId);

    return {
      ok: false,
      error: "Thanh toán x402 hiện chỉ hỗ trợ ví Circle (đăng nhập Google), chưa hỗ trợ ví EVM ngoài.",
    };
  }

  try {
    const gatewayWallet = await ensureGatewayWallet(params.context.agentId);

    await ensureGatewayFunded({
      agentId: params.context.agentId,
      mainWalletProviderId: params.context.wallet.providerWalletId,
      gatewayWallet,
      minAvailableUsdc: params.resource.priceUsdc,
      perTxLimitUsdc: params.context.policy?.perTxLimitUsdc ?? 1,
    });

    const signer = createCircleGatewaySigner(gatewayWallet);
    const result = await payX402Resource(getX402ResourceUrl(params.resource), signer);

    if (result.status >= 400 || !result.txHash) {
      throw new Error(
        `Endpoint trả về HTTP ${result.status} và không có xác nhận settlement từ Gateway.`
      );
    }

    const { error: txError } = await supabase.from("transactions").insert({
      payment_intent_id: params.paymentIntentId,
      tx_hash: result.txHash,
      amount_usdc: params.resource.priceUsdc,
      network: "arc",
      confirmed_at: now(),
    });

    if (txError) throw txError;

    await supabase
      .from("payment_intents")
      .update({ status: "confirmed", updated_at: now() })
      .eq("id", params.paymentIntentId);

    return { ok: true, txHash: result.txHash };
  } catch (err) {
    await supabase
      .from("payment_intents")
      .update({ status: "failed", updated_at: now() })
      .eq("id", params.paymentIntentId);

    return { ok: false, error: err instanceof Error ? err.message : "Thanh toán x402 thất bại." };
  }
}
