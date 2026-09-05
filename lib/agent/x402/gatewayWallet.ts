import { createPublicClient, erc20Abi, formatUnits, http, parseUnits } from "viem";
import { arcTestnet } from "@/lib/arc/chain";
import {
  ARC_TESTNET_USDC_ADDRESS,
  ERC20_APPROVE_SIGNATURE,
  GATEWAY_WALLET_DEPOSIT_SIGNATURE,
  GATEWAY_WALLET_TESTNET_ADDRESS,
} from "@/lib/arc/gateway";
import { createAgentWalletClient } from "@/lib/circle/agentWallet";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface GatewayWalletInfo {
  providerWalletId: string;
  address: `0x${string}`;
}

const GATEWAY_WALLET_READ_ABI = [
  {
    name: "availableBalance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "token", type: "address" },
      { name: "depositor", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });

/**
 * Đảm bảo agent có 1 ví EOA riêng cho Circle Gateway (x402 nanopayments) —
 * tạo mới lần đầu (khi agent thực sự cần thanh toán x402), tái sử dụng cho
 * các lần sau. Vẫn là Circle Developer-Controlled Wallet (custody hoàn toàn
 * qua Circle), không phải ví do app tự giữ key.
 */
export async function ensureGatewayWallet(agentId: string): Promise<GatewayWalletInfo> {
  const supabase = createSupabaseServerClient();

  const { data: agentRow, error: agentError } = await supabase
    .from("agents")
    .select("user_id, gateway_wallet_id")
    .eq("id", agentId)
    .single();

  if (agentError) throw agentError;

  if (agentRow.gateway_wallet_id) {
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("provider_wallet_id, address")
      .eq("id", agentRow.gateway_wallet_id)
      .single();

    if (walletError) throw walletError;
    if (!wallet.provider_wallet_id) {
      throw new Error("Gateway wallet trong DB thiếu provider_wallet_id — dữ liệu không hợp lệ.");
    }

    return { providerWalletId: wallet.provider_wallet_id, address: wallet.address as `0x${string}` };
  }

  const circle = createAgentWalletClient();
  const created = await circle.createEoaWallet(`gateway-${agentId}`);

  const { data: walletRow, error: insertError } = await supabase
    .from("wallets")
    .insert({
      user_id: agentRow.user_id,
      type: "circle_gateway_eoa",
      address: created.address,
      provider_wallet_id: created.providerWalletId,
    })
    .select("id")
    .single();

  if (insertError) throw insertError;

  const { error: updateError } = await supabase
    .from("agents")
    .update({ gateway_wallet_id: walletRow.id })
    .eq("id", agentId);

  if (updateError) throw updateError;

  return { providerWalletId: created.providerWalletId, address: created.address as `0x${string}` };
}

/** Số dư USDC đã nạp vào Circle Gateway (khả dụng để ký uỷ quyền), đọc trực tiếp on-chain. */
export async function getGatewayAvailableBalanceUsdc(address: `0x${string}`): Promise<number> {
  const raw = await publicClient.readContract({
    address: GATEWAY_WALLET_TESTNET_ADDRESS,
    abi: GATEWAY_WALLET_READ_ABI,
    functionName: "availableBalance",
    args: [ARC_TESTNET_USDC_ADDRESS, address],
  });

  return Number(formatUnits(raw, 6));
}

/**
 * Nạp USDC từ số dư ví (đã có sẵn on-chain) vào Circle Gateway: approve
 * (nếu cần) rồi deposit — cả hai đều gọi qua Circle (executeContractCall),
 * không dùng private key thô. Theo đúng thứ tự mà `GatewayClient.deposit()`
 * thật của Circle làm (đọc từ mã nguồn đã biên dịch của SDK).
 */
export async function depositToGateway(
  wallet: GatewayWalletInfo,
  amountUsdc: number
): Promise<{ approveTxHash?: string; depositTxHash: string }> {
  const circle = createAgentWalletClient();
  const amountAtomic = parseUnits(amountUsdc.toFixed(6), 6);

  const allowance = await publicClient.readContract({
    address: ARC_TESTNET_USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: [wallet.address, GATEWAY_WALLET_TESTNET_ADDRESS],
  });

  let approveTxHash: string | undefined;
  if (allowance < amountAtomic) {
    const result = await circle.executeContractCall({
      providerWalletId: wallet.providerWalletId,
      contractAddress: ARC_TESTNET_USDC_ADDRESS,
      abiFunctionSignature: ERC20_APPROVE_SIGNATURE,
      abiParameters: [GATEWAY_WALLET_TESTNET_ADDRESS, amountAtomic.toString()],
    });
    approveTxHash = result.txHash;
  }

  const depositResult = await circle.executeContractCall({
    providerWalletId: wallet.providerWalletId,
    contractAddress: GATEWAY_WALLET_TESTNET_ADDRESS,
    abiFunctionSignature: GATEWAY_WALLET_DEPOSIT_SIGNATURE,
    abiParameters: [ARC_TESTNET_USDC_ADDRESS, amountAtomic.toString()],
  });

  return { approveTxHash, depositTxHash: depositResult.txHash };
}

/**
 * Đảm bảo Gateway wallet có đủ số dư khả dụng cho 1 khoản thanh toán x402.
 * Nếu thiếu: chuyển thêm USDC từ ví chính (smart account) sang ví Gateway
 * rồi deposit. Đây là điều chuyển nội bộ giữa 2 ví CỦA CÙNG MỘT USER (tiền
 * không rời khỏi custody của Circle), nên không chạy qua policy engine đầy
 * đủ như thanh toán cho bên thứ ba — nhưng vẫn giới hạn số tiền chuyển mỗi
 * lần không vượt quá per-tx limit hiện tại, để không âm thầm phá vỡ tinh
 * thần của policy đã cấu hình.
 */
export async function ensureGatewayFunded(params: {
  agentId: string;
  mainWalletProviderId: string;
  gatewayWallet: GatewayWalletInfo;
  minAvailableUsdc: number;
  perTxLimitUsdc: number;
}): Promise<void> {
  const available = await getGatewayAvailableBalanceUsdc(params.gatewayWallet.address);
  if (available >= params.minAvailableUsdc) return;

  const topUpUsdc = Math.min(Math.max(params.minAvailableUsdc * 5, 0.5), params.perTxLimitUsdc);

  const circle = createAgentWalletClient();
  await circle.sendUsdc({
    providerWalletId: params.mainWalletProviderId,
    to: params.gatewayWallet.address,
    amountUsdc: topUpUsdc,
  });

  await depositToGateway(params.gatewayWallet, topUpUsdc);
}
