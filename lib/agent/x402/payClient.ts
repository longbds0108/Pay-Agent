import { decodePaymentResponseHeader } from "@x402/core/http";
import { registerBatchScheme } from "@circle-fin/x402-batching/client";
import type { BatchEvmSigner } from "@circle-fin/x402-batching";
import { x402Client } from "@x402/core/client";
import { wrapFetchWithPayment } from "@x402/fetch";

export interface X402PaymentResult {
  status: number;
  body: unknown;
  txHash: string | null;
}

/**
 * Gọi 1 endpoint x402 (theo đúng chuẩn HTTP 402 + Circle Gateway batching):
 * gửi request bình thường, nếu server trả 402 thì tự ký uỷ quyền qua
 * `signer` và gọi lại — toàn bộ phần dò 402/ký/gọi lại do
 * `wrapFetchWithPayment` (SDK chính thức `@x402/fetch`) xử lý, không tự
 * viết lại logic này để tránh sai sót ở phần giao thức.
 */
export async function payX402Resource(url: string, signer: BatchEvmSigner, init?: RequestInit): Promise<X402PaymentResult> {
  const client = new x402Client();
  registerBatchScheme(client, { signer });

  const fetchWithPay = wrapFetchWithPayment(fetch, client);

  const response = await fetchWithPay(url, init);
  const bodyText = await response.text();

  let body: unknown = bodyText;
  try {
    body = JSON.parse(bodyText);
  } catch {
    // giữ nguyên dạng text nếu response không phải JSON
  }

  const headerValue = response.headers.get("PAYMENT-RESPONSE") ?? response.headers.get("X-PAYMENT-RESPONSE");
  let txHash: string | null = null;

  if (headerValue) {
    try {
      const settle = decodePaymentResponseHeader(headerValue);
      txHash = settle.transaction ?? null;
    } catch {
      // không decode được thì bỏ qua, vẫn trả về response gốc
    }
  }

  return { status: response.status, body, txHash };
}
