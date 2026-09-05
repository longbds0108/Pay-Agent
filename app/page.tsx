import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";

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
  { time: "10:44:11", state: "pending_user_approval", amount: "0.25 USDC", status: "pending", badge: "needs you" },
  { time: "10:44:52", state: "approved", amount: "by you", status: "confirmed", badge: "ok" },
  { time: "10:47:20", state: "policy_check", amount: "12.00 USDC", status: "neutral", badge: "checking" },
  { time: "10:47:20", state: "rejected", amount: "over limit", status: "denied", badge: "denied" },
];

const POLICY_CARDS = [
  {
    label: "Daily limit",
    value: "50",
    hint: "Maximum total spend per day, in USDC.",
  },
  {
    label: "Per-transaction limit",
    value: "5",
    hint: "A single payment can never exceed this amount.",
  },
  {
    label: "Approval required above",
    value: "5",
    hint: "Past this threshold, the agent pauses and waits for your approval.",
  },
];

const PIPELINE_STEPS: { state: string; status: Status; text: string }[] = [
  { state: "created", status: "neutral", text: "The agent reads your request in chat and drafts a payment proposal." },
  {
    state: "policy_check",
    status: "neutral",
    text: "Checks the amount against your daily limit, per-transaction limit, and approval threshold.",
  },
  {
    state: "approved → executing",
    status: "confirmed",
    text: "Within limits: auto-approved and sent right away — no need to wait for you.",
  },
  {
    state: "pending_user_approval",
    status: "pending",
    text: "Over the approval threshold: the agent pauses and shows you Approve / Reject.",
  },
  {
    state: "rejected",
    status: "denied",
    text: "Over the daily or per-transaction limit: rejected immediately, never executed.",
  },
  {
    state: "confirmed / failed",
    status: "neutral",
    text: "Logged to transaction history with a real tx hash on Arcscan.",
  },
];

const ARC_SPECS = [
  { label: "chain_id", value: "5042002" },
  { label: "gas_token", value: "USDC — no separate token needed for gas" },
  { label: "network", value: "testnet" },
  { label: "wallet_custody", value: "Circle Developer-Controlled Wallets (SCA)" },
  { label: "explorer", value: "testnet.arcscan.app" },
];

const linkFocus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-confirmed";

export default function HomePage() {
  return (
    <div className={`${plexSans.className} tech-grid min-h-screen bg-ink text-paper`}>
      <header className="sticky top-0 z-50 border-b border-ink/10 bg-paper/90 backdrop-blur-md">
        <div className="mx-auto grid max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-4 px-6 py-4 md:px-10">
          <Link
            href="/"
            className={`flex items-center gap-2.5 text-lg font-semibold tracking-tight text-ink ${linkFocus}`}
          >
            <LogoMark />
            AgentPay
          </Link>

          <nav className="hidden items-center justify-center gap-2 text-[15px] font-medium text-ink md:flex">
            <a
              href="#policy"
              className={`rounded-full border border-ink/15 px-4 py-1.5 transition hover:border-[#4f8b68] hover:bg-[#4f8b68] hover:text-paper ${linkFocus}`}
            >
              Product
            </a>
            <a
              href="#pipeline"
              className={`rounded-full border border-ink/15 px-4 py-1.5 transition hover:border-[#4f8b68] hover:bg-[#4f8b68] hover:text-paper ${linkFocus}`}
            >
              How it works
            </a>
            <a
              href="/agent"
              className={`rounded-full border border-ink/15 px-4 py-1.5 transition hover:border-[#4f8b68] hover:bg-[#4f8b68] hover:text-paper ${linkFocus}`}
            >
              Agents
            </a>
            <a
              href="https://github.com/longbds0108/Pay-Agent/blob/main/docs/TECHNICAL_SPEC_v0.1.md"
              target="_blank"
              rel="noreferrer"
              className={`rounded-full border border-ink/15 px-4 py-1.5 transition hover:border-[#4f8b68] hover:bg-[#4f8b68] hover:text-paper ${linkFocus}`}
            >
              Docs
            </a>
          </nav>

          <Link
            href="/login"
            className={`justify-self-end rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-[#4f8b68] active:scale-[0.97] ${linkFocus}`}
          >
            Launch app
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-8 md:grid-cols-[1.1fr_1fr] md:gap-10 md:px-10 md:pt-16">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-ink-line px-3 py-1 text-xs uppercase tracking-[0.16em] text-paper/60">
            Agent wallet on Arc <span className="text-confirmed">·</span> USDC pays the gas
          </p>
          <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-paper sm:text-5xl lg:text-[3.4rem]">
            Give your agent a budget,
            <br className="hidden sm:block" /> not the keys.
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-paper/70">
            AgentPay gives your AI agent its own wallet on Arc, capped by
            limits you set. It can never overspend — even when you&rsquo;re
            not around to approve.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link
              href="/login"
              className={`rounded-full bg-paper px-6 py-3 text-sm font-medium text-ink transition hover:bg-[#c9ff5c] active:scale-[0.97] ${linkFocus}`}
            >
              Launch app
            </Link>
            <a
              href="#pipeline"
              className={`text-sm text-paper/60 underline decoration-ink-line underline-offset-4 transition hover:text-paper ${linkFocus}`}
            >
              See how a payment gets approved ↓
            </a>
          </div>
        </div>

        <div className="min-w-0">
          <div className="overflow-hidden rounded-2xl border border-ink-line bg-ink-panel">
            <div className="flex items-center justify-between border-b border-ink-line px-5 py-3">
              <span className="text-xs uppercase tracking-[0.12em] text-paper/50">
                payment_intents — ledger
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
            Illustrative example, matching the real state machine in{" "}
            <code className={plexMono.className}>types/index.ts</code>.
          </p>
        </div>
      </section>

      {/* Ba con số của policy */}
      <section id="policy" className="scroll-mt-20 bg-paper py-20 text-ink">
        <div className="mx-auto max-w-6xl px-6 md:px-10">
          <h2 className="text-xs uppercase tracking-[0.16em] text-ink/50">
            Three numbers your agent can never cross
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
            Default values — change them anytime on the Policy page after signing in.
          </p>
        </div>
      </section>

      {/* State machine */}
      <section id="pipeline" className="scroll-mt-20 mx-auto max-w-6xl px-6 py-20 md:px-10">
        <h2 className="text-xs uppercase tracking-[0.16em] text-paper/50">
          What a payment goes through
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
      <section id="network" className="scroll-mt-20 bg-paper py-20 text-ink">
        <div className="mx-auto max-w-6xl px-6 md:px-10">
          <h2 className="text-xs uppercase tracking-[0.16em] text-ink/50">Arc network specs</h2>
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
          Your agent is waiting for a budget.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            className={`rounded-full bg-paper px-6 py-3 text-sm font-medium text-ink transition hover:bg-[#4f8b68] hover:text-paper active:scale-[0.97] ${linkFocus}`}
          >
            Launch app
          </Link>
          <Link
            href="/login"
            className={`rounded-full border border-ink-line px-6 py-3 text-sm text-paper/80 transition hover:border-[#4f8b68] hover:bg-[#4f8b68] hover:text-paper ${linkFocus}`}
          >
            Connect EVM wallet
          </Link>
        </div>
      </section>

      <footer className="border-t border-ink-line px-6 py-8 text-center text-xs text-paper/35 md:px-10">
        AgentPay — built on Arc.
      </footer>
    </div>
  );
}
