import { NextResponse } from "next/server";
import type { AgentChatMessage } from "@/lib/agent/deepseek";
import { runAgentTurn } from "@/lib/agent/deepseek";
import { listServices } from "@/lib/agent/services";
import { getCurrentAgentContext } from "@/lib/currentAgent";
import { createAndProcessPaymentIntent } from "@/lib/payments/pipeline";

/**
 * Nhận tin nhắn của user, để AI model (DeepSeek) hiểu payment intent (dịch
 * vụ, số tiền) trong phạm vi danh mục services, sau đó chạy policy engine để
 * auto-approve / yêu cầu duyệt / từ chối, và thực thi luôn nếu auto-approve.
 */
export async function POST(request: Request) {
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
  const turn = await runAgentTurn({ message, history, services });

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
