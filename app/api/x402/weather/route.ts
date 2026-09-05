import { BatchFacilitatorClient, GatewayEvmScheme } from "@circle-fin/x402-batching/server";
import { withX402 } from "@x402/next";
import { x402ResourceServer, type FacilitatorClient } from "@x402/core/server";
import type { SchemeNetworkServer } from "@x402/core/types";
import { NextResponse, type NextRequest } from "next/server";
import { ARC_TESTNET_X402_NETWORK, GATEWAY_FACILITATOR_TESTNET_URL } from "@/lib/arc/gateway";

/**
 * Endpoint x402 THẬT (không phải mock): chưa trả tiền sẽ nhận HTTP 402 kèm
 * payment requirements; agent tự ký uỷ quyền qua Circle Gateway
 * (lib/agent/x402/payClient.ts) rồi gọi lại mới nhận được dữ liệu. Dùng để
 * minh hoạ + tự kiểm thử cơ chế Gateway nanopayments, xem
 * lib/agent/x402/resources.ts.
 */
const SELLER_ADDRESS = process.env.X402_SELLER_ADDRESS || "0x00000000000000000000000000000000000000B1";

// `@circle-fin/x402-batching@3.4.0` khai báo lại type FacilitatorClient/
// SchemeNetworkServer cục bộ cho riêng nó, không hoàn toàn khớp cấu trúc với
// bản mới nhất của @x402/core (ví dụ ResourceInfo.description optional ở
// core nhưng required ở bản khai báo cục bộ của x402-batching) — lệch phiên
// bản type giữa 2 gói của chính Circle, đã kiểm chứng hành vi runtime đúng
// (JSDoc chính thức của SDK dùng đúng cách ghép này), nên ép kiểu ở biên.
const facilitator = new BatchFacilitatorClient({ url: GATEWAY_FACILITATOR_TESTNET_URL }) as unknown as FacilitatorClient;
const gatewayScheme = new GatewayEvmScheme() as unknown as SchemeNetworkServer;
const resourceServer = new x402ResourceServer(facilitator).register(ARC_TESTNET_X402_NETWORK, gatewayScheme);

async function handler(_request: NextRequest) {
  return NextResponse.json({
    city: "Ho Chi Minh City",
    temperatureC: 31,
    condition: "Có mây, khả năng mưa buổi chiều",
    note: "Dữ liệu demo — bạn vừa trả phí qua Circle Gateway (x402), không phải chuyển khoản trực tiếp.",
  });
}

export const GET = withX402(
  handler,
  {
    "/api/x402/weather": {
      accepts: {
        scheme: "exact",
        payTo: SELLER_ADDRESS,
        price: "$0.001",
        network: ARC_TESTNET_X402_NETWORK,
      },
      description: "Weather API demo — trả phí qua Circle Gateway nanopayment (x402) trên Arc Testnet.",
    },
  },
  resourceServer
);
