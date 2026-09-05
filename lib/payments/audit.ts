import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AuditRow {
  id: string;
  recipient: string;
  serviceName: string | null;
  amountUsdc: number;
  reason: string | null;
  status: string;
  createdAt: string;
  txHash: string | null;
  confirmedAt: string | null;
  /** Quyết định policy gần nhất cho payment intent này (audit_log.decision). */
  policyDecision: string | null;
  policyReason: string | null;
}

export interface ServiceSpend {
  label: string;
  totalUsdc: number;
  count: number;
}

export interface AuditReport {
  totalSpentUsdc: number;
  confirmedCount: number;
  autoApprovedCount: number;
  requireApprovalCount: number;
  rejectedCount: number;
  byService: ServiceSpend[];
  rows: AuditRow[];
}

/**
 * Báo cáo chi tiêu + audit trail của agent: mỗi payment intent kèm quyết
 * định policy gần nhất (audit_log) và tên service (nếu có) — trả lời đúng
 * "agent đã dùng bao nhiêu tiền, cho API/contract nào, có tuân thủ policy
 * không". Gộp từ payment_intents + audit_log + services, không cần bảng mới.
 */
export async function getAuditReport(agentId: string): Promise<AuditReport> {
  const supabase = createSupabaseServerClient();

  const { data: intents, error: intentsError } = await supabase
    .from("payment_intents")
    .select(
      "id, recipient, amount_usdc, reason, status, created_at, services(name), transactions(tx_hash, confirmed_at)"
    )
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false });

  if (intentsError) throw intentsError;

  const { data: auditLog, error: auditError } = await supabase
    .from("audit_log")
    .select("payment_intent_id, decision, reason, created_at")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: true });

  if (auditError) throw auditError;

  // Quyết định gần nhất cho mỗi payment_intent — audit_log có thể có nhiều
  // dòng/intent (policy_check ban đầu, rồi user_approved/user_rejected sau).
  const latestDecisionByIntent = new Map<string, { decision: string; reason: string | null }>();
  for (const entry of auditLog ?? []) {
    const intentId = entry.payment_intent_id as string | null;
    if (!intentId) continue;
    latestDecisionByIntent.set(intentId, {
      decision: entry.decision as string,
      reason: (entry.reason as string | null) ?? null,
    });
  }

  const spendByLabel = new Map<string, ServiceSpend>();
  let totalSpentUsdc = 0;
  let confirmedCount = 0;
  let autoApprovedCount = 0;
  let requireApprovalCount = 0;
  let rejectedCount = 0;

  const rows: AuditRow[] = (intents ?? []).map((row) => {
    const amountUsdc = Number(row.amount_usdc);
    const service = row.services as unknown as { name: string } | null;
    const transactions = row.transactions as unknown as { tx_hash: string; confirmed_at: string | null }[] | null;
    const tx = transactions?.[0] ?? null;
    const status = row.status as string;
    const decisionEntry = latestDecisionByIntent.get(row.id as string) ?? null;
    const label = service?.name ?? (row.recipient as string);

    if (status === "confirmed") {
      totalSpentUsdc += amountUsdc;
      confirmedCount += 1;
      const existing = spendByLabel.get(label) ?? { label, totalUsdc: 0, count: 0 };
      existing.totalUsdc += amountUsdc;
      existing.count += 1;
      spendByLabel.set(label, existing);
    }

    if (decisionEntry?.decision === "auto_approve") autoApprovedCount += 1;
    if (decisionEntry?.decision === "require_approval") requireApprovalCount += 1;
    if (decisionEntry?.decision === "deny" || status === "rejected") rejectedCount += 1;

    return {
      id: row.id as string,
      recipient: row.recipient as string,
      serviceName: service?.name ?? null,
      amountUsdc,
      reason: (row.reason as string | null) ?? null,
      status,
      createdAt: row.created_at as string,
      txHash: tx?.tx_hash ?? null,
      confirmedAt: tx?.confirmed_at ?? null,
      policyDecision: decisionEntry?.decision ?? null,
      policyReason: decisionEntry?.reason ?? null,
    };
  });

  const byService = Array.from(spendByLabel.values()).sort((a, b) => b.totalUsdc - a.totalUsdc);

  return {
    totalSpentUsdc,
    confirmedCount,
    autoApprovedCount,
    requireApprovalCount,
    rejectedCount,
    byService,
    rows,
  };
}
