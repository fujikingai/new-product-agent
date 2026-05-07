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
  computeCooldownCategories,
  formatCooldownCategoriesForPrompt,
  filterHighScoringPastIdeas,
  formatHighScoringPastIdeasForPrompt,
  summarizeFingerprintFrequency,
  formatFingerprintFrequencyForPrompt,
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
    console.log(`[pipeline] 過去案 全${pastIdeas.length}件を取得（重複回避に使用）`);
  }

  // Section 1: 直近50件詳細
  const pastIdeasText              = formatPastIdeasForPrompt(pastIdeas);
  // Section 2: 全期間カテゴリ集計 top30
  const categoryFrequency          = summarizePastCategoryFrequency(pastIdeas);
  const pastCategoryFrequencyText  = formatPastCategoryFrequencyForPrompt(categoryFrequency);
  // Section 3: 直近クールダウンカテゴリ（直近65案内で2回以上）
  const cooldowns                  = computeCooldownCategories(pastIdeas);
  const cooldownText               = formatCooldownCategoriesForPrompt(cooldowns);
  // Section 4: 全期間高評価案（≥75点・max50・直近優先）
  const highScoringIdeas           = filterHighScoringPastIdeas(pastIdeas);
  const pastHighScoringText        = formatHighScoringPastIdeasForPrompt(highScoringIdeas);
  // Section 5: 頻出フィンガープリント top50
  const fpFrequency                = summarizeFingerprintFrequency(pastIdeas);
  const fingerprintText            = formatFingerprintFrequencyForPrompt(fpFrequency);

  await runProductPlanner(
    config,
    pastIdeasText,
    pastCategoryFrequencyText,
    cooldownText,
    pastHighScoringText,
    fingerprintText,
  );
  await runEvaluator(config);
  await runEditor(config);
}
