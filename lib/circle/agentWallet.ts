import {
  initiateDeveloperControlledWalletsClient,
  type CircleDeveloperControlledWalletsClient,
} from "@circle-fin/developer-controlled-wallets";
import { CIRCLE_ARC_TESTNET_BLOCKCHAIN } from "@/lib/arc/chain";

/**
 * Wrapper cho Circle Developer-Controlled Wallets API — dùng SDK chính thức
 * `@circle-fin/developer-controlled-wallets` (đã kiểm tra type definitions
 * thật của bản 10.8.0, không đoán tên hàm) thay vì gọi REST trực tiếp, vì SDK
 * tự lo phần mã hoá entitySecretCiphertext cho mỗi request.
 *
 * Cần CIRCLE_API_KEY, CIRCLE_ENTITY_SECRET, CIRCLE_WALLET_SET_ID trong env —
 * xem `npm run circle:setup` (scripts/circle-setup.ts) và docs/SETUP.md để
 * tạo các giá trị này lần đầu.
 *
 * "USDC là native currency" trên Arc, nên số dư/token để gửi luôn là token có
 * `isNative: true` trong ví thay vì hardcode địa chỉ token — an toàn hơn nếu
 * Circle cập nhật cấu hình token trên Arc sau này.
 */
export interface TypedDataInput {
  domain: { name: string; version: string; chainId: number; verifyingContract: string };
  types: Record<string, { name: string; type: string }[]>;
  primaryType: string;
  message: Record<string, unknown>;
}

export interface AgentWalletClient {
  createSmartAccount(userId: string): Promise<{ address: string; providerWalletId: string }>;
  /**
   * Tạo ví EOA (không phải smart account) — dùng cho Circle Gateway
   * nanopayments (lib/agent/x402/), vì EIP-3009 transferWithAuthorization mà
   * Gateway dùng để xác thực uỷ quyền kỳ vọng chữ ký ECDSA kiểu EOA
   * (ecrecover), còn chữ ký từ SCA là ERC-1271 — không chắc tương thích.
   */
  createEoaWallet(refId: string): Promise<{ address: string; providerWalletId: string }>;
  getBalanceUsdc(providerWalletId: string): Promise<number>;
  sendUsdc(params: { providerWalletId: string; to: string; amountUsdc: number }): Promise<{ txHash: string }>;
  /** Ký EIP-712 typed data qua Circle — không có private key thô nào rời khỏi Circle. */
  signTypedData(providerWalletId: string, data: TypedDataInput): Promise<`0x${string}`>;
  /** Gọi một hàm smart contract (nonpayable) từ ví — dùng cho approve/deposit vào Gateway Wallet. */
  executeContractCall(params: {
    providerWalletId: string;
    contractAddress: string;
    abiFunctionSignature: string;
    abiParameters: unknown[];
  }): Promise<{ txHash: string }>;
}

const EIP712_DOMAIN_FIELDS = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" },
];

/**
 * JSON.stringify nhưng chuyển bigint thành chuỗi số thập phân thay vì throw,
 * và tự thêm `types.EIP712Domain` nếu caller chưa khai (viem/ethers tự suy
 * ra domain type khi ký nên các SDK dùng chúng — như BatchEvmScheme của
 * @circle-fin/x402-batching — thường không khai rõ; API signTypedData của
 * Circle lại validate nghiêm ngặt và bắt buộc phải có, đã xác nhận bằng
 * cách gọi thật và thấy lỗi "extra data provided in the message" khi thiếu).
 */
function stringifyTypedData(data: TypedDataInput): string {
  const types = data.types.EIP712Domain ? data.types : { EIP712Domain: EIP712_DOMAIN_FIELDS, ...data.types };
  return JSON.stringify({ ...data, types }, (_key, value) => (typeof value === "bigint" ? value.toString() : value));
}

let cachedClient: CircleDeveloperControlledWalletsClient | null = null;

function getClient(): CircleDeveloperControlledWalletsClient {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

  if (!apiKey || !entitySecret) {
    throw new Error(
      "CIRCLE_API_KEY / CIRCLE_ENTITY_SECRET chưa được cấu hình — xem docs/SETUP.md mục Circle."
    );
  }

  if (!cachedClient) {
    cachedClient = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });
  }

  return cachedClient;
}

