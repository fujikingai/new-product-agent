/**
 * npm run run:from4
 * エージェント4〜6（product-planner→evaluator→editor）だけ再実行し、
 * Google Sheets保存（Ideas / IdeaDetails / BrandSummary / Runs）まで行う。
 *
 * outputs/01〜03 が最新の場合に Claude API 3呼び出し分で完了させるための省エネ実行。
 */
import * as fs from "fs";
import * as path from "path";
import { loadEnv, loadAppConfig } from "./config.js";
import { ensureOutputDir } from "./lib/file.js";
import { runProductPlanner } from "./agents/runProductPlanner.js";
import { runEvaluator } from "./agents/runEvaluator.js";
import { runEditor } from "./agents/runEditor.js";
import {
  fetchPastIdeasFromSheet,
  formatPastIdeasForPrompt,
  summarizePastCategoryFrequency,
  formatPastCategoryFrequencyForPrompt,
  filterHighScoringPastIdeas,
  formatHighScoringPastIdeasForPrompt,
  saveIdeasToSheet,
  saveIdeaDetailsToSheet,
  saveBrandSummaryToSheet,
  appendRunLog,
  type RunLogEntry,
} from "./lib/sheetsClient.js";

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
    emailStatus: "skipped",
    sheetsSuccess: false,
    error: "",
    reportPath: REPORT_PATH,
  };

  try {
    // ── Step 1: エージェント4〜6 実行 ──────────────────────────────────
    currentStep = "レポート生成（agent4〜6）";
    console.log("\n[1/3] エージェント4〜6 再実行中...");
    console.log("=".repeat(52));
    console.log(`  テーマ: ${config.businessTheme}`);
    console.log("  ※ outputs/01〜03 はそのまま再利用します");
    console.log("=".repeat(52));

    ensureOutputDir();

    const pastIdeas = await fetchPastIdeasFromSheet();
    if (pastIdeas.length > 0) {
      console.log(`[pipeline] 過去案 ${pastIdeas.length} 件を取得（重複回避に使用）`);
    }

    const pastIdeasText             = formatPastIdeasForPrompt(pastIdeas);
    const categoryFrequency         = summarizePastCategoryFrequency(pastIdeas);
    const pastCategoryFrequencyText = formatPastCategoryFrequencyForPrompt(categoryFrequency);
    const highScoringIdeas          = filterHighScoringPastIdeas(pastIdeas);
    const pastHighScoringText       = formatHighScoringPastIdeasForPrompt(highScoringIdeas);

    await runProductPlanner(config, pastIdeasText, pastCategoryFrequencyText, pastHighScoringText);
    await runEvaluator(config);
    await runEditor(config);

    runLog.generateSuccess = true;
    console.log("[1/3] エージェント4〜6 完了");

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
    console.log("  ✓ レポート生成（agent4〜6）");
    console.log("  ✓ スプレッドシート保存（Ideas / IdeaDetails / BrandSummary / Runs）");
    console.log("=".repeat(52));

  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error(`\n[ERROR] "${currentStep}" で失敗しました:`, error.message);
    runLog.error = `${currentStep}: ${error.message}`;

    try {
      await appendRunLog(runLog);
    } catch (sheetErr) {
      console.error(
        "[ERROR] Runs シートへの失敗ログ記録に失敗:",
        sheetErr instanceof Error ? sheetErr.message : sheetErr
      );
    }

    process.exit(1);
  }
}

main();
