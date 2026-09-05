import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#081818",
          backgroundImage: "radial-gradient(circle at 50% 0%, rgba(76,139,103,0.28), transparent 60%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: "9999px",
              backgroundColor: "#4C8B67",
            }}
          >
            <svg width="30" height="30" viewBox="0 0 32 32">
              <path
                d="M11 9 L19 16 L11 23"
                fill="none"
                stroke="#EDE7D9"
                strokeWidth="3.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="23" cy="16" r="3.4" fill="#EDE7D9" />
            </svg>
          </div>
          <span style={{ fontSize: 34, fontWeight: 600, color: "#EDE7D9" }}>AgentPay</span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 56,
            fontSize: 66,
            fontWeight: 600,
            lineHeight: 1.1,
            color: "#EDE7D9",
            maxWidth: 920,
          }}
        >
          Give your agent a budget, not the keys.
        </div>
        <div style={{ display: "flex", marginTop: 32, fontSize: 26, color: "rgba(237,231,217,0.65)" }}>
          AI agent payments on Arc — capped by policy, secured by Circle.
        </div>
      </div>
    ),
    { ...size }
  );
}
