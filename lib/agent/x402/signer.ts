import type { BatchEvmSigner } from "@circle-fin/x402-batching";
import { createAgentWalletClient } from "@/lib/circle/agentWallet";
import type { GatewayWalletInfo } from "./gatewayWallet";

/**
 * Adapter biến ví Gateway (Circle Developer-Controlled EOA wallet) thành
 * `BatchEvmSigner` mà `@circle-fin/x402-batching` cần — SDK tự lo phần dựng
 * domain/types EIP-712 đúng chuẩn Gateway (xem BatchEvmScheme trong SDK),
 * ta chỉ cần cung cấp hàm `signTypedData` thật. Không có private key thô
 * nào xuất hiện trong tiến trình này — chữ ký được Circle ký hộ.
 */
export function createCircleGatewaySigner(wallet: GatewayWalletInfo): BatchEvmSigner {
  const circle = createAgentWalletClient();

  return {
    address: wallet.address,
    async signTypedData(params) {
      return circle.signTypedData(wallet.providerWalletId, params);
    },
  };
}
