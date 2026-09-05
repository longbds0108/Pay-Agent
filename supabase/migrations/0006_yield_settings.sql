-- Chuan bi schema cho tinh nang "Idle Fund Yielding" (gui USDC nhan roi vao
-- cac protocol DeFi nhu Aave/Curve de sinh lai) -- UI hien tai chi hien
-- "Coming soon", CHUA co logic that ket noi DeFi nao. Them cot ngay tu bay
-- gio de khong can them 1 migration nua khi tinh nang duoc bat that.
--
-- Ly do chua build phan ket noi that: Aave/Curve moi dang thu nghiem tren
-- Arc testnet, viec Aave trien khai that (V4) len Arc van dang o buoc de
-- xuat governance, chua duoc duyet -- chua co dia chi contract nao xac nhan
-- on dinh de tich hop an toan (xem docs/TECHNICAL_SPEC_v0.1.md).

alter table public.spending_policies
  add column if not exists yield_enabled boolean not null default false;

comment on column public.spending_policies.yield_enabled is
  'Bat/tat tu dong sinh lai tu USDC nhan roi (Idle Fund Yielding). Coming soon -- chua co logic that, luon la false o MVP nay.';
