# AgentPay

AI agent payment orchestration layer trên Arc: user đăng nhập bằng Google
hoặc ví EVM, có một Agent Wallet với spending policy riêng, và AI agent tự
thanh toán USDC trên Arc trong phạm vi policy đó.

Dự án này bắt đầu từ một buổi brainstorm trên ChatGPT
(https://chatgpt.com/share/6a9ae95c-cef4-83ec-9891-24b36dcc89b4). Xem
[docs/TECHNICAL_SPEC_v0.1.md](docs/TECHNICAL_SPEC_v0.1.md) để biết kiến trúc
đầy đủ, database schema, API contract và user flow.

## Trạng thái hiện tại

Toàn bộ luồng MVP đã có code thật (không còn placeholder): đăng nhập Google
(tự tạo Agent Wallet qua Circle Developer-Controlled Wallets) hoặc ví EVM
(qua `signInWithWeb3`), chat với agent (DeepSeek, tool-calling để đề xuất
thanh toán trong danh mục dịch vụ), policy engine auto-approve/require
approval/deny, thực thi USDC thật trên Arc testnet qua Circle, và lịch sử
giao dịch. Build (`npm run build`) và `npm run typecheck` đều pass.

Phần còn lại **không nằm trong code** — chỉ là tạo tài khoản ở các dịch vụ
bên ngoài (Supabase, Google Cloud, Circle Developer, DeepSeek) rồi điền
`.env.local`. Xem **[docs/SETUP.md](docs/SETUP.md)** để làm từ đầu, từng
bước một, kể cả khi bạn chưa có tài khoản nào.

Giới hạn đã biết: ví EVM ngoài đăng nhập được nhưng agent chưa tự gửi tiền
thay được (cần backend giữ khoá, chỉ smart account do Circle quản lý mới làm
được điều này); danh mục dịch vụ hiện là 3 service demo/mock. Chi tiết ở
cuối `docs/SETUP.md`.

## Getting started

```bash
npm install --legacy-peer-deps
cp .env.example .env.local   # rồi điền theo docs/SETUP.md
npm run circle:setup         # setup Circle entity secret + wallet set (1 lần)
npm run dev
```

## Cấu trúc

- `app/` — các trang Next.js App Router (login, dashboard, agent chat,
  policy, transactions) + API route handlers (`agent`, `policy`, `payments`,
  `payments/[id]/approve|reject`, `onboarding`) + `auth/callback` (Google OAuth).
- `lib/agent/` — client DeepSeek (chat + tool-calling) và danh mục dịch vụ.
- `lib/policy/engine.ts` — logic đánh giá payment intent theo spending
  policy (auto-approve / cần duyệt / từ chối).
- `lib/payments/` — state machine, pipeline xử lý payment intent
  (tạo → policy check → duyệt/từ chối → thực thi), và query lịch sử.
- `lib/circle/agentWallet.ts` — client thật cho Circle Developer-Controlled
  Wallets (tạo smart account, xem số dư, gửi USDC trên Arc).
- `lib/onboarding.ts`, `lib/currentAgent.ts` — tạo user/wallet/agent/policy
  lần đăng nhập đầu, và đọc context agent hiện tại cho các route API.
- `lib/supabase/` — Supabase client (browser + server), `middleware.ts` —
  refresh session.
- `lib/arc/chain.ts` — cấu hình chain Arc testnet cho viem (RPC/chain id đã
  điền sẵn theo docs.arc.io).
- `scripts/circle-setup.ts` — script setup Circle 1 lần (`npm run circle:setup`).
- `supabase/migrations/` — database schema + 2 migration fix RLS (insert
  policy còn thiếu) + seed danh mục dịch vụ demo.
