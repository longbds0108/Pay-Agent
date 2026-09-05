import { NextResponse } from "next/server";
import { getCurrentAgentContext } from "@/lib/currentAgent";
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
    .select("id, agent_id, status")
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
      { error: `Payment intent đang ở trạng thái "${intent.status}", không thể reject.` },
      { status: 409 }
    );
  }

  assertTransition("pending_user_approval", "rejected");
  await supabase
    .from("payment_intents")
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", intent.id);

  await supabase.from("audit_log").insert({
    agent_id: context.agentId,
    payment_intent_id: intent.id,
    decision: "user_rejected",
    reason: "User từ chối thủ công qua UI.",
  });

  return NextResponse.json({ ok: true });
}
