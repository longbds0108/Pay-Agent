import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Dùng để các page/route kiểm tra TRƯỚC khi gọi Supabase, tránh crash cả
 * trang (Next.js dev overlay 500) khi NEXT_PUBLIC_SUPABASE_URL/PUBLISHABLE_KEY
 * chưa điền — hiện message hướng dẫn setup thay vì exception thô.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Gọi từ Server Component (không có quyền set cookie) — bỏ qua,
            // middleware.ts đã lo phần refresh session.
          }
        },
      },
    }
  );
}
