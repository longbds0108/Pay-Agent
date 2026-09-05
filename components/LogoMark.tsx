/**
 * Logo AgentPay: mũi tên (agent hành động, tự chủ) đẩy một đồng coin (USDC)
 * về phía trước — đúng nghĩa "agent tự gửi thanh toán". Hover vào, mũi tên
 * và coin trượt tới trước như đang thực hiện một lệnh gửi.
 */
export function LogoMark() {
  return (
    <span className="group flex h-6 w-6 shrink-0 items-center justify-center">
      <svg viewBox="0 0 24 24" className="h-6 w-6 overflow-visible">
        <path
          d="M7 6 L13 12 L7 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform duration-300 ease-out group-hover:translate-x-0.5"
        />
        <circle
          cx="18"
          cy="12"
          r="2.4"
          fill="#4C8B67"
          className="transition-transform delay-75 duration-300 ease-out group-hover:translate-x-1.5"
        />
      </svg>
    </span>
  );
}
