# AgentPay — Setup từ đầu (chưa có tài khoản nào)

Tài liệu này dành cho trường hợp bạn **chưa có** Supabase project, Google
OAuth client, hay tài khoản Circle Developer — làm theo đúng thứ tự bên dưới.
Toàn bộ code (API routes, policy engine, Circle wallet client, DeepSeek
agent...) đã được viết sẵn và build/typecheck qua; phần còn lại chỉ là tạo
tài khoản/khoá ở các dịch vụ bên ngoài rồi điền vào `.env.local`.

## 0. Cài dependencies

```bash
npm install --legacy-peer-deps
```

(`--legacy-peer-deps` cần vì `@circle-fin/developer-controlled-wallets` có
xung đột peer dependency nội bộ với các gói Solana của chính nó — không liên
quan tới phần còn lại của project.)

## 1. Supabase (Auth + Database)

1. Tạo project tại <https://supabase.com/dashboard> (chọn region gần bạn).
2. Vào **Project Settings > API**, copy 3 giá trị vào `.env.local`:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (chưa dùng trong code
     MVP, để dành cho tác vụ admin sau này — không commit key này lên git).
3. Vào **SQL Editor**, chạy lần lượt 5 file trong `supabase/migrations/`
   theo đúng thứ tự (0001 → 0005). Nếu dùng Supabase CLI thay vì dashboard:
   ```bash
   supabase link --project-ref <project-ref>
   supabase db push
   ```
4. Vào **Authentication > Sign In / Providers**:
   - Bật **Google** (cần Google OAuth client — bước 2 bên dưới) để đăng nhập
     bằng Google tự tạo Agent Wallet.
   - Bật **Web3 Wallet** (Ethereum) để hỗ trợ "Connect EVM Wallet" qua
     `signInWithWeb3` (tính năng Sign-In-With-Ethereum của Supabase Auth).
     Nếu không thấy mục này trong dashboard (tính năng có thể còn giới hạn
     theo plan/version), báo lại — có thể cần dùng flow SIWE thủ công thay
     thế, MVP hiện chỉ code theo API `signInWithWeb3` có sẵn.

## 2. Google OAuth client (cho đăng nhập Google)

1. Vào <https://console.cloud.google.com/apis/credentials>, tạo project mới
   (hoặc dùng project có sẵn).
2. Cấu hình **OAuth consent screen** (External, thêm email test nếu ở chế độ
   Testing).
