-- Ho tro Circle Gateway nanopayments (x402): moi agent co the co them 1 vi phu
-- kieu EOA (khong phai smart account chinh) chuyen dung de ky uy quyen
-- EIP-3009 cho Circle Gateway. Van do Circle custody hoan toan (khong co
-- private key tho nao roi khoi Circle) -- xem lib/agent/x402/gatewayWallet.ts.
--
-- Vi sao can vi EOA rieng thay vi dung thang smart account (SCA) hien co:
-- chu ky tu SCA la ERC-1271 (contract-based), trong khi EIP-3009
-- transferWithAuthorization ma cac hop dong USDC/GatewayWallet dung de xac
-- thuc thuong ky vong chu ky ECDSA kieu EOA (ecrecover). Dung vi EOA rieng
-- (van do Circle giu key) de chac chan tuong thich, thay vi phu thuoc vao
-- viec GatewayWallet co ho tro ERC-1271 hay khong.

alter table public.wallets drop constraint if exists wallets_type_check;
alter table public.wallets add constraint wallets_type_check
  check (type in ('circle_smart_account', 'external_evm', 'circle_gateway_eoa'));

alter table public.agents
  add column if not exists gateway_wallet_id uuid references public.wallets (id);

comment on column public.agents.gateway_wallet_id is
  'Vi EOA phu (circle_gateway_eoa) dung rieng cho Circle Gateway nanopayments (x402). NULL cho den lan dau agent can thanh toan x402.';
