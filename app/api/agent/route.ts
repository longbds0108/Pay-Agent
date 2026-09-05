import { NextResponse } from "next/server";
import type { AgentChatMessage } from "@/lib/agent/deepseek";
import { runAgentTurn } from "@/lib/agent/deepseek";
import { listServices } from "@/lib/agent/services";
import { X402_DEMO_RESOURCES } from "@/lib/agent/x402/resources";
import { getCurrentAgentContext } from "@/lib/currentAgent";
import { createAndProcessPaymentIntent, createAndProcessX402PaymentIntent } from "@/lib/payments/pipeline";
import { isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * Nhận tin nhắn của user, để AI model (DeepSeek) hiểu payment intent (dịch
 * vụ, số tiền) trong phạm vi danh mục services, sau đó chạy policy engine để
 * auto-approve / yêu cầu duyệt / từ chối, và thực thi luôn nếu auto-approve.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Chưa cấu hình Supabase — xem docs/SETUP.md mục 1." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const message = body.message;
  const history: AgentChatMessage[] = Array.isArray(body.history) ? body.history : [];

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const context = await getCurrentAgentContext();
  if (!context) {
    return NextResponse.json(
      { error: "Chưa đăng nhập hoặc chưa hoàn tất onboarding (xem /dashboard)." },
      { status: 401 }
    );
  }

  const services = await listServices();
  const turn = await runAgentTurn({ message, history, services, x402Resources: X402_DEMO_RESOURCES });

  if (turn.x402Intent) {
    const resource = X402_DEMO_RESOURCES.find((r) => r.id === turn.x402Intent?.resourceId);

    if (resource) {
      const result = await createAndProcessX402PaymentIntent({ context, resource });

      return NextResponse.json({
        reply: turn.reply,
        intent: { kind: "x402", resourceId: resource.id, amountUsdc: resource.priceUsdc },
        paymentIntentId: result.paymentIntentId,
        decision: result.decision,
        txHash: result.txHash,
        executionError: result.executionError,
      });
    }
  }

  if (!turn.intent) {
    return NextResponse.json({ reply: turn.reply, intent: null });
  }

  const result = await createAndProcessPaymentIntent({
    context,
    serviceId: turn.intent.serviceId,
    recipient: turn.intent.recipient,
    amountUsdc: turn.intent.amountUsdc,
    reason: turn.intent.reason,
  });

  return NextResponse.json({
    reply: turn.reply,
    intent: turn.intent,
    paymentIntentId: result.paymentIntentId,
    decision: result.decision,
    txHash: result.txHash,
    executionError: result.executionError,
  });
}
