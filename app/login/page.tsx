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
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-semibold">Đăng nhập</h1>
      <p className="text-sm text-slate-600">
        Google login sẽ tự tạo Agent Wallet (Circle smart account). Nếu dùng
        ví EVM, bạn kết nối trực tiếp ví hiện có.
      </p>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        type="button"
        disabled={loading !== null}
        className="rounded-lg border border-slate-300 px-4 py-2.5 hover:bg-slate-100 disabled:opacity-50"
        onClick={handleGoogleLogin}
      >
        {loading === "google" ? "Đang chuyển hướng..." : "Continue with Google"}
      </button>

      <button
        type="button"
        disabled={loading !== null}
        className="rounded-lg bg-slate-900 px-4 py-2.5 text-white hover:bg-slate-700 disabled:opacity-50"
        onClick={handleEvmLogin}
      >
        {loading === "evm" ? "Đang kết nối..." : "Connect EVM Wallet"}
      </button>
    </main>
  );
}
