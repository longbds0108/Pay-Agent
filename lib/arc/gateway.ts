/**
 * Hằng số Circle Gateway trên Arc Testnet — lấy trực tiếp từ mã nguồn đã
 * biên dịch của `@circle-fin/x402-batching@3.4.0` (đọc file dist/client/*.mjs
 * thật, không suy đoán), vì các giá trị này không có trong file .d.ts (chỉ
 * khai báo kiểu, không có giá trị runtime).
 *
 * Dùng lại các hằng số này thay vì `GatewayClient` của SDK vì `GatewayClient`
 * bắt buộc truyền `privateKey` thô — không phù hợp với AgentPay (agent không
 * bao giờ cầm private key). Ta tự gọi các hợp đồng này qua
 * `AgentWalletClient.executeContractCall` (Circle Developer-Controlled
 * Wallets), và dùng `BatchEvmScheme` (từ chính SDK, không tự viết lại phần
 * ký EIP-712) cho phần thanh toán — xem lib/agent/x402/.
 */

/** Địa chỉ USDC trên Arc Testnet dùng cho tương tác kiểu ERC-20 (approve/allowance). */
export const ARC_TESTNET_USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as const;

/** Hợp đồng Gateway Wallet dùng chung cho mọi testnet (kể cả Arc Testnet). */
export const GATEWAY_WALLET_TESTNET_ADDRESS = "0x0077777d7EBA4688BDeF3E311b846F25870A19B9" as const;

/** Circle Gateway domain id cho Arc Testnet (dùng trong EIP-712 domain khi ký uỷ quyền). */
export const ARC_TESTNET_GATEWAY_DOMAIN = 26;

/** Network id kiểu CAIP-2 cho Arc Testnet, dùng bởi @x402/core (chain id 5042002). */
export const ARC_TESTNET_X402_NETWORK = "eip155:5042002";

/** Gateway facilitator API cho môi trường testnet. */
export const GATEWAY_FACILITATOR_TESTNET_URL = "https://gateway-api-testnet.circle.com";

/** ABI tối thiểu của GatewayWallet cần dùng: deposit(token, value). */
export const GATEWAY_WALLET_DEPOSIT_SIGNATURE = "deposit(address,uint256)";

/** ABI chuẩn ERC-20 cho approve/allowance/balanceOf (USDC trên Arc). */
export const ERC20_APPROVE_SIGNATURE = "approve(address,uint256)";
