import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import Link from "next/link";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

type Status = "neutral" | "confirmed" | "pending" | "denied";

const STATUS_BADGE: Record<Status, string> = {
  neutral: "bg-paper/10 text-paper/60",
  confirmed: "bg-confirmed/15 text-confirmed",
  pending: "bg-pending/15 text-pending",
  denied: "bg-denied/15 text-denied",
};

const STATUS_DOT: Record<Status, string> = {
  neutral: "bg-paper/40",
  confirmed: "bg-confirmed",
  pending: "bg-pending",
  denied: "bg-denied",
};

// Minh hoạ đúng theo state machine thật trong types/index.ts + lib/payments/pipeline.ts —
// không phải dữ liệu người dùng thật.
const LEDGER_ENTRIES: { time: string; state: string; amount: string; status: Status; badge: string }[] = [
  { time: "10:42:03", state: "policy_check", amount: "0.50 USDC", status: "neutral", badge: "checking" },
  { time: "10:42:03", state: "approved", amount: "auto", status: "confirmed", badge: "auto" },
  { time: "10:42:04", state: "executing", amount: "0.50 USDC", status: "neutral", badge: "arc" },
  { time: "10:42:06", state: "confirmed", amount: "0.50 USDC", status: "confirmed", badge: "done" },
  { time: "10:44:11", state: "pending_user_approval", amount: "0.25 USDC", status: "pending", badge: "cần bạn" },
  { time: "10:44:52", state: "approved", amount: "bởi bạn", status: "confirmed", badge: "ok" },
  { time: "10:47:20", state: "policy_check", amount: "12.00 USDC", status: "neutral", badge: "checking" },
  { time: "10:47:20", state: "rejected", amount: "vượt hạn mức", status: "denied", badge: "denied" },
];

const POLICY_CARDS = [
  {
    label: "Hạn mức / ngày",
    value: "50",
    hint: "Tổng chi tối đa mỗi ngày, tính bằng USDC.",
  },
  {
    label: "Hạn mức / giao dịch",
    value: "5",
    hint: "Một lần thanh toán không được vượt quá số này.",
  },
  {
    label: "Cần duyệt trên",
    value: "5",
    hint: "Vượt ngưỡng này, agent dừng lại chờ bạn bấm Approve.",
  },
];

const PIPELINE_STEPS: { state: string; status: Status; text: string }[] = [
  { state: "created", status: "neutral", text: "Agent hiểu yêu cầu trong đoạn chat và tạo đề xuất thanh toán." },
  {
    state: "policy_check",
    status: "neutral",
    text: "Đối chiếu số tiền với hạn mức ngày, hạn mức/giao dịch và ngưỡng cần duyệt.",
  },
  {
    state: "approved → executing",
    status: "confirmed",
    text: "Trong hạn mức: tự động duyệt và gửi USDC ngay, không cần chờ bạn.",
  },
  {
    state: "pending_user_approval",
    status: "pending",
    text: "Vượt ngưỡng duyệt: agent dừng lại, hiện nút Approve / Reject cho bạn.",
  },
  {
    state: "rejected",
    status: "denied",
    text: "Vượt hạn mức ngày hoặc giao dịch: từ chối ngay, không thực thi.",
  },
  {
    state: "confirmed / failed",
    status: "neutral",
    text: "Ghi vào lịch sử giao dịch kèm mã tx thật trên Arcscan.",
  },
];

const ARC_SPECS = [
  { label: "chain_id", value: "5042002" },
  { label: "gas_token", value: "USDC — không cần token riêng để trả phí" },
  { label: "network", value: "testnet" },
  { label: "wallet_custody", value: "Circle Developer-Controlled Wallets (SCA)" },
  { label: "explorer", value: "testnet.arcscan.app" },
];

const linkFocus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-confirmed";

