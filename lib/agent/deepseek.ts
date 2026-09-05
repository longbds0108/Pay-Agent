import type { X402Resource } from "@/lib/agent/x402/resources";
import type { Service } from "@/types";

/**
 * Client cho DeepSeek chat completions API (tương thích OpenAI). Dùng fetch
 * trực tiếp thay vì SDK `openai` để tránh phụ thuộc vào version cụ thể của
 * SDK — format request/response chat completions + tool calling là chuẩn
 * chung, ổn định.
 *
 * Base URL + tên model xác nhận từ https://api-docs.deepseek.com (đọc ngày
 * 2026-09-05). Có thể đổi model qua env DEEPSEEK_MODEL nếu DeepSeek cập nhật
 * danh sách model sau này.
 */
const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-v4-flash";

export interface AgentChatMessage {
  role: "user" | "agent";
  text: string;
}

export interface ProposedPayment {
  serviceId: string;
  recipient: string;
  amountUsdc: number;
  reason: string;
}

export interface ProposedX402Payment {
  resourceId: string;
  reason: string;
}

export interface AgentTurnResult {
  reply: string;
  intent: ProposedPayment | null;
  x402Intent: ProposedX402Payment | null;
}

const PROPOSE_PAYMENT_TOOL = {
  type: "function",
  function: {
    name: "propose_payment",
    description:
      "Đề xuất thanh toán USDC cho một dịch vụ trong danh mục, khi user rõ ràng muốn agent trả tiền cho dịch vụ đó. Chỉ dùng serviceId có trong danh mục được cung cấp trong system prompt — không tự bịa dịch vụ hay giá khác.",
    parameters: {
      type: "object",
      properties: {
        serviceId: { type: "string", description: "id của service trong danh mục (đúng như liệt kê)" },
        reason: { type: "string", description: "Tóm tắt ngắn gọn lý do thanh toán, theo yêu cầu của user" },
      },
      required: ["serviceId", "reason"],
    },
  },
} as const;

const PAY_X402_TOOL = {
  type: "function",
  function: {
    name: "pay_x402_resource",
    description:
      "Trả phí cho một tài nguyên x402 trong danh mục x402 (thanh toán qua Circle Gateway, mức sub-cent, không tốn gas). Dùng khi user muốn lấy dữ liệu từ chính tài nguyên đó. Chỉ dùng resourceId có trong danh mục x402 ở system prompt.",
    parameters: {
      type: "object",
      properties: {
        resourceId: { type: "string", description: "id của tài nguyên x402 (đúng như liệt kê)" },
        reason: { type: "string", description: "Tóm tắt ngắn gọn lý do gọi tài nguyên này" },
      },
      required: ["resourceId", "reason"],
    },
  },
} as const;

function buildSystemPrompt(services: Service[], x402Resources: X402Resource[]): string {
  const catalog = services.length
    ? services
        .map((s) => `- serviceId=${s.id} | ${s.name} | giá ${s.priceUsdc} USDC | ${s.description ?? ""}`)
        .join("\n")
    : "(chưa có dịch vụ nào trong danh mục)";

  const x402Catalog = x402Resources.length
    ? x402Resources
        .map((r) => `- resourceId=${r.id} | ${r.name} | giá ${r.priceUsdc} USDC | ${r.description}`)
        .join("\n")
    : "(chưa có tài nguyên x402 nào)";

  return [
    "Bạn là AI agent thanh toán của AgentPay, hoạt động thay mặt user để trả USDC trên mạng Arc.",
    "Có hai cách trả tiền:",
    "1. propose_payment — chuyển khoản USDC trực tiếp cho dịch vụ trong danh mục dịch vụ.",
    "2. pay_x402_resource — trả phí cho tài nguyên x402 qua Circle Gateway (nanopayment, sub-cent, không tốn gas).",
    "Chỉ dùng đúng id có trong danh mục tương ứng và đúng giá niêm yết.",
    "Không tự đặt giá khác, không đề xuất thanh toán cho thứ ngoài danh mục — nếu user muốn vậy, giải thích là chưa được hỗ trợ.",
    "Nếu yêu cầu của user không rõ ràng, hỏi lại thay vì đoán và gọi tool.",
    "Nếu tin nhắn không liên quan thanh toán, chỉ trò chuyện bình thường, không gọi tool.",
    "Trả lời ngắn gọn, tiếng Việt trừ khi user chủ động dùng ngôn ngữ khác.",
    "",
    "Danh mục dịch vụ (chuyển khoản trực tiếp):",
    catalog,
    "",
    "Danh mục tài nguyên x402 (trả phí qua Circle Gateway):",
    x402Catalog,
  ].join("\n");
}

