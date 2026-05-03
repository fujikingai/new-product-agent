import { callClaude } from "../lib/claude.js";
import {
  readAgentPrompt,
  readFile,
  readOutputFile,
  writeOutputFile,
  parseJsonFromMarkdown,
} from "../lib/file.js";
import type { AppConfig, CompetitorInsights } from "../types.js";

const OUTPUT_FILE = "02-competitor-research.md";

export async function runCompetitorResearcher(config: AppConfig): Promise<CompetitorInsights> {
  console.log("[2/6] competitor-researcher started");

  const systemPrompt = readAgentPrompt("competitor-researcher");
  const rawResearch = readFile("data/input-research.md");
  const marketResearch = readOutputFile("01-market-research.md");

  const userMessage = `
## ビジネス設定
- テーマ：${config.businessTheme}
- ターゲット顧客：${config.targetCustomer}
- 価格帯：${config.priceRange}

## 市場リサーチ結果（outputs/01-market-research.md）
${marketResearch}

## 入力リサーチ情報（data/input-research.md）
${rawResearch}

## 出力形式
【重要】必ず以下の順序で出力すること：
1. まず JSONブロックを出力する（これが最優先）
2. その後に各セクションの詳細をMarkdownで出力する

\`\`\`json
{
  "d2cCompetitors": "D2C競合の概況・強み・弱み（200字以内）",
  "mallCompetitors": "Amazon/楽天売れ筋の特徴と課題（200字以内）",
  "offlineCompetitors": "ドラッグストア・バラエティの既存商品と差別化余地（200字以内）",
  "functionalFoodCompetitors": "機能性表示食品・健康食品の競合状況（200字以内）",
  "gapOpportunities": "大手との差別化余地・まだ競合が弱い隙間（200字以内）",
  "reviewComplaints": "レビューで頻出する不満パターン（200字以内）",
  "mallKeywords": "モール検索で勝つためのキーワード戦略（200字以内）"
}
\`\`\`

---

### D2C競合分析
（詳しく記述）

### モール競合分析
（詳しく記述）

### ドラッグストア・バラエティ競合
（詳しく記述）

### 機能性表示食品・健康食品競合
（詳しく記述）

### 差別化余地・隙間市場
（詳しく記述）

### レビューから見える不満
（詳しく記述）
`;

  const output = await callClaude({ systemPrompt, userMessage, maxTokens: 8000 });
  writeOutputFile(OUTPUT_FILE, output);
  console.log(`[2/6] competitor-researcher completed: outputs/${OUTPUT_FILE}`);

  return parseJsonFromMarkdown<CompetitorInsights>(output, "competitor-researcher");
}
