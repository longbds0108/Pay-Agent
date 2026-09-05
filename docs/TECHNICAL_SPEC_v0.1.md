# AgentPay — Technical Specification v0.1

> Nguồn gốc: tài liệu này tiếp nối trực tiếp cuộc trao đổi ý tưởng trên ChatGPT
> (https://chatgpt.com/share/6a9ae95c-cef4-83ec-9891-24b36dcc89b4), nơi ý tưởng
> "AgentPay" được chốt. Bước cuối của cuộc trò chuyện đó đề xuất viết đúng tài
> liệu này (spec v0.1) làm bước khởi động repo/code.

## 1. Product overview

**AgentPay = AI payment orchestration layer trên Arc**, cho phép user:

1. Đăng nhập bằng Google **hoặc** ví EVM.
2. Có một Agent Wallet (smart account) riêng, có thể nạp USDC.
3. Cấu hình **spending policy** (hạn mức ngày, hạn mức/giao dịch, token/network
   cho phép, ngưỡng cần duyệt tay).
4. Trò chuyện với AI Agent, agent hiểu yêu cầu thanh toán, tạo payment intent,
   kiểm tra policy, rồi tự thực hiện hoặc xin user duyệt trước khi thanh toán
   USDC trên Arc.
5. Xem lịch sử giao dịch / spend log.

User **không** đưa private key cho AI. AI chỉ được phép hành động trong phạm vi
policy do user thiết lập tường minh.

## 2. Kiến trúc tổng thể

```text
┌─────────────────────────────────────────────────────────────────┐
│                          USER LAYER                              │
│        Google Login                       EVM Wallet             │
└─────────────────────────┬─────────────────────┬──────────────────┘
                           │                     │
┌─────────────────────────▼─────────────────────▼──────────────────┐
│                   AUTH / IDENTITY LAYER                          │
│   Web2: Supabase Auth (Google OAuth)                              │
│   Web3: EIP-1193 wallet connect (wagmi/viem)                      │
└─────────────────────────┬──────────────────────────────────────┘
                           │
┌─────────────────────────▼──────────────────────────────────────┐
│                   SMART ACCOUNT LAYER                            │
│   Google user  → Circle Developer-Controlled Wallet (auto-tạo)   │
│   EVM user     → ví hiện có, connect trực tiếp                   │
└─────────────────────────┬──────────────────────────────────────┘
                           │
┌─────────────────────────▼──────────────────────────────────────┐
│                   AI ORCHESTRATION LAYER                         │
│   Nhận yêu cầu thanh toán (chat) → hiểu intent → tra service/giá │
│   → tạo Payment Intent (chưa thực thi)                           │
└─────────────────────────┬──────────────────────────────────────┘
                           │
┌─────────────────────────▼──────────────────────────────────────┐
│                       POLICY ENGINE                              │
│   Kiểm tra: daily limit / per-tx limit / allowed token & network │
│   / allowed recipients / require-approval threshold              │
│   → auto-approve  hoặc  → chờ user approve                       │
└─────────────────────────┬──────────────────────────────────────┘
                           │
┌─────────────────────────▼──────────────────────────────────────┐
│                  PAYMENT EXECUTION LAYER                         │
│   Circle Agent Wallet API / x402 nanopayments → Arc → USDC       │
│   → theo dõi confirmation → ghi transaction + spend log          │
└─────────────────────────┬──────────────────────────────────────┘
                           │
┌─────────────────────────▼──────────────────────────────────────┐
│                        DATA LAYER                                 │
│   Supabase (Postgres): users, wallets, policies, agents,          │
│   payment_intents, transactions, services, audit_log              │
└────────────────────────────────────────────────────────────────┘
```

## 3. Tech stack

| Layer | Lựa chọn |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Web2 Auth | Supabase Auth (Google provider) |
| Web3 Wallet | wagmi + viem (EIP-1193 injected connector) |
| Smart account (Web2 user) | Circle Developer-Controlled Wallets / Agent Wallet |
| Blockchain | Arc (testnet), USDC |
| Agent-to-service payment | x402 nanopayments |
| Backend | Next.js Route Handlers (Node.js runtime) |
| Database | Supabase / PostgreSQL |
| AI model | DeepSeek (chat completions, tương thích OpenAI, tool-calling) qua `lib/agent/deepseek.ts` |

## 4. Database schema (xem `supabase/migrations/0001_init.sql`)

Bảng chính:

- **users** — ánh xạ tới `auth.users` của Supabase, lưu `login_method`
  (`google` | `evm`).
- **wallets** — smart account / địa chỉ ví của user trên Arc, `type`
  (`circle_smart_account` | `external_evm`).
- **spending_policies** — daily_limit, per_tx_limit, allowed_token,
  allowed_network, require_approval_above, allowed_recipients (jsonb).
- **agents** — 1 agent AI / user (MVP: 1-1), liên kết wallet + policy.
- **payment_intents** — trạng thái theo state machine ở mục 5.
- **transactions** — giao dịch on-chain đã confirm, liên kết payment_intent.
- **services** — danh mục dịch vụ agent có thể trả phí (API, data...).
- **audit_log** — mọi quyết định của policy engine (approve/deny/hold).

## 5. Payment state machine

```text
created
   │
   ▼
policy_check
   │
   ├── within policy ─────────────► approved ──► executing ──► confirmed
   │                                                        └► failed
   └── over policy / needs approval
           │
           ▼
     pending_user_approval
           │
     ┌─────┴─────┐
     ▼           ▼
  approved     rejected
     │
     ▼
  executing ──► confirmed
           └──► failed
```

Trạng thái được lưu ở `payment_intents.status`:
`created | policy_check | pending_user_approval | approved | rejected |
executing | confirmed | failed`.

## 6. API contract (Next.js route handlers)

| Method & path | Mô tả |
|---|---|
| `POST /api/policy` | tạo/cập nhật spending policy của agent |
| `GET /api/policy` | lấy policy hiện tại |
| `POST /api/agent` | gửi tin nhắn cho AI agent, trả về phản hồi + payment intent (nếu có) |
| `POST /api/payments` | tạo payment intent thủ công (không qua chat) |
| `GET /api/payments` | lấy danh sách payment intents / lịch sử |
| `POST /api/payments/:id/approve` | user duyệt payment đang `pending_user_approval` |
| `POST /api/payments/:id/reject` | user từ chối |

## 7. User flow theo màn hình

1. **Login** — "Continue with Google" hoặc "Connect EVM Wallet".
2. **Dashboard (Agent Wallet)** — số dư USDC, daily/per-tx limit, nút
   Deposit/Withdraw.
3. **Agent (chat)** — chat với AI agent; agent trả lời kèm thẻ xác nhận
   thanh toán nếu cần (`[Approve] [Reject]`).
4. **Policy** — form chỉnh sửa spending policy.
5. **Transactions** — bảng lịch sử giao dịch + tổng chi.

## 8. MVP scope

**Có trong MVP:**
1. Google login → tự tạo smart account.
2. EVM wallet connect.
3. Nạp/xem số dư USDC (testnet).
4. Cấu hình spending policy.
5. Chat với AI agent.
6. Agent tạo payment intent.
7. Policy engine auto-approve / yêu cầu duyệt.
8. Màn hình duyệt thanh toán.
9. Thực thi thanh toán USDC trên Arc.
10. Lịch sử giao dịch.
11. Audit log cho mọi quyết định policy.
12. Danh mục service cơ bản (2–3 service demo) agent có thể trả phí.

**Không làm ở MVP** (để phase 2): multi-agent marketplace, subscription,
swap, bridge, DeFi phức tạp, autonomous contract execution, Agent-to-Agent
payment (đã bàn trong chat gốc như "wow factor" cho phase sau).

**x402 nanopayments (Circle Gateway) — đã build, xem `lib/agent/x402/`:**
ngoài đường thanh toán trực tiếp (chuyển USDC thẳng tới `recipient_address`
trong bảng `services`), agent còn có đường thứ hai: trả phí thật qua giao
thức x402 + Circle Gateway (sub-cent, gasless, gộp nhiều uỷ quyền ký off-chain
thành 1 lần settle on-chain) — tham khảo repo chính thức của Circle
[circlefin/arc-nanopayments](https://github.com/circlefin/arc-nanopayments) và
dùng thẳng SDK `@circle-fin/x402-batching` + `@x402/next` + `@x402/fetch`
(không tự viết lại phần giao thức/EIP-712).

- Server (bên "bán"): `app/api/x402/weather/route.ts` — endpoint demo, bọc
  bằng `withX402` (`@x402/next`) + `GatewayEvmScheme`/`BatchFacilitatorClient`
  (`@circle-fin/x402-batching/server`), trả HTTP 402 kèm payment requirements
  đúng chuẩn cho tới khi nhận được uỷ quyền hợp lệ.
- Client (bên "mua" — agent): `lib/agent/x402/payClient.ts` dùng
  `wrapFetchWithPayment` (`@x402/fetch`) + `registerBatchScheme`
  (`@circle-fin/x402-batching/client`) để tự dò 402 → ký → gọi lại.
- **Vẫn giữ nguyên tắc "agent không cầm private key"**: khác với repo tham
  khảo của Circle (ký bằng private key thô lưu trong `.env`), AgentPay ký uỷ
  quyền qua `signTypedData` của chính Circle Developer-Controlled Wallets
  (`lib/circle/agentWallet.ts`) — không có key thô nào rời khỏi Circle. Vì
  chữ ký từ smart account (SCA) là ERC-1271 còn EIP-3009 thường kỳ vọng chữ
  ký ECDSA kiểu EOA, mỗi agent có thêm 1 ví EOA riêng
  (`circle_gateway_eoa` — vẫn do Circle custody) chỉ dùng để ký cho Gateway,
  tách biệt với smart account chính đang giữ số dư có policy kiểm soát
  (`lib/agent/x402/gatewayWallet.ts`).
- Thanh toán x402 vẫn đi qua **đúng một** policy engine như thanh toán trực
  tiếp (`lib/payments/pipeline.ts` — `runPaymentPipeline` dùng chung, chỉ
  khác bước `execute`), không có đường vòng nào bỏ qua daily limit/per-tx
  limit/approval threshold.
- Danh mục tài nguyên x402 hiện giới hạn trong `lib/agent/x402/resources.ts`
  (chưa cho agent tự gọi URL bất kỳ do nội dung chat đưa ra) — mở rộng sang
  "khám phá" service x402 bất kỳ là bước tiếp theo hợp lý nhưng nằm ngoài
  phạm vi lần build này, để tránh mở mặt an toàn (agent gọi URL tuỳ ý) mà
  chưa có allowlist/kiểm duyệt.
- Đã kiểm chứng: chạy `/api/x402/weather` thật, nhận đúng HTTP 402 với
  payment requirements khớp cấu hình (network, amount, verifyingContract);
  ký thật qua Circle rồi xác minh chữ ký hợp lệ bằng `viem.verifyTypedData`.
  Chưa kiểm chứng: vòng thanh toán đầy đủ (deposit vào Gateway rồi settle
  thật) — cần USDC testnet thật trong ví Gateway (faucet) + Supabase để có
  agent context, cả hai đều chưa có ở môi trường build này.

## 9. Repo structure

```text
app/
  login/page.tsx
  dashboard/page.tsx
  agent/page.tsx
  policy/page.tsx
  transactions/page.tsx
  auth/callback/route.ts       # Google OAuth callback + onboarding
  api/
    policy/route.ts
    agent/route.ts
    payments/route.ts
    payments/[id]/approve/route.ts
    payments/[id]/reject/route.ts
    onboarding/route.ts        # onboarding cho EVM login (signInWithWeb3)
lib/
  supabase/         # supabase client (browser + server)
  arc/               # cấu hình chain Arc cho viem
  circle/            # client thật cho Circle Developer-Controlled Wallets
  agent/             # DeepSeek client (tool-calling) + danh mục dịch vụ
  policy/            # policy engine (đánh giá payment intent theo policy)
  payments/          # state machine + pipeline xử lý + query lịch sử
  onboarding.ts       # tạo user/wallet/agent/policy lần đăng nhập đầu
  currentAgent.ts      # đọc context agent hiện tại (dùng chung cho API routes)
scripts/circle-setup.ts # setup Circle 1 lần (entity secret + wallet set)
types/
middleware.ts          # refresh Supabase session
supabase/migrations/
  0001_init.sql
  0002_wallet_provider_id.sql   # thêm cột lưu wallet id nội bộ của Circle
  0003_seed_demo_services.sql   # danh mục dịch vụ demo
  0004_missing_insert_policies.sql # fix thiếu policy INSERT (users/audit_log/transactions)
docs/TECHNICAL_SPEC_v0.1.md
docs/SETUP.md            # hướng dẫn setup từ đầu (chưa có tài khoản nào)
```

## 10. Trạng thái triển khai (cập nhật 2026-09-05)

Toàn bộ code cho MVP scope (mục 8) đã được viết thật, không còn placeholder:
DeepSeek làm AI model (`lib/agent/deepseek.ts`, tool-calling), Circle
Developer-Controlled Wallets cho Agent Wallet (`lib/circle/agentWallet.ts`,
dùng SDK chính thức `@circle-fin/developer-controlled-wallets`), Arc testnet
RPC/chain id đã điền sẵn theo docs.arc.io (`lib/arc/chain.ts`), policy
pipeline đầy đủ (`lib/payments/pipeline.ts`, `lib/payments/execute.ts`),
onboarding tự động tạo wallet/agent/policy sau đăng nhập
(`lib/onboarding.ts`), và 4 migration Supabase (schema gốc + fix RLS insert
policy còn thiếu + seed danh mục dịch vụ demo). `npm run build` và
`npm run typecheck` đều pass.

**Việc còn lại chỉ là tạo tài khoản ở dịch vụ bên ngoài** (không cần sửa
code) — xem hướng dẫn từng bước ở `docs/SETUP.md`:

- Tạo project Supabase, chạy 4 migration, bật Google + Web3 Wallet provider
  trong Supabase Auth, điền `NEXT_PUBLIC_SUPABASE_URL` /
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SERVICE_ROLE_KEY`.
- Đăng ký Google OAuth client (Google Cloud Console), cấu hình provider
  trong Supabase Auth.
- Đăng ký Circle Developer account, lấy `CIRCLE_API_KEY`, chạy
  `npm run circle:setup` để tạo `CIRCLE_ENTITY_SECRET` + `CIRCLE_WALLET_SET_ID`.
- Lấy `DEEPSEEK_API_KEY` tại platform.deepseek.com.

Giới hạn đã biết (xem chi tiết cuối `docs/SETUP.md`): agent chỉ tự động gửi
tiền được cho ví `circle_smart_account` (Google login) — ví EVM ngoài đăng
nhập được nhưng cần chính user ký, chưa tự động ở MVP này; danh mục dịch vụ
hiện là 3 service demo/mock, chưa tích hợp dịch vụ trả phí thật.