export async function runAgentTurn(params: {
  message: string;
  history: AgentChatMessage[];
  services: Service[];
  x402Resources?: X402Resource[];
}): Promise<AgentTurnResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const x402Resources = params.x402Resources ?? [];

  if (!apiKey) {
    return {
      reply: "AI model chưa được cấu hình (thiếu DEEPSEEK_API_KEY trong .env.local — xem docs/SETUP.md).",
      intent: null,
      x402Intent: null,
    };
  }

  const model = process.env.DEEPSEEK_MODEL || DEFAULT_MODEL;

  const messages = [
    { role: "system", content: buildSystemPrompt(params.services, x402Resources) },
    ...params.history.map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: m.text,
    })),
    { role: "user" as const, content: params.message },
  ];

  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      tools: x402Resources.length ? [PROPOSE_PAYMENT_TOOL, PAY_X402_TOOL] : [PROPOSE_PAYMENT_TOOL],
      tool_choice: "auto",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`DeepSeek API lỗi (HTTP ${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const choice = data?.choices?.[0];
  const message = choice?.message;
  const toolCall = message?.tool_calls?.[0];

  if (toolCall?.function?.name === "pay_x402_resource") {
    let args: { resourceId?: string; reason?: string } = {};
    try {
      args = JSON.parse(toolCall.function.arguments || "{}");
    } catch {
      args = {};
    }

    const resource = x402Resources.find((r) => r.id === args.resourceId);
    if (resource) {
      return {
        reply:
          message?.content?.trim() ||
          `Mình sẽ trả ${resource.priceUsdc} USDC qua Circle Gateway để lấy "${resource.name}".`,
        intent: null,
        x402Intent: {
          resourceId: resource.id,
          reason: args.reason || `Gọi ${resource.name}`,
        },
      };
    }

    return {
      reply: message?.content?.trim() || "Mình không tìm thấy tài nguyên x402 đó trong danh mục.",
      intent: null,
      x402Intent: null,
    };
  }

  if (toolCall?.function?.name === "propose_payment") {
    let args: { serviceId?: string; reason?: string } = {};
    try {
      args = JSON.parse(toolCall.function.arguments || "{}");
    } catch {
      args = {};
    }

    const service = params.services.find((s) => s.id === args.serviceId);
    if (service) {
      return {
        reply:
          message?.content?.trim() ||
          `Mình sẽ đề xuất thanh toán ${service.priceUsdc} USDC cho "${service.name}", bạn xác nhận nhé.`,
        intent: {
          serviceId: service.id,
          recipient: service.recipientAddress,
          amountUsdc: service.priceUsdc,
          reason: args.reason || `Thanh toán cho ${service.name}`,
        },
        x402Intent: null,
      };
    }

    // Model gọi tool nhưng serviceId không khớp danh mục — coi như không có
    // intent hợp lệ, trả lời bằng nội dung text nếu có.
    return {
      reply: message?.content?.trim() || "Mình không tìm thấy dịch vụ đó trong danh mục hiện có.",
      intent: null,
      x402Intent: null,
    };
  }

  return {
    reply: message?.content?.trim() || "Xin lỗi, mình chưa hiểu ý bạn.",
    intent: null,
    x402Intent: null,
  };
}
