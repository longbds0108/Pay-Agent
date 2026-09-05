import { defineChain } from "viem";

/**
 * Cấu hình chain Arc Testnet cho viem.
 *
 * Giá trị mặc định lấy từ tài liệu chính thức của Arc
 * (https://docs.arc.io — trang "RPC endpoints", đọc ngày 2026-09-05):
 *   - Chain ID: 5042002
 *   - Currency: USDC (Arc dùng thẳng USDC làm gas token, decimals 6)
 *   - RPC (Circle, primary): https://rpc.testnet.arc.io
 *   - Explorer: https://testnet.arcscan.app
 *   - Faucet: https://faucet.circle.com
 *
 * Có thể override qua biến môi trường NEXT_PUBLIC_ARC_RPC_URL /
 * NEXT_PUBLIC_ARC_CHAIN_ID nếu Circle đổi endpoint hoặc bạn muốn dùng node
 * provider khác (Blockdaemon / dRPC / QuickNode / Alchemy — xem
 * docs/SETUP.md mục Arc).
 */
const DEFAULT_ARC_TESTNET_RPC_HTTP = "https://rpc.testnet.arc.io";
const DEFAULT_ARC_TESTNET_RPC_WS = "wss://rpc.testnet.arc.io";
const DEFAULT_ARC_TESTNET_CHAIN_ID = 5042002;

export const arcTestnet = defineChain({
  id: Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID ?? DEFAULT_ARC_TESTNET_CHAIN_ID),
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_ARC_RPC_URL ?? DEFAULT_ARC_TESTNET_RPC_HTTP],
      webSocket: [DEFAULT_ARC_TESTNET_RPC_WS],
    },
  },
  blockExplorers: {
    default: { name: "Arcscan", url: "https://testnet.arcscan.app" },
  },
  testnet: true,
});

/** Faucet để nạp USDC testnet cho ví trên Arc (dùng cho hướng dẫn UI/README). */
export const ARC_TESTNET_FAUCET_URL = "https://faucet.circle.com";

/** Tên blockchain dùng trong Circle Developer-Controlled Wallets API cho Arc testnet. */
export const CIRCLE_ARC_TESTNET_BLOCKCHAIN = "ARC-TESTNET" as const;
