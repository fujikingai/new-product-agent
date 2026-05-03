/**
 * npm run run:report
 * レポート生成 → Google Sheets保存（Ideas / IdeaDetails / BrandSummary / Runs）を一括実行するワークフロー。
 * メール送信は行わない。
 * 途中失敗時は Runs シートに failure ログを記録して exit(1)。
 */
import * as fs from "fs";
import * as path from "path";
import { loadEnv, loadAppConfig } from "./config.js";
import { runFullPipeline } from "./lib/pipeline.js";
import { saveIdeasToSheet, saveIdeaDetailsToSheet, saveBrandSummaryToSheet, appendRunLog, type RunLogEntry } from "./lib/sheetsClient.js";

const REPORT_PATH = path.resolve(process.cwd(), "reports/daily-report.md");

async function main(): Promise<void> {
  loadEnv();
  const config = loadAppConfig();

  const timestamp = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  let currentStep = "初期化";

  const runLog: RunLogEntry = {
    timestamp,
    status: "failure",
    generateSuccess: false,
    emailStatus: "skipped",  // run:report ではメール送信を行わない
    sheetsSuccess: false,
    error: "",
    reportPath: REPORT_PATH,
  };

  try {
    // ── Step 1: レポート生成 ────────────────────────────────────────
    currentStep = "レポート生成";
    console.log("\n[1/3] レポート生成中...");
    console.log("=".repeat(52));
    console.log(`  テーマ: ${config.businessTheme}`);
    console.log("=".repeat(52));
    await runFullPipeline(config);
    runLog.generateSuccess = true;
    console.log("[1/3] レポート生成完了");

    // ── Step 2: レポートファイル確認 ────────────────────────────────
    currentStep = "レポートファイル確認";
    if (!fs.existsSync(REPORT_PATH)) {
      throw new Error(`レポートファイルが見つかりません: ${REPORT_PATH}`);
    }

    // ── Step 3: Google Sheets 保存 ──────────────────────────────────
    currentStep = "スプレッドシート保存";
    console.log("\n[2/3] スプレッドシートに保存中...");
    await saveIdeasToSheet(timestamp);
    await saveIdeaDetailsToSheet(timestamp);
    await saveBrandSummaryToSheet(timestamp);
    runLog.sheetsSuccess = true;
    console.log("[2/3] スプレッドシート保存完了");

    // ── 成功ログ ──────────────────────────────────────────────────
    runLog.status = "success";
    await appendRunLog(runLog);

    console.log("\n[3/3] ワークフロー完了！");
    console.log("=".repeat(52));
    console.log("  ✓ レポート生成");
    console.log("  ✓ スプレッドシート保存（Ideas / IdeaDetails / BrandSummary / Runs）");
    console.log("=".repeat(52));

  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error(`\n[ERROR] "${currentStep}" で失敗しました:`, error.message);
    runLog.error = `${currentStep}: ${error.message}`;

    // Runs シートに失敗ログを記録（失敗しても続行してコンソールにエラーを出す）
    try {
      await appendRunLog(runLog);
    } catch (sheetErr) {
      console.error(
        "[ERROR] Runs シートへの失敗ログ記録に失敗（Sheets 接続を確認してください）:",
        sheetErr instanceof Error ? sheetErr.message : sheetErr
      );
    }

    process.exit(1);
  }
}

main();
