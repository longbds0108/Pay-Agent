"use client";

import { useState } from "react";

/**
 * Logo AgentPay: vòng "đồng hồ đo ngân sách" — cung màu confirmed biểu thị
 * hạn mức đã cấp cho agent (không phải vòng tròn đầy, có giới hạn), chấm nhỏ
 * ở đầu cung như kim chỉ. Bấm vào xoay 1 vòng — cảm giác "quay số" đặt lại
 * hạn mức, không phải hiệu ứng trang trí đơn thuần.
 */
export function LogoMark() {
  const [spinning, setSpinning] = useState(false);

  return (
    <button
      type="button"
      aria-label="AgentPay"
      onClick={() => setSpinning(true)}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-confirmed"
    >
      <svg
        viewBox="0 0 24 24"
        className={spinning ? "logo-spin h-6 w-6" : "h-6 w-6"}
        onAnimationEnd={() => setSpinning(false)}
      >
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke="#4C8B67"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="42.4 56.5"
          transform="rotate(-90 12 12)"
        />
        <circle cx="3" cy="12" r="2" fill="#4C8B67" />
      </svg>
    </button>
  );
}
