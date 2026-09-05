-- Them cot luu id noi bo cua Circle Developer-Controlled Wallets cho moi wallet
-- (can thiet de goi getWalletTokenBalance / createTransaction, vi cac ham nay
-- yeu cau wallet id do Circle cap, khong dung dia chi on-chain truc tiep).
-- Voi vi EVM ben ngoai (external_evm), cot nay de NULL.

alter table public.wallets
  add column if not exists provider_wallet_id text;

comment on column public.wallets.provider_wallet_id is
  'Circle Developer-Controlled Wallets internal wallet id (uuid). NULL cho external_evm.';
