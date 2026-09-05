-- Danh muc dich vu demo de agent co the "tra tien" va chay thu toan bo flow
-- (chat -> policy check -> thanh toan -> xac nhan) ma khong can tich hop
-- mot API tra phi that. Dia chi nhan la placeholder tren Arc testnet (an
-- toan, khong co gia tri that) — thay bang dia chi that khi ban co dich vu
-- that muon tich hop.
--
-- Day la lua chon mac dinh (mock services) vi luc viet migration nay ban
-- chua co tai khoan Circle/Supabase that va chua chon dich vu that cu the.
-- Neu muon dung dich vu that, sua/xoa cac dong insert ben duoi.

do $$
begin
  alter table public.services add constraint services_name_unique unique (name);
exception
  -- Postgres bao loi duplicate_table (42P07, khong phai duplicate_object)
  -- cho index ngam dinh cua UNIQUE constraint da ton tai san.
  when duplicate_table or duplicate_object then null;
end $$;

insert into public.services (name, description, price_usdc, recipient_address)
values
  (
    'Weather API (demo)',
    'Du lieu thoi tiet hom nay cho 1 thanh pho. Demo service, khong goi API that.',
    0.50,
    '0x00000000000000000000000000000000000000A1'
  ),
  (
    'Joke API (demo)',
    'Mot cau joke ngau nhien. Demo service, khong goi API that.',
    0.10,
    '0x00000000000000000000000000000000000000A2'
  ),
  (
    'Translate API (demo)',
    'Dich mot doan van ban ngan sang tieng Anh. Demo service, khong goi API that.',
    0.25,
    '0x00000000000000000000000000000000000000A3'
  )
on conflict (name) do nothing;
