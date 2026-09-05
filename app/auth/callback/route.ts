import { NextResponse } from "next/server";
import { ensureOnboarded } from "@/lib/onboarding";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Callback cho Supabase Auth (Google OAuth, PKCE flow). Sau khi đổi code lấy
 * session, tạo luôn users/wallet/agent/policy nếu đây là lần đăng nhập đầu
 * (xem lib/onboarding.ts).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(new URL("/login?error=auth_failed", url.origin));
  }

  try {
    await ensureOnboarded(supabase, data.user.id, "google");
  } catch (err) {
    console.error("Onboarding thất bại sau Google login:", err);
    return NextResponse.redirect(new URL("/login?error=onboarding_failed", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
