/**
 * npm run send:report
 * 既存の reports/daily-report.md をGmailで送信するスタンドアロンスクリプト。
 * Claude API は呼ばない。
 */
import { loadEnv } from "./config.js";
import { sendReport } from "./lib/mailer.js";

loadEnv();

console.log("[send:report] メール送信を開始します...");
sendReport()
  .then(() => {
    console.log("[send:report] 送信完了");
  })
  .catch((err: unknown) => {
    console.error("[send:report] 送信失敗:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