3. Tạo **OAuth client ID** loại **Web application**. Authorized redirect URI
   điền chính xác:
   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```
   (lấy `<project-ref>` từ Supabase Project URL ở bước 1).
4. Copy **Client ID** + **Client Secret**, dán vào Supabase **Authentication
   > Providers > Google**.

## 3. Circle Developer-Controlled Wallets (Agent Wallet cho user Google)

1. Đăng ký tài khoản tại <https://console.circle.com>, chọn môi trường
   **Sandbox/Testnet**.
2. Vào **Web3 Services > API Keys**, tạo API key, điền vào `.env.local`:
   ```
   CIRCLE_API_KEY=...
   ```
3. Chạy script setup (tự tạo entity secret, đăng ký với Circle, tạo 1 wallet
   set dùng chung cho toàn bộ user Google của app):
   ```bash
   npm run circle:setup
   ```
   Script in ra `CIRCLE_ENTITY_SECRET` và `CIRCLE_WALLET_SET_ID` — dán cả hai
   vào `.env.local`. Script cũng lưu 1 **recovery file**
   (`circle-recovery-file.dat`, đã có trong `.gitignore`) — **giữ file này an
   toàn**, cần để khôi phục nếu mất entity secret. Không chạy lại script này
   một khi đã có `CIRCLE_ENTITY_SECRET` (sẽ tạo thêm wallet set mới không cần
   thiết) — script tự phát hiện và bỏ qua bước tạo entity secret nếu biến env
   đã có sẵn, nhưng vẫn tạo wallet set mới mỗi lần chạy, nên chỉ chạy 1 lần.
4. Blockchain dùng là `ARC-TESTNET` (đã xác nhận được Circle hỗ trợ). Sau khi
   đăng nhập Google lần đầu trong app, vào <https://faucet.circle.com>, dán
   địa chỉ ví hiển thị ở trang Dashboard để nhận USDC testnet (Arc dùng thẳng
   USDC làm gas token).

## 4. DeepSeek (AI model cho agent)

1. Lấy API key tại <https://platform.deepseek.com/api_keys>.
2. Điền vào `.env.local`:
   ```
   DEEPSEEK_API_KEY=...
   DEEPSEEK_MODEL=deepseek-v4-flash
   ```
   Nếu DeepSeek đổi tên model sau thời điểm bạn đọc tài liệu này, kiểm tra
   lại tại <https://api-docs.deepseek.com> và sửa `DEEPSEEK_MODEL` tương ứng
   — code không hardcode tên model ngoài giá trị mặc định này.

## 5. x402 nanopayments (Circle Gateway) — tuỳ chọn

Điền thêm 2 giá trị này nếu muốn agent trả phí qua endpoint x402 demo
(`pay_x402_resource`, xem mục "x402 nanopayments" trong
`docs/TECHNICAL_SPEC_v0.1.md`):

```
NEXT_PUBLIC_APP_URL=http://localhost:3000   # đổi thành domain thật khi deploy
X402_SELLER_ADDRESS=                        # để trống dùng placeholder demo
```

Ví Gateway (`circle_gateway_eoa`) của mỗi agent được tạo tự động ở lần thanh
toán x402 đầu tiên — không cần bước setup thủ công riêng. Nếu ví Gateway
chưa có USDC, agent sẽ tự chuyển một khoản nhỏ từ smart account chính sang
(qua `sendUsdc`), miễn smart account chính đã có USDC (nạp qua
faucet.circle.com như mục 6 bên dưới).

## 6. Chạy thử

```bash
cp .env.example .env.local   # rồi điền các giá trị ở trên
npm run dev
```

Luồng demo đầy đủ:

1. Vào `/login` → Continue with Google.
2. `/dashboard` → thấy địa chỉ Agent Wallet + số dư 0 USDC → nạp qua
   faucet.circle.com.
3. `/policy` → chỉnh daily limit / per-tx limit / require-approval threshold.
4. `/agent` → gõ ví dụ: *"Pay the weather API for today's data"*. Agent
   (DeepSeek) sẽ nhận diện dịch vụ trong danh mục demo (`Weather API`, `Joke
   API`, `Translate API` — xem `supabase/migrations/0003_seed_demo_services.sql`),
   tạo payment intent, chạy qua policy engine:
   - Trong hạn mức & dưới ngưỡng duyệt → tự động thanh toán, hiện tx hash.
   - Vượt ngưỡng require-approval nhưng trong daily/per-tx limit → hiện nút
     **Approve/Reject**.
   - Vượt daily/per-tx limit → bị từ chối, kèm lý do.
5. Muốn thử x402 thật thay vì chuyển khoản trực tiếp: gõ *"Lấy thời tiết qua
   x402"* — agent gọi `pay_x402_resource`, trả phí 0.001 USDC cho
   `/api/x402/weather` qua Circle Gateway (không tốn gas, gộp settlement),
   vẫn qua đúng policy engine như trên.
5. `/transactions` → xem lịch sử, link sang Arcscan testnet.

## Giới hạn đã biết ở MVP này

- **Ví EVM ngoài (Connect EVM Wallet)**: đăng nhập được (qua
  `signInWithWeb3`), nhưng agent **không tự động gửi tiền thay** được cho ví
  loại này — backend không giữ private key của ví ngoài. `executePayment`
  (`lib/payments/execute.ts`) sẽ đánh dấu payment `failed` kèm lý do rõ ràng
  thay vì giả vờ thành công. Muốn hỗ trợ thật, cần thêm bước ký giao dịch
  phía client (viem/wagmi + `window.ethereum`) — chưa nằm trong scope MVP này.
- **Danh mục dịch vụ là mock** (3 service demo, không gọi API thật) — vì lúc
  viết code chưa chọn dịch vụ thật cụ thể. Thay dữ liệu trong
  `supabase/migrations/0003_seed_demo_services.sql` hoặc thêm row mới vào
  bảng `services` khi có dịch vụ thật.
- Theo đúng scope MVP trong `docs/TECHNICAL_SPEC_v0.1.md` mục 8: chưa có
  multi-agent marketplace, subscription, swap/bridge, Agent-to-Agent payment
  — để phase 2.
