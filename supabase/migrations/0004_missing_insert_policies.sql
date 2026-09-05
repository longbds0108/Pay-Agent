-- Fix: migration 0001 chi tao policy SELECT cho users/audit_log/transactions.
-- Voi RLS bat (enable row level security) va khong co policy INSERT, moi lenh
-- INSERT tu client (anon/authenticated key, qua PostgREST/Supabase client) se
-- bi tu choi mac dinh — chan toan bo luong onboarding (tao users row) va ghi
-- audit log / transaction sau khi thuc thi thanh toan. Them cac policy INSERT
-- con thieu, giu nguyen nguyen tac "user chi thao tac tren du lieu cua chinh minh".

drop policy if exists "users can insert own row" on public.users;
create policy "users can insert own row" on public.users
  for insert with check (auth.uid() = id);

drop policy if exists "users can insert own audit log" on public.audit_log;
create policy "users can insert own audit log" on public.audit_log
  for insert with check (
    agent_id in (select id from public.agents where user_id = auth.uid())
  );

drop policy if exists "users can insert own transactions" on public.transactions;
create policy "users can insert own transactions" on public.transactions
  for insert with check (
    payment_intent_id in (
      select id from public.payment_intents
      where agent_id in (select id from public.agents where user_id = auth.uid())
    )
  );
