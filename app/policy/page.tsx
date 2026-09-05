"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AppSidebar } from "@/components/AppSidebar";

interface PolicyForm {
  dailyLimitUsdc: number;
  perTxLimitUsdc: number;
  requireApprovalAboveUsdc: number;
}

const DEFAULT_FORM: PolicyForm = { dailyLimitUsdc: 50, perTxLimitUsdc: 5, requireApprovalAboveUsdc: 5 };

export default function PolicyPage() {
  const [form, setForm] = useState<PolicyForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/policy")
      .then((res) => res.json())
      .then((data) => {
        if (data.policy) {
          setForm({
            dailyLimitUsdc: data.policy.dailyLimitUsdc,
            perTxLimitUsdc: data.policy.perTxLimitUsdc,
            requireApprovalAboveUsdc: data.policy.requireApprovalAboveUsdc,
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/policy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSaving(false);
    setMessage(res.ok ? "Đã lưu policy." : "Lưu thất bại, thử lại.");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col md:flex-row">
        <AppSidebar />
        <main className="mx-auto max-w-lg px-6 py-10 text-slate-500">Đang tải...</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AppSidebar />
      <main className="mx-auto w-full max-w-lg px-6 py-10">
        <h1 className="mb-6 text-2xl font-semibold">Spending Policy</h1>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm text-slate-600">Daily limit (USDC)</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={form.dailyLimitUsdc}
            onChange={(e) => setForm((f) => ({ ...f, dailyLimitUsdc: Number(e.target.value) }))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-600">Per-transaction limit (USDC)</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={form.perTxLimitUsdc}
            onChange={(e) => setForm((f) => ({ ...f, perTxLimitUsdc: Number(e.target.value) }))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-600">Require approval above (USDC)</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={form.requireApprovalAboveUsdc}
            onChange={(e) => setForm((f) => ({ ...f, requireApprovalAboveUsdc: Number(e.target.value) }))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {saving ? "Đang lưu..." : "Save policy"}
        </button>
        {message && <p className="text-sm text-slate-600">{message}</p>}
      </form>

      <div className="mt-8 rounded-lg border border-dashed border-slate-300 p-4 opacity-70">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">Tự động sinh lãi từ USDC nhàn rỗi</p>
            <p className="mt-1 text-xs text-slate-500">
              Số USDC agent chưa dùng tới hạn mức sẽ tự động gửi vào các protocol DeFi uy tín (Aave, Curve) để
              sinh lãi, rút lại đúng lúc agent cần chi.
            </p>
          </div>
          <label className="inline-flex shrink-0 cursor-not-allowed items-center">
            <input type="checkbox" disabled className="peer sr-only" />
            <span className="relative block h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:content-['']" />
          </label>
        </div>
        <span className="mt-3 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
          Coming soon — chưa hoạt động
        </span>
      </div>
      </main>
    </div>
  );
}
