import type { PaymentIntent, PolicyDecision, SpendingPolicy } from "@/types";

/**
 * Đánh giá một payment intent theo spending policy hiện tại của agent.
 * Đây là phần "wow factor" của AgentPay: agent AI không bao giờ tự ý chi
 * tiêu vượt phạm vi mà user đã cấu hình tường minh.
 *
 * spentTodayUsdc: tổng đã chi trong ngày (tính từ transactions đã confirmed),
 * do caller tính trước và truyền vào để engine này thuần logic, dễ test.
 */
export function evaluatePaymentIntent(
  intent: Pick<PaymentIntent, "recipient" | "amountUsdc">,
  policy: SpendingPolicy,
  spentTodayUsdc: number
): PolicyDecision {
  if (policy.allowedRecipients !== "any" && !policy.allowedRecipients.includes(intent.recipient)) {
    return { decision: "deny", reason: "Recipient not in allowed list" };
  }

  if (intent.amountUsdc > policy.perTxLimitUsdc) {
    return {
      decision: "deny",
      reason: `Amount ${intent.amountUsdc} exceeds per-transaction limit ${policy.perTxLimitUsdc}`,
    };
  }

  if (spentTodayUsdc + intent.amountUsdc > policy.dailyLimitUsdc) {
    return {
      decision: "deny",
      reason: `Amount would exceed daily limit ${policy.dailyLimitUsdc}`,
    };
  }

  if (intent.amountUsdc > policy.requireApprovalAboveUsdc) {
    return {
      decision: "require_approval",
      reason: `Amount ${intent.amountUsdc} is above auto-approve threshold ${policy.requireApprovalAboveUsdc}`,
    };
  }

  return { decision: "auto_approve", reason: "Within policy limits" };
}
