/**
 * npm run save:sheet
 * 既存の reports/daily-report.md と outputs/05-evaluation.md を読み込み、
 * Google スプレッドシートに10案サマリーと手動実行ログを追記するスタンドアロンスクリプト。
 * Claude API は呼ばない。
 */
import { loadEnv } from "./config.js";
import { saveIdeasToSheet, saveIdeaDetailsToSheet, saveBrandSummaryToSheet, appendRunLog } from "./lib/sheetsClient.js";

loadEnv();

const runDate = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

console.log("[save:sheet] Googleスプレッドシートへの保存を開始します...");

Promise.resolve()
  .then(() => saveIdeasToSheet(runDate))
  .then(() => saveIdeaDetailsToSheet(runDate))
  .then(() => saveBrandSummaryToSheet(runDate))
  .then(() =>
    appendRunLog({
      timestamp: runDate,
      status: "success",
      generateSuccess: true,  // 手動実行なので既存ファイルを使用
      emailStatus: "skipped",   // save:sheet ではメール送信を行わない
      sheetsSuccess: true,
      error: "",
      reportPath: "reports/daily-report.md",
    })
  )
  .then(() => {
    console.log("[save:sheet] 完了");
  })
  .catch((err: unknown) => {
    console.error("[save:sheet] 失敗:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