export default function HomePage() {
  return (
    <div className={`${plexSans.className} min-h-screen bg-ink text-paper`}>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 md:px-10">
        <span className="text-lg font-semibold tracking-tight">
          AgentPay<span className="text-confirmed">·</span>
        </span>
        <Link
          href="/login"
          className={`rounded-full border border-ink-line px-4 py-2 text-sm text-paper/80 transition hover:border-paper/40 hover:text-paper ${linkFocus}`}
        >
          Continue with Google
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-8 md:grid-cols-[1.1fr_1fr] md:gap-10 md:px-10 md:pt-16">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-ink-line px-3 py-1 text-xs uppercase tracking-[0.16em] text-paper/60">
            Ví agent trên Arc <span className="text-confirmed">·</span> USDC là phí gas
          </p>
          <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-paper sm:text-5xl lg:text-[3.4rem]">
            Giao ngân sách cho agent,
            <br className="hidden sm:block" /> đừng giao chìa khoá.
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-paper/70">
            AgentPay tạo cho AI agent của bạn một ví riêng trên Arc, giới hạn
            bởi hạn mức bạn tự đặt. Agent không bao giờ chi vượt quá — kể cả
            khi bạn không có mặt để duyệt.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link
              href="/login"
              className={`rounded-full bg-paper px-6 py-3 text-sm font-medium text-ink transition hover:bg-white active:scale-[0.97] ${linkFocus}`}
            >
              Bắt đầu với Google
            </Link>
            <a
              href="#pipeline"
              className={`text-sm text-paper/60 underline decoration-ink-line underline-offset-4 transition hover:text-paper ${linkFocus}`}
            >
              Xem một khoản chi được duyệt thế nào ↓
            </a>
          </div>
        </div>

        <div className="min-w-0">
          <div className="overflow-hidden rounded-2xl border border-ink-line bg-ink-panel">
            <div className="flex items-center justify-between border-b border-ink-line px-5 py-3">
              <span className="text-xs uppercase tracking-[0.12em] text-paper/50">
                payment_intents — nhật ký
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-confirmed" />
            </div>
            <div className="relative h-[22rem] overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]">
              <ul className={`${plexMono.className} ledger-track text-[12px] sm:text-[13px]`}>
                {[...LEDGER_ENTRIES, ...LEDGER_ENTRIES].map((entry, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2 whitespace-nowrap border-b border-ink-line/60 px-4 py-3 sm:px-5"
                  >
                    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                      <span className="shrink-0 text-paper/35">{entry.time}</span>
                      <span className="truncate text-paper/80">{entry.state}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-paper/45">{entry.amount}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] ${STATUS_BADGE[entry.status]}`}>
                        {entry.badge}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-3 text-xs text-paper/40">
            Ví dụ minh hoạ, đúng theo state machine thật trong{" "}
            <code className={plexMono.className}>types/index.ts</code>.
          </p>
        </div>
      </section>

      {/* Ba con số của policy */}
      <section className="bg-paper py-20 text-ink">
        <div className="mx-auto max-w-6xl px-6 md:px-10">
          <h2 className="text-xs uppercase tracking-[0.16em] text-ink/50">
            Ba con số agent không thể vượt qua
          </h2>
          <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-ink/10 bg-ink/10 sm:grid-cols-3">
            {POLICY_CARDS.map((card) => (
              <div key={card.label} className="bg-paper p-8">
                <p className="text-xs uppercase tracking-[0.08em] text-ink/50">{card.label}</p>
                <p className={`${plexMono.className} mt-3 text-4xl font-medium`}>
                  {card.value}
                  <span className="ml-2 text-base font-normal text-ink/40">USDC</span>
                </p>
                <p className="mt-2 text-sm text-ink/60">{card.hint}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-ink/50">
            Giá trị mặc định — chỉnh lại bất kỳ lúc nào ở trang Policy sau khi đăng nhập.
          </p>
        </div>
      </section>

      {/* State machine */}
      <section id="pipeline" className="mx-auto max-w-6xl px-6 py-20 md:px-10">
        <h2 className="text-xs uppercase tracking-[0.16em] text-paper/50">
          Một khoản chi đi qua những bước nào
        </h2>
        <ol className="relative ml-3 mt-10 max-w-2xl space-y-10 border-l border-ink-line pl-8">
          {PIPELINE_STEPS.map((step) => (
            <li key={step.state} className="relative">
              <span className="absolute -left-[2.35rem] top-1 flex h-4 w-4 items-center justify-center rounded-full border border-ink-line bg-ink-panel">
                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[step.status]}`} />
              </span>
              <p className={`${plexMono.className} text-sm text-paper/90`}>{step.state}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-paper/60">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Spec sheet Arc */}
      <section className="bg-paper py-20 text-ink">
        <div className="mx-auto max-w-6xl px-6 md:px-10">
          <h2 className="text-xs uppercase tracking-[0.16em] text-ink/50">Thông số mạng Arc</h2>
          <dl className={`${plexMono.className} mt-8 max-w-2xl divide-y divide-ink/10 border-y border-ink/10 text-sm`}>
            {ARC_SPECS.map((spec) => (
              <div key={spec.label} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between">
                <dt className="text-ink/50">{spec.label}</dt>
                <dd className="text-ink sm:text-right">{spec.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* CTA cuối */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center md:px-10">
        <p className="text-2xl font-medium text-paper sm:text-3xl">
          Agent của bạn đang chờ một ngân sách.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            className={`rounded-full bg-paper px-6 py-3 text-sm font-medium text-ink transition hover:bg-white active:scale-[0.97] ${linkFocus}`}
          >
            Bắt đầu với Google
          </Link>
          <Link
            href="/login"
            className={`rounded-full border border-ink-line px-6 py-3 text-sm text-paper/80 transition hover:border-paper/40 hover:text-paper ${linkFocus}`}
          >
            Kết nối ví EVM
          </Link>
        </div>
      </section>

      <footer className="border-t border-ink-line px-6 py-8 text-center text-xs text-paper/35 md:px-10">
        AgentPay — xây trên Arc.
      </footer>
    </div>
  );
}
