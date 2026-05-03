import { callClaude } from "../lib/claude.js";
import {
  readAgentPrompt,
  readFile,
  readOutputFile,
  writeOutputFile,
  parseJsonFromMarkdown,
} from "../lib/file.js";
import type { AppConfig, TrendInsights } from "../types.js";

const OUTPUT_FILE = "03-trend-research.md";

export async function runTrendResearcher(config: AppConfig): Promise<TrendInsights> {
  console.log("[3/6] trend-researcher started");

  const systemPrompt = readAgentPrompt("trend-researcher");
  const rawResearch = readFile("data/input-research.md");
  const marketResearch = readOutputFile("01-market-research.md");
  const competitorResearch = readOutputFile("02-competitor-research.md");

  const userMessage = `
## ビジネス設定
- テーマ：${config.businessTheme}
- ターゲット顧客：${config.targetCustomer}
- 販売チャネル：${config.salesChannels.join("、")}

## 市場リサーチ結果（outputs/01-market-research.md）
${marketResearch}

## 競合リサーチ結果（outputs/02-competitor-research.md）
${competitorResearch}

## 入力リサーチ情報（data/input-research.md）
${rawResearch}

## 出力形式
【重要】必ず以下の順序で出力すること：
1. まず JSONブロックを出力する（これが最優先）
2. その後に各セクションの詳細をMarkdownで出力する

\`\`\`json
{
  "tiktokAdHook": "TikTok広告 冒頭3秒の悩み訴求パターン（200字以内）",
  "instagramAdVisual": "Instagram広告ビジュアル・ライフスタイル訴求（200字以内）",
  "metaAdCopy": "Meta広告で使える悩みコピー例（200字以内）",
  "lpFirstView": "LPファーストビューに使えるキャッチコピー案（200字以内）",
  "mallKeywords": "モール商品名・検索キーワード案（200字以内）",
  "storePop": "店頭POPに使える短いコピー（200字以内）",
  "functionalFoodClaims": "機能性表示食品で使いやすい訴求軸（200字以内）",
  "ngExpressions": "薬機法・景表法・食品表示法でNGになりやすい表現（200字以内）"
}
\`\`\`

---

### TikTok広告フック
（詳しく記述）

### Instagram広告ビジュアル訴求
（詳しく記述）

### Meta広告コピー
（詳しく記述）

### LPファーストビュー案
（詳しく記述）

### モールキーワード戦略
（詳しく記述）

### 店頭POPコピー
（詳しく記述）

### 機能性表示食品の訴求軸
（詳しく記述）

### 法規制NG表現
（詳しく記述）
`;

  const output = await callClaude({ systemPrompt, userMessage, maxTokens: 8000 });
  writeOutputFile(OUTPUT_FILE, output);
  console.log(`[3/6] trend-researcher completed: outputs/${OUTPUT_FILE}`);

  return parseJsonFromMarkdown<TrendInsights>(output, "trend-researcher");
}
