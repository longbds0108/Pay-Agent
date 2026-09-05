import { NextResponse } from "next/server";
import { ensureOnboarded } from "@/lib/onboarding";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * Gọi từ client ngay sau khi `supabase.auth.signInWithWeb3({chain:'ethereum'})`
 * thành công (đăng nhập bằng ví EVM) — tạo users/wallet(external_evm)/agent/
 * policy nếu đây là lần đăng nhập đầu. Google login dùng /auth/callback thay
 * vì flow đó là redirect-based (không gọi được route này trực tiếp từ client
 * trước khi có session).
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Chưa cấu hình Supabase — xem docs/SETUP.md mục 1." }, { status: 503 });
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const address = typeof body.address === "string" ? body.address : undefined;

  if (!address) {
    return NextResponse.json({ error: "Thiếu địa chỉ ví (address)." }, { status: 400 });
  }

  try {
    const result = await ensureOnboarded(supabase, user.id, "evm", address);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Onboarding thất bại sau EVM login:", err);
    return NextResponse.json({ error: "Không hoàn tất được onboarding." }, { status: 500 });
  }
}
