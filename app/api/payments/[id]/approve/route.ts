import { NextResponse } from "next/server";
import { getCurrentAgentContext } from "@/lib/currentAgent";
import { executePayment } from "@/lib/payments/execute";
import { assertTransition } from "@/lib/payments/stateMachine";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const context = await getCurrentAgentContext();
  if (!context) {
    return NextResponse.json({ error: "Chưa đăng nhập hoặc chưa onboard xong." }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();
  const { data: intent, error } = await supabase
    .from("payment_intents")
    .select("id, agent_id, recipient, amount_usdc, status")
    .eq("id", params.id)
    .single();

  if (error || !intent) {
    return NextResponse.json({ error: "Không tìm thấy payment intent." }, { status: 404 });
  }

  if (intent.agent_id !== context.agentId) {
    return NextResponse.json({ error: "Không có quyền với payment intent này." }, { status: 403 });
  }

  if (intent.status !== "pending_user_approval") {
    return NextResponse.json(
      { error: `Payment intent đang ở trạng thái "${intent.status}", không thể approve.` },
      { status: 409 }
    );
  }

  assertTransition("pending_user_approval", "approved");
  await supabase
    .from("payment_intents")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("id", intent.id);

  await supabase.from("audit_log").insert({
    agent_id: context.agentId,
    payment_intent_id: intent.id,
    decision: "user_approved",
    reason: "User duyệt thủ công qua UI.",
  });

  const result = await executePayment({
    paymentIntentId: intent.id as string,
    wallet: context.wallet,
    recipient: intent.recipient as string,
    amountUsdc: Number(intent.amount_usdc),
  });

  if (result.ok) {
    return NextResponse.json({ ok: true, txHash: result.txHash });
  }
  return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
}
