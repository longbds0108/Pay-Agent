"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "Thiếu mã xác thực từ Google, thử đăng nhập lại.",
  auth_failed: "Xác thực Google thất bại, thử lại.",
  onboarding_failed: "Đăng nhập thành công nhưng chưa tạo được Agent Wallet. Kiểm tra cấu hình Circle trong docs/SETUP.md.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const [loading, setLoading] = useState<"google" | "evm" | null>(null);
  const [error, setError] = useState<string | null>(errorParam ? ERROR_MESSAGES[errorParam] ?? errorParam : null);

  async function handleGoogleLogin() {
    setError(null);
    setLoading("google");
    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(null);
    }
    // Thành công: Supabase tự redirect sang Google, không cần làm gì thêm.
  }

  async function handleEvmLogin() {
    setError(null);

    if (typeof window === "undefined" || !window.ethereum) {
      setError("Không tìm thấy ví EVM (MetaMask, v.v.) trong trình duyệt.");
      return;
    }

    setLoading("evm");
    try {
      const supabase = createSupabaseBrowserClient();

      // Dùng tính năng Sign-In-With-Ethereum có sẵn của Supabase Auth (cần
      // bật "Web3 Wallet" provider trong Supabase Auth settings — xem
      // docs/SETUP.md). Tự lấy chữ ký qua window.ethereum, không cần wagmi.
      const { data, error: web3Error } = await supabase.auth.signInWithWeb3({
        chain: "ethereum",
        statement: "Đăng nhập vào AgentPay để agent AI thanh toán USDC trên Arc theo policy của bạn.",
      });

      if (web3Error || !data?.session) {
        throw web3Error ?? new Error("Không lấy được session sau khi ký.");
      }

      const address = data.session.user.user_metadata?.address as string | undefined;
      const accounts = (await window.ethereum.request({ method: "eth_accounts" })) as string[];
      const resolvedAddress = address ?? accounts?.[0];

      if (!resolvedAddress) {
        throw new Error("Không xác định được địa chỉ ví sau khi đăng nhập.");
      }

      const onboardRes = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: resolvedAddress }),
      });

      if (!onboardRes.ok) {
        const body = await onboardRes.json().catch(() => ({}));
        throw new Error(body.error ?? "Onboarding thất bại.");
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập ví EVM thất bại.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-6 py-10">
      <div className="w-full max-w-sm rounded-3xl border border-ink-line bg-ink-panel p-8">
        <a
          href="/"
          className="flex items-center justify-center gap-2 text-sm text-paper/50 transition hover:text-paper/80"
        >
          <ArrowLeftIcon />
          Back to Home
        </a>

        <div className="mx-auto mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-confirmed shadow-lg shadow-confirmed/20">
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-paper">
            <path
              d="M7 6 L13 12 L7 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="18" cy="12" r="2.6" fill="currentColor" />
          </svg>
        </div>

        <h1 className="mt-6 text-center text-3xl font-semibold text-paper">Sign in to AgentPay</h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-paper/50">
          Give your agent a wallet on Arc, capped by the policy you set.
        </p>

        {error && (
          <p className="mt-6 rounded-xl bg-denied/10 px-3 py-2.5 text-center text-sm text-denied">{error}</p>
        )}

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            disabled={loading !== null}
            className="flex items-center gap-3 rounded-2xl border border-ink-line bg-ink px-5 py-3.5 text-left text-[15px] font-medium text-paper transition hover:border-paper/30 disabled:opacity-50"
            onClick={handleGoogleLogin}
          >
            <GoogleIcon />
            {loading === "google" ? "Redirecting…" : "Continue with Google"}
          </button>

          <button
            type="button"
            disabled={loading !== null}
            className="flex items-center gap-3 rounded-2xl border border-ink-line bg-ink px-5 py-3.5 text-left text-[15px] font-medium text-paper transition hover:border-paper/30 disabled:opacity-50"
            onClick={handleEvmLogin}
          >
            <WalletIcon />
            {loading === "evm" ? "Connecting…" : "Continue with wallet"}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-paper/35">
          Google creates a Circle-custodied wallet automatically — the agent never holds your keys.
        </p>
      </div>
    </main>
  );
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12.5 4 L6.5 10 L12.5 16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.27A12 12 0 0 0 0 12c0 1.94.47 3.77 1.27 5.38l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.62l4 3.1C6.22 6.87 8.87 4.76 12 4.76Z"
      />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-confirmed" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="2.5" y="6" width="19" height="13" rx="3" />
      <path d="M2.5 10 H21.5" strokeLinecap="round" />
      <circle cx="17" cy="14.2" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}
