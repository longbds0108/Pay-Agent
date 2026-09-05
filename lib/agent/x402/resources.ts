export interface X402Resource {
  id: string;
  name: string;
  description: string;
  path: string;
  priceUsdc: number;
}

/**
 * Danh mục tài nguyên trả phí qua x402 thật (Circle Gateway batching) —
 * khác với `services` (chuyển khoản trực tiếp): mỗi lần gọi, endpoint trả
 * HTTP 402 nếu chưa trả tiền, agent tự ký uỷ quyền qua Gateway wallet rồi
 * gọi lại. Giới hạn trong danh mục nội bộ này (chưa cho agent tự gọi URL
 * bất kỳ do người dùng/nội dung chat đưa ra) — xem lý do trong
 * docs/TECHNICAL_SPEC_v0.1.md mục "x402 nanopayments".
 */
export const X402_DEMO_RESOURCES: X402Resource[] = [
  {
    id: "x402-weather",
    name: "Weather API qua Circle Gateway (demo)",
    description:
      "Dữ liệu thời tiết demo, trả phí bằng x402 thật qua Circle Gateway (sub-cent, gasless), không phải chuyển khoản trực tiếp.",
    path: "/api/x402/weather",
    priceUsdc: 0.001,
  },
];

export function getX402ResourceUrl(resource: X402Resource): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}${resource.path}`;
}