export function createAgentWalletClient(): AgentWalletClient {
  return {
    async createSmartAccount(userId: string) {
      const client = getClient();
      const walletSetId = process.env.CIRCLE_WALLET_SET_ID;

      if (!walletSetId) {
        throw new Error(
          "CIRCLE_WALLET_SET_ID chưa được cấu hình — chạy `npm run circle:setup` trước rồi điền vào .env.local."
        );
      }

      const response = await client.createWallets({
        blockchains: [CIRCLE_ARC_TESTNET_BLOCKCHAIN],
        count: 1,
        walletSetId,
        accountType: "SCA",
        metadata: [{ refId: userId }],
      });

      const wallet = response.data?.wallets?.[0];
      if (!wallet) {
        throw new Error("Circle không trả về wallet nào sau khi tạo (createWallets).");
      }

      return { address: wallet.address, providerWalletId: wallet.id };
    },

    async createEoaWallet(refId: string) {
      const client = getClient();
      const walletSetId = process.env.CIRCLE_WALLET_SET_ID;

      if (!walletSetId) {
        throw new Error(
          "CIRCLE_WALLET_SET_ID chưa được cấu hình — chạy `npm run circle:setup` trước rồi điền vào .env.local."
        );
      }

      const response = await client.createWallets({
        blockchains: [CIRCLE_ARC_TESTNET_BLOCKCHAIN],
        count: 1,
        walletSetId,
        accountType: "EOA",
        metadata: [{ refId }],
      });

      const wallet = response.data?.wallets?.[0];
      if (!wallet) {
        throw new Error("Circle không trả về wallet nào sau khi tạo EOA wallet (createWallets).");
      }

      return { address: wallet.address, providerWalletId: wallet.id };
    },

    async signTypedData(providerWalletId, data) {
      const client = getClient();
      const response = await client.signTypedData({
        walletId: providerWalletId,
        data: stringifyTypedData(data),
      });

      const signature = response.data?.signature;
      if (!signature) {
        throw new Error("Circle không trả về signature (signTypedData).");
      }

      return (signature.startsWith("0x") ? signature : `0x${signature}`) as `0x${string}`;
    },

    async executeContractCall({ providerWalletId, contractAddress, abiFunctionSignature, abiParameters }) {
      const client = getClient();

      const createResponse = await client.createContractExecutionTransaction({
        walletId: providerWalletId,
        contractAddress,
        abiFunctionSignature,
        abiParameters,
        fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      });

      const transactionId = createResponse.data?.id;
      if (!transactionId) {
        throw new Error("Circle không trả về transaction id (createContractExecutionTransaction).");
      }

      const confirmed = await client.getTransaction({ id: transactionId, waitForTxHash: true });
      return { txHash: confirmed.data.transaction.txHash };
    },

    async getBalanceUsdc(providerWalletId: string) {
      const client = getClient();
      const response = await client.getWalletTokenBalance({ id: providerWalletId });
      const balances = response.data?.tokenBalances ?? [];
      const usdc = balances.find((b) => b.token.isNative || b.token.symbol?.toUpperCase() === "USDC");
      return usdc ? Number(usdc.amount) : 0;
    },

    async sendUsdc({ providerWalletId, to, amountUsdc }) {
      const client = getClient();

      const balanceResponse = await client.getWalletTokenBalance({ id: providerWalletId });
      const nativeToken = balanceResponse.data?.tokenBalances?.find((b) => b.token.isNative);

      if (!nativeToken) {
        throw new Error("Không tìm thấy token USDC (native) trong ví nguồn để tạo giao dịch.");
      }

      const createResponse = await client.createTransaction({
        walletId: providerWalletId,
        tokenId: nativeToken.token.id,
        amount: [amountUsdc.toFixed(2)],
        destinationAddress: to,
        fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      });

      const transactionId = createResponse.data?.id;
      if (!transactionId) {
        throw new Error("Circle không trả về transaction id (createTransaction).");
      }

      // SCA wallet chỉ có txHash khi giao dịch tới trạng thái CONFIRMED — chờ
      // tới lúc đó thay vì trả về ngay sau khi submit.
      const confirmed = await client.getTransaction({
        id: transactionId,
        waitForTxHash: true,
      });

      return { txHash: confirmed.data.transaction.txHash };
    },
  };
}
