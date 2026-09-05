/**
 * Script setup một lần cho Circle Developer-Controlled Wallets:
 *   1. Tạo Entity Secret (nếu chưa có) — 32 byte ngẫu nhiên, hex-encode.
 *   2. Đăng ký entity secret với Circle (registerEntitySecretCiphertext) và
 *      lưu recovery file.
 *   3. Tạo 1 wallet set dùng chung cho toàn bộ user Google của AgentPay.
 *   4. In ra CIRCLE_ENTITY_SECRET / CIRCLE_WALLET_SET_ID để dán vào .env.local.
 *
 * Chạy: `npm run circle:setup` (sau khi đã điền CIRCLE_API_KEY vào .env.local).
 *
 * Yêu cầu: đã có tài khoản Circle Developer (https://console.circle.com),
 * đã lấy API key ở Web3 Services > API Keys (dùng key môi trường Testnet/Sandbox).
 */
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  initiateDeveloperControlledWalletsClient,
  registerEntitySecretCiphertext,
} from "@circle-fin/developer-controlled-wallets";

function loadEnvLocal(): void {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

async function main() {
  loadEnvLocal();

  const apiKey = process.env.CIRCLE_API_KEY;
  if (!apiKey) {
    console.error(
      "Thiếu CIRCLE_API_KEY trong .env.local. Lấy key ở https://console.circle.com " +
        "(Web3 Services > API Keys), điền vào .env.local rồi chạy lại `npm run circle:setup`."
    );
    process.exit(1);
  }

  let entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  if (entitySecret) {
    console.log("Dùng CIRCLE_ENTITY_SECRET đã có sẵn trong .env.local (bỏ qua bước tạo mới).");
  } else {
    entitySecret = randomBytes(32).toString("hex");
    console.log("\n=== Entity Secret mới (LƯU LẠI NGAY — sẽ không hiện lại lần sau) ===");
    console.log(entitySecret);
  }

  // SDK coi recoveryFileDownloadPath là một THƯ MỤC (tự đặt tên file
  // recovery_file_<uuid>.dat bên trong) — phải tồn tại sẵn trước khi gọi,
  // SDK không tự tạo thư mục.
  const recoveryDir = resolve(process.cwd(), "circle-recovery");
  mkdirSync(recoveryDir, { recursive: true });

  console.log("\nĐang đăng ký entity secret với Circle...");
  await registerEntitySecretCiphertext({
    apiKey,
    entitySecret,
    recoveryFileDownloadPath: recoveryDir,
  });
  console.log(
    `Đăng ký xong. Recovery file đã lưu trong ${recoveryDir}/ — ` +
      "GIỮ FILE NÀY AN TOÀN, KHÔNG commit vào git (đã có trong .gitignore), " +
      "dùng để khôi phục nếu mất entity secret."
  );

  const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });

  console.log("\nĐang tạo wallet set cho AgentPay...");
  const walletSetResponse = await client.createWalletSet({ name: "AgentPay" });
  const walletSetId = walletSetResponse.data?.walletSet?.id;

  if (!walletSetId) {
    throw new Error("Circle không trả về walletSetId (createWalletSet).");
  }

  console.log("\n=== Dán các dòng sau vào .env.local ===");
  console.log(`CIRCLE_ENTITY_SECRET=${entitySecret}`);
  console.log(`CIRCLE_WALLET_SET_ID=${walletSetId}`);
  console.log("\nXong bước Circle. Xem docs/SETUP.md để tiếp tục các bước còn lại.");
}

main().catch((err) => {
  console.error("\ncircle:setup thất bại:", err);
  process.exit(1);
});
