import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAgentContext } from "@/lib/currentAgent";
import { createAndProcessPaymentIntent } from "@/lib/payments/pipeline";
import { listPaymentsForAgent } from "@/lib/payments/list";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const manualIntentSchema = z.object({
  recipient: z.string().min(1),
  amountUsdc: z.number().positive(),
  reason: z.string().min(1),
  serviceId: z.string().uuid().nullable().optional(),
});

const NOT_CONFIGURED_RESPONSE = () =>
  NextResponse.json({ error: "Chưa cấu hình Supabase — xem docs/SETUP.md mục 1." }, { status: 503 });

export async function GET() {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED_RESPONSE();

  const context = await getCurrentAgentContext();
  if (!context) {
    return NextResponse.json({ error: "Chưa đăng nhập hoặc chưa onboard xong." }, { status: 401 });
  }

  const payments = await listPaymentsForAgent(context.agentId);
  return NextResponse.json({ payments });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED_RESPONSE();

  const context = await getCurrentAgentContext();
  if (!context) {
    return NextResponse.json({ error: "Chưa đăng nhập hoặc chưa onboard xong." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = manualIntentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await createAndProcessPaymentIntent({
    context,
    serviceId: parsed.data.serviceId ?? null,
    recipient: parsed.data.recipient,
    amountUsdc: parsed.data.amountUsdc,
    reason: parsed.data.reason,
  });

  return NextResponse.json({ ok: true, ...result });
}
