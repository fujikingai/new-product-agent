import { callClaude } from "../lib/claude.js";
import {
  readAgentPrompt,
  readFile,
  writeOutputFile,
  parseJsonFromMarkdown,
} from "../lib/file.js";
import type { AppConfig, MarketInsights } from "../types.js";

const OUTPUT_FILE = "01-market-research.md";

export async function runMarketResearcher(config: AppConfig): Promise<MarketInsights> {
  console.log("[1/6] market-researcher started");

  const systemPrompt = readAgentPrompt("market-researcher");
  const rawResearch = readFile("data/input-research.md");

  const userMessage = `
## ビジネス設定
- テーマ：${config.businessTheme}
- ターゲット顧客：${config.targetCustomer}
- 価格帯：${config.priceRange}
- 販売チャネル：${config.salesChannels.join("、")}
- 必須条件：${config.mustHave.join("、")}

## 入力リサーチ情報（data/input-research.md）
${rawResearch}

## 出力形式
【重要】必ず以下の順序で出力すること：
1. まず JSONブロックを出力する（これが最優先）
2. その後に各セクションの詳細をMarkdownで出力する

\`\`\`json
{
  "worryCategories": "有望な悩みカテゴリ候補（例示に限定せず幅広く）（200字以内）",
  "blueOcean": "まだ見落とされているブルーオーシャン候補（200字以内）",
  "worryDepthAndUrgency": "悩みの深さ・購入緊急度・支払い意欲の分析（200字以内）",
  "searchKeywords": "検索されやすいキーワード群（200字以内）",
  "snsAdWords": "SNS広告で刺さる悩みワード（200字以内）",
  "channelStrengths": "D2C・モール・卸それぞれで伸ばしやすい理由（200字以内）",
  "functionalFoodPotential": "機能性表示食品に向く可能性があるカテゴリと理由（200字以内）",
  "regulatoryNotes": "法規制上注意が必要な表現とカテゴリ（200字以内）"
}
\`\`\`

---

### 悩みカテゴリ候補
（詳しく記述）

### ブルーオーシャン候補
（詳しく記述）

### 悩みの深さ・購入緊急度・支払い意欲
（詳しく記述）

### 検索需要・SNS広告フック
（詳しく記述）

### D2C・モール・卸の展開可能性
（詳しく記述）

### 機能性表示食品に向く可能性
（詳しく記述）

### 法規制の注意点
（詳しく記述）
`;

  const output = await callClaude({ systemPrompt, userMessage, maxTokens: 8000 });
  writeOutputFile(OUTPUT_FILE, output);
  console.log(`[1/6] market-researcher completed: outputs/${OUTPUT_FILE}`);

  return parseJsonFromMarkdown<MarketInsights>(output, "market-researcher");
}
