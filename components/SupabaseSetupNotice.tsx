/** Hiện khi NEXT_PUBLIC_SUPABASE_URL/ANON_KEY chưa cấu hình — dùng ở các trang cần Supabase. */
export function SupabaseSetupNotice() {
  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        <p className="font-semibold">Chưa cấu hình Supabase</p>
        <p className="mt-2">
          Trang này cần <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_SUPABASE_URL</code> và{" "}
          <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> trong{" "}
          <code className="rounded bg-amber-100 px-1">.env.local</code> — xem mục 1 trong{" "}
          <code className="rounded bg-amber-100 px-1">docs/SETUP.md</code>.
        </p>
      </div>
    </main>
  );
}
