import type { CurrentAgentContext } from "@/lib/currentAgent";
import { getSpentTodayUsdc } from "@/lib/currentAgent";
import { getX402ResourceUrl, type X402Resource } from "@/lib/agent/x402/resources";
import { evaluatePaymentIntent } from "@/lib/policy/engine";
import { executePayment, executeX402Payment } from "@/lib/payments/execute";
import { assertTransition } from "@/lib/payments/stateMachine";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PolicyDecision } from "@/types";

export interface PipelineResult {
  paymentIntentId: string;
  decision: PolicyDecision;
  txHash?: string;
  executionError?: string;
}

export type ExecuteStep = (paymentIntentId: string) => Promise<
  { ok: true; txHash: string } | { ok: false; error: string }
>;

/**
 * Tạo payment intent mới và chạy hết luồng: created -> policy_check ->
 * (rejected | pending_user_approval | approved -> executing -> confirmed/failed).
 * Dùng chung cho cả agent chat (/api/agent) và tạo thủ công (/api/payments).
 *
 * `execute` là bước thực thi khi được duyệt — tách ra để thanh toán x402
 * (qua Circle Gateway) đi qua ĐÚNG một policy engine như chuyển khoản trực
 * tiếp, thay vì có đường vòng riêng không bị policy kiểm soát.
 */
async function runPaymentPipeline(params: {
  context: CurrentAgentContext;
  serviceId: string | null;
  recipient: string;
  amountUsdc: number;
  reason: string;
  execute: ExecuteStep;
}): Promise<PipelineResult> {
  const supabase = createSupabaseServerClient();
  const now = () => new Date().toISOString();

  const { data: intent, error: insertError } = await supabase
    .from("payment_intents")
    .insert({
      agent_id: params.context.agentId,
      service_id: params.serviceId,
      recipient: params.recipient,
      amount_usdc: params.amountUsdc,
      reason: params.reason,
      status: "created",
    })
    .select("id")
    .single();

  if (insertError) throw insertError;
  const paymentIntentId = intent.id as string;

  assertTransition("created", "policy_check");
  await supabase
    .from("payment_intents")
    .update({ status: "policy_check", updated_at: now() })
    .eq("id", paymentIntentId);

  const policy = params.context.policy;
  let decision: PolicyDecision;

  if (!policy) {
    decision = { decision: "deny", reason: "Chưa cấu hình spending policy cho agent này." };
  } else {
    const spentToday = await getSpentTodayUsdc(params.context.agentId);
    decision = evaluatePaymentIntent(
      { recipient: params.recipient, amountUsdc: params.amountUsdc },
      policy,
      spentToday
    );
  }

  await supabase.from("audit_log").insert({
    agent_id: params.context.agentId,
    payment_intent_id: paymentIntentId,
    decision: decision.decision,
    reason: decision.reason,
  });

  if (decision.decision === "deny") {
    assertTransition("policy_check", "rejected");
    await supabase
      .from("payment_intents")
      .update({ status: "rejected", updated_at: now() })
      .eq("id", paymentIntentId);
    return { paymentIntentId, decision };
  }

  if (decision.decision === "require_approval") {
    assertTransition("policy_check", "pending_user_approval");
    await supabase
      .from("payment_intents")
      .update({ status: "pending_user_approval", updated_at: now() })
      .eq("id", paymentIntentId);
    return { paymentIntentId, decision };
  }

  assertTransition("policy_check", "approved");
  await supabase
    .from("payment_intents")
    .update({ status: "approved", updated_at: now() })
    .eq("id", paymentIntentId);

  const execResult = await params.execute(paymentIntentId);

  if (execResult.ok) {
    return { paymentIntentId, decision, txHash: execResult.txHash };
  }
  return { paymentIntentId, decision, executionError: execResult.error };
}

/** Thanh toán thường: chuyển USDC trực tiếp từ ví agent tới địa chỉ nhận. */
export async function createAndProcessPaymentIntent(params: {
  context: CurrentAgentContext;
  serviceId: string | null;
  recipient: string;
  amountUsdc: number;
  reason: string;
}): Promise<PipelineResult> {
  return runPaymentPipeline({
    ...params,
    execute: (paymentIntentId) =>
      executePayment({
        paymentIntentId,
        wallet: params.context.wallet,
        recipient: params.recipient,
        amountUsdc: params.amountUsdc,
      }),
  });
}

/**
 * Thanh toán x402: gọi endpoint trả phí qua Circle Gateway (nanopayment,
 * gasless, gộp settlement). Vẫn qua đúng policy engine ở trên — chỉ khác
 * bước thực thi.
 */
export async function createAndProcessX402PaymentIntent(params: {
  context: CurrentAgentContext;
  resource: X402Resource;
}): Promise<PipelineResult> {
  return runPaymentPipeline({
    context: params.context,
    serviceId: null,
    recipient: getX402ResourceUrl(params.resource),
    amountUsdc: params.resource.priceUsdc,
    reason: `x402 · ${params.resource.name}`,
    execute: (paymentIntentId) =>
      executeX402Payment({
        paymentIntentId,
        context: params.context,
        resource: params.resource,
      }),
  });
}
