-- AgentPay initial schema (v0.1)
-- Xem docs/TECHNICAL_SPEC_v0.1.md muc 4 de biet mo ta day du.

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  login_method text not null check (login_method in ('google', 'evm')),
  created_at timestamptz not null default now()
);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null check (type in ('circle_smart_account', 'external_evm')),
  address text not null,
  created_at timestamptz not null default now(),
  unique (address)
);

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  wallet_id uuid not null references public.wallets (id) on delete cascade,
  name text not null default 'My Agent',
  created_at timestamptz not null default now()
);

create table if not exists public.spending_policies (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete cascade,
  daily_limit_usdc numeric not null default 50,
  per_tx_limit_usdc numeric not null default 5,
  allowed_token text not null default 'USDC',
  allowed_network text not null default 'arc',
  require_approval_above_usdc numeric not null default 5,
  allowed_recipients jsonb not null default '"any"'::jsonb,
  updated_at timestamptz not null default now(),
  unique (agent_id)
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_usdc numeric not null,
  recipient_address text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete cascade,
  service_id uuid references public.services (id),
  recipient text not null,
  amount_usdc numeric not null,
  reason text,
  status text not null default 'created' check (
    status in (
      'created', 'policy_check', 'pending_user_approval',
      'approved', 'rejected', 'executing', 'confirmed', 'failed'
    )
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  payment_intent_id uuid not null references public.payment_intents (id) on delete cascade,
  tx_hash text not null,
  amount_usdc numeric not null,
  network text not null default 'arc',
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tx_hash)
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete cascade,
  payment_intent_id uuid references public.payment_intents (id),
  decision text not null,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.wallets enable row level security;
alter table public.agents enable row level security;
alter table public.spending_policies enable row level security;
alter table public.payment_intents enable row level security;
alter table public.transactions enable row level security;
alter table public.audit_log enable row level security;

create policy "users can view own row" on public.users
  for select using (auth.uid() = id);

create policy "users can manage own wallets" on public.wallets
  for all using (auth.uid() = user_id);

create policy "users can manage own agents" on public.agents
  for all using (auth.uid() = user_id);

create policy "users can manage own agent policy" on public.spending_policies
  for all using (
    agent_id in (select id from public.agents where user_id = auth.uid())
  );

create policy "users can view own payment intents" on public.payment_intents
  for all using (
    agent_id in (select id from public.agents where user_id = auth.uid())
  );

create policy "users can view own transactions" on public.transactions
  for select using (
    payment_intent_id in (
      select id from public.payment_intents
      where agent_id in (select id from public.agents where user_id = auth.uid())
    )
  );

create policy "users can view own audit log" on public.audit_log
  for select using (
    agent_id in (select id from public.agents where user_id = auth.uid())
  );
