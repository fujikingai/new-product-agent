import { ensureOutputDir } from "./file.js";
import { runMarketResearcher } from "../agents/runMarketResearcher.js";
import { runCompetitorResearcher } from "../agents/runCompetitorResearcher.js";
import { runTrendResearcher } from "../agents/runTrendResearcher.js";
import { runProductPlanner } from "../agents/runProductPlanner.js";
import { runEvaluator } from "../agents/runEvaluator.js";
import { runEditor } from "../agents/runEditor.js";
import {
  fetchPastIdeasFromSheet,
  formatPastIdeasForPrompt,
  summarizePastCategoryFrequency,
  formatPastCategoryFrequencyForPrompt,
  filterHighScoringPastIdeas,
  formatHighScoringPastIdeasForPrompt,
} from "./sheetsClient.js";
import type { AppConfig } from "../types.js";

/**
 * 全6エージェントを順番に実行してレポートを生成する。
 * src/index.ts と src/runReportWorkflow.ts の両方から呼び出せる共通パイプライン。
 */
export async function runFullPipeline(config: AppConfig): Promise<void> {
  ensureOutputDir();
  await runMarketResearcher(config);
  await runCompetitorResearcher(config);
  await runTrendResearcher(config);

  const pastIdeas = await fetchPastIdeasFromSheet();
  if (pastIdeas.length > 0) {
    console.log(`[pipeline] 過去案 ${pastIdeas.length} 件を取得（重複回避に使用）`);
  }

  const pastIdeasText            = formatPastIdeasForPrompt(pastIdeas);           // 直近50件詳細
  const categoryFrequency        = summarizePastCategoryFrequency(pastIdeas);      // カテゴリ集計
  const pastCategoryFrequencyText = formatPastCategoryFrequencyForPrompt(categoryFrequency);
  const highScoringIdeas         = filterHighScoringPastIdeas(pastIdeas);          // 高評価案（≥75点・max30）
  const pastHighScoringText      = formatHighScoringPastIdeasForPrompt(highScoringIdeas);

  await runProductPlanner(config, pastIdeasText, pastCategoryFrequencyText, pastHighScoringText);
  await runEvaluator(config);
  await runEditor(config);
}
