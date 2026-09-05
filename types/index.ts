export type LoginMethod = "google" | "evm";

export type WalletType = "circle_smart_account" | "external_evm";

export interface Wallet {
  id: string;
  userId: string;
  type: WalletType;
  address: string;
  /** Circle Developer-Controlled Wallets internal wallet id. Null for external_evm. */
  providerWalletId: string | null;
}

export interface Agent {
  id: string;
  userId: string;
  walletId: string;
  name: string;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  priceUsdc: number;
  recipientAddress: string;
}

export interface SpendingPolicy {
  id: string;
  agentId: string;
  dailyLimitUsdc: number;
  perTxLimitUsdc: number;
  allowedToken: "USDC";
  allowedNetwork: "arc";
  requireApprovalAboveUsdc: number;
  allowedRecipients: string[] | "any";
}

export type PaymentIntentStatus =
  | "created"
  | "policy_check"
  | "pending_user_approval"
  | "approved"
  | "rejected"
  | "executing"
  | "confirmed"
  | "failed";

export interface PaymentIntent {
  id: string;
  agentId: string;
  recipient: string;
  amountUsdc: number;
  reason: string;
  status: PaymentIntentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  paymentIntentId: string;
  txHash: string;
  amountUsdc: number;
  network: "arc";
  confirmedAt: string | null;
}

export interface PolicyDecision {
  decision: "auto_approve" | "require_approval" | "deny";
  reason: string;
}
