import { ensureOutputDir } from "./file.js";
import { runMarketResearcher } from "../agents/runMarketResearcher.js";
import { runCompetitorResearcher } from "../agents/runCompetitorResearcher.js";
import { runTrendResearcher } from "../agents/runTrendResearcher.js";
import { runProductPlanner } from "../agents/runProductPlanner.js";
import { runEvaluator } from "../agents/runEvaluator.js";
import { runEditor } from "../agents/runEditor.js";
import { fetchPastIdeasFromSheet, formatPastIdeasForPrompt } from "./sheetsClient.js";
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
  const pastIdeasText = formatPastIdeasForPrompt(pastIdeas);
  if (pastIdeas.length > 0) {
    console.log(`[pipeline] 過去案 ${pastIdeas.length} 件を参照（重複回避）`);
  }
  await runProductPlanner(config, pastIdeasText);
  await runEvaluator(config);
  await runEditor(config);
}
