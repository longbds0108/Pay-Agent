"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";

interface ChatMessage {
  role: "user" | "agent";
  text: string;
  pendingPaymentIntentId?: string;
}

export default function AgentChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  async function sendMessage() {
    if (!input.trim() || sending) return;
    const text = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setSending(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [...prev, { role: "agent", text: data.error ?? "Có lỗi xảy ra." }]);
        return;
      }

      let replyText = data.reply as string;
      let pendingId: string | undefined;
      const decision = data.decision?.decision as string | undefined;

      if (decision === "pending_user_approval" || decision === "require_approval") {
        pendingId = data.paymentIntentId;
        replyText += `\n\nCần bạn duyệt: ${data.intent.amountUsdc} USDC — "${data.intent.reason}".`;
      } else if (decision === "deny") {
        replyText += `\n\nBị từ chối bởi policy: ${data.decision.reason}`;
      } else if (data.txHash) {
        replyText += `\n\nĐã tự động thanh toán. Tx: ${String(data.txHash).slice(0, 12)}...`;
      } else if (data.executionError) {
        replyText += `\n\nDuyệt tự động nhưng thực thi thất bại: ${data.executionError}`;
      }

      setMessages((prev) => [...prev, { role: "agent", text: replyText, pendingPaymentIntentId: pendingId }]);
    } finally {
      setSending(false);
    }
  }

  async function respondToPayment(paymentIntentId: string, action: "approve" | "reject") {
    const res = await fetch(`/api/payments/${paymentIntentId}/${action}`, { method: "POST" });
    const data = await res.json();
    setResolvedIds((prev) => new Set(prev).add(paymentIntentId));

    setMessages((prev) => [
      ...prev,
      {
        role: "agent",
        text:
          action === "approve"
            ? data.ok
              ? `Đã thanh toán. Tx: ${String(data.txHash).slice(0, 12)}...`
              : `Đã duyệt nhưng thực thi thất bại: ${data.error}`
            : "Đã từ chối thanh toán này.",
      },
    ]);
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AppSidebar />
      <main className="mx-auto flex w-full max-w-lg flex-col px-6 py-10">
        <h1 className="mb-6 text-2xl font-semibold">Agent</h1>
      <div className="flex-1 space-y-3 overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <span className="inline-block whitespace-pre-line rounded-lg bg-slate-100 px-3 py-2 text-sm">
              {m.text}
            </span>
            {m.pendingPaymentIntentId && !resolvedIds.has(m.pendingPaymentIntentId) && (
              <div className="mt-2 flex justify-start gap-2">
                <button
                  className="rounded-lg bg-slate-900 px-3 py-1 text-xs text-white"
                  onClick={() => respondToPayment(m.pendingPaymentIntentId as string, "approve")}
                >
                  Approve
                </button>
                <button
                  className="rounded-lg border border-slate-300 px-3 py-1 text-xs"
                  onClick={() => respondToPayment(m.pendingPaymentIntentId as string, "reject")}
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-sm text-slate-400">
            Thử: &quot;Pay the weather API for today&apos;s data&quot;
          </p>
        )}
      </div>
      <div className="mt-4 flex gap-2">
        <input
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
          placeholder="Pay the weather API $0.50 for today's data"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          disabled={sending}
        />
        <button
          onClick={sendMessage}
          disabled={sending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {sending ? "..." : "Send"}
        </button>
      </div>
      </main>
    </div>
  );
}
