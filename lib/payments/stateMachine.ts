import type { PaymentIntentStatus } from "@/types";

const ALLOWED_TRANSITIONS: Record<PaymentIntentStatus, PaymentIntentStatus[]> = {
  created: ["policy_check"],
  policy_check: ["approved", "pending_user_approval", "rejected"],
  pending_user_approval: ["approved", "rejected"],
  approved: ["executing"],
  rejected: [],
  executing: ["confirmed", "failed"],
  confirmed: [],
  failed: [],
};

export function canTransition(from: PaymentIntentStatus, to: PaymentIntentStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: PaymentIntentStatus, to: PaymentIntentStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid payment intent transition: ${from} -> ${to}`);
  }
}
