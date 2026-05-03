import { callClaude } from "../lib/claude.js";
import {
  readAgentPrompt,
  readOutputFile,
  writeOutputFile,
  parseJsonFromMarkdown,
} from "../lib/file.js";
import type { AppConfig, ProductIdea } from "../types.js";

const OUTPUT_FILE = "04-product-ideas.md";

export async function runProductPlanner(
  config: AppConfig,
  pastIdeasText = "（過去の提案履歴なし — 初回実行）",
): Promise<ProductIdea[]> {
  console.log("[4/6] product-planner started");

  const systemPrompt = readAgentPrompt("product-planner");
  const marketResearch = readOutputFile("01-market-research.md");
  const competitorResearch = readOutputFile("02-competitor-research.md");
  const trendResearch = readOutputFile("03-trend-research.md");

  const userMessage = `
## ビジネス設定
- テーマ：${config.businessTheme}
- ターゲット顧客：${config.targetCustomer}
- 価格帯：${config.priceRange}
- 販売チャネル：${config.salesChannels.join("、")}
- 必須条件：${config.mustHave.join("、")}
- あれば望ましい：${(config.niceToHave ?? []).join("、")}
- 避けること：${config.avoid.join("、")}
- 生成数：${config.dailyIdeaCount}個

## 過去提案済みの商品案（重複回避対象）
${pastIdeasText}

## 制約
- 必ず以下の順番で13案を出すこと
  - 1〜3案目：Teaflex 機能性粉末ティー（brandTrack: "Teaflex", lineType: "FunctionalTea"）
  - 4〜5案目：Teaflex お茶に合う悩み解決食品（brandTrack: "Teaflex", lineType: "TeaPairingFood"）
  - 6〜9案目：漢方ブランド食品・ドリンク（brandTrack: "KampoInspired", lineType: "KampoInspiredFood" or "KampoInspiredDrink"）
  - 10〜13案目：自由枠（brandTrack: "FreeCategory", lineType: "Free" or "HairCare"）
  - 自由枠のうち1案は必ず lineType: "HairCare" にすること
- 商品案の生成のみ行うこと（評価・採点は行わない）

## 市場リサーチ結果（outputs/01-market-research.md）
${marketResearch}

## 競合リサーチ結果（outputs/02-competitor-research.md）
${competitorResearch}

## トレンドリサーチ結果（outputs/03-trend-research.md）
${trendResearch}

## 出力形式
【重要】必ず以下の順序で出力すること：
1. まず JSON配列ブロックを出力する（これが最優先）
2. その後に各商品案の詳細をMarkdownで出力する

JSONの各フィールドは必ず簡潔に記述すること（目安: name≤25字, concept≤40字, worryTarget≤20字, worryCategory≤15字, productCategory≤15字, targetCustomer≤40字, price≤20字, functionalIngredients≤40字, functionalClaims≤40字, d2cStrategy≤60字, mallStrategy≤60字, wholesaleOpportunity≤40字, snsAdHook≤50字, lpFirstView≤40字, storeCopy≤16字, packageExperience≤60字, repeatReason≤40字, differentiation≤60字, brandFitReason≤60字, existingProductConflict≤60字, seriesExpansion≤40字, wholesaleFit≤40字, validationMethod≤60字, regulatoryRisk≤60字, regulatoryExpressionRisk≤60字, risks≤60字, noveltyComparedToPast≤60字, relatedPastIdea≤30字）。詳細はMarkdownセクションに書くこと。

\`\`\`json
[
  {
    "index": 1,
    "name": "商品名（25字以内）",
    "brandTrack": "Teaflex",
    "lineType": "FunctionalTea",
    "worryTarget": "対応する悩み（20字以内）",
    "worryCategory": "悩みカテゴリ（15字以内）",
    "productCategory": "機能性表示食品候補/健康食品/化粧品/医薬部外品候補/ヘアケア/オーラルケア/雑貨/その他",
    "concept": "一言コンセプト（40字以内）",
    "targetCustomer": "想定ターゲット（40字以内）",
    "price": "想定価格（20字以内）",
    "isFunctionalFood": false,
    "functionalIngredients": "機能性関与成分候補（40字以内、なければ空文字）",
    "functionalClaims": "表示できそうな機能性（40字以内、なければ空文字）",
    "d2cStrategy": "D2Cでの売り方（60字以内）",
    "mallStrategy": "モールでの売り方（60字以内）",
    "wholesaleOpportunity": "卸展開の可能性（40字以内）",
    "salesChannels": ["チャネル1"],
    "snsAdHook": "SNS広告フック（50字以内）",
    "lpFirstView": "LPファーストビュー案（40字以内）",
    "storeCopy": "店頭POPコピー（16字以内）",
    "packageExperience": "容器・形状・使用体験の特徴（60字以内）",
    "repeatReason": "リピート購入理由（40字以内）",
    "differentiation": "差別化ポイント（60字以内）",
    "brandFitReason": "そのブランドで出す意味（60字以内）",
    "existingProductConflict": "既存商品との被り・カニバリ可能性（60字以内）",
    "seriesExpansion": "シリーズ化・横展開の余地（40字以内）",
    "wholesaleFit": "卸展開との相性（40字以内）",
    "validationMethod": "初回検証方法（60字以内）",
    "regulatoryRisk": "法規制・表示リスク（60字以内）",
    "regulatoryExpressionRisk": "薬機法・景表法・食品表示上の表現リスク（60字以内）",
    "risks": "主なリスク（60字以内）",
    "noveltyComparedToPast": "過去案との差分・新しい点（60字以内、過去案がなければ空文字）",
    "relatedPastIdea": "似ている過去案の商品名（30字以内、なければ空文字）"
  }
]
\`\`\`

---

### 1. [商品名]
（各商品案の詳細をMarkdownで記述。2〜${config.dailyIdeaCount}も同様に）
`;

  const output = await callClaude({ systemPrompt, userMessage, maxTokens: 16000 });
  writeOutputFile(OUTPUT_FILE, output);
  console.log(`[4/6] product-planner completed: outputs/${OUTPUT_FILE}`);

  return parseJsonFromMarkdown<ProductIdea[]>(output, "product-planner");
}
