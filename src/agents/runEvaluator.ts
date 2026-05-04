import { callClaude } from "../lib/claude.js";
import {
  readAgentPrompt,
  readOutputFile,
  writeOutputFile,
  parseJsonFromMarkdown,
} from "../lib/file.js";
import type { AppConfig, ProductIdea, EvaluationScore, EvaluatedProduct } from "../types.js";

const OUTPUT_FILE = "05-evaluation.md";

type ScoreResult = { index: number } & EvaluationScore;

export async function runEvaluator(config: AppConfig): Promise<EvaluatedProduct[]> {
  console.log("[5/6] evaluator started");

  const systemPrompt = readAgentPrompt("evaluator");

  // outputs/04 から JSON のみ抽出して渡す（Markdown は評価に不要）
  const productIdeasRaw = readOutputFile("04-product-ideas.md");
  const productIdeas = parseJsonFromMarkdown<ProductIdea[]>(productIdeasRaw, "evaluator-input");

  const userMessage = `
## ビジネス設定
- テーマ：${config.businessTheme}
- ターゲット顧客：${config.targetCustomer}
- 価格帯：${config.priceRange}
- 必須条件：${config.mustHave.join("、")}
- 避けること：${config.avoid.join("、")}

## 商品案リスト（${productIdeas.length}件）
${JSON.stringify(productIdeas, null, 2)}

## 評価軸（合計100点）
- 悩みの明確さ：12点
- 購入緊急度・支払い意欲：12点
- D2C広告での売りやすさ：12点
- モール検索需要：10点
- 卸・店頭展開しやすさ：10点
- 粗利・原価構造：10点
- 継続購入・LTV可能性：10点
- 競合との差別化：10点
- ブランド適合性：9点
- 法規制・開発難易度の低さ：5点

## 判定基準
- 85点以上：最優先で検証
- 75〜84点：有力候補
- 65〜74点：改善前提で検証可能
- 55〜64点：保留
- 54点以下：見送り

## 採点の厳守事項
- 平均点が75点以上になった場合は採点が甘すぎる。見直すこと
- 80点以上は最大3案まで。85点以上は原則1案まで
- 機能性表示食品候補は届出難易度・エビデンス要件を正直に評価する
- 「失敗する理由」「埋もれる理由」を必ず1つ以上指摘する
- Teaflex・漢方ブランド・自由枠それぞれから評価コメントで比較できるように書く

## PR訴求だけの差別化は評価しない
- 訴求の言い換えにすぎないものは「差別化」と見なさない
- 以下のカテゴリは、仕様に根ざした独自切り口がない限り高評価禁止：視力ケア・関節サプリ・骨密度サプリ・疲労サプリ・睡眠サプリ・血圧・血糖値・中性脂肪・更年期エクオール系
- 評価コメントで以下を必ず言及する：①視覚的変化を見せられるか、②ビフォーアフター訴求の可能性、③商品仕様上の大手回避戦略があるか、④コモディティ化リスク

## 出力形式
【重要】最初にJSONコードブロックのみを出力すること。商品データは含めず index と scores のみ。

\`\`\`json
[
  {
    "index": 1,
    "worryClarity": 10,
    "purchaseUrgency": 10,
    "d2cAdEase": 10,
    "mallSearchDemand": 7,
    "wholesaleEase": 6,
    "grossMarginStructure": 8,
    "ltv": 7,
    "differentiation": 7,
    "brandFit": 6,
    "regulatoryEase": 3,
    "total": 74,
    "verdict": "改善前提で検証可能",
    "comment": "評価コメント（80字以内）"
  }
]
\`\`\`

JSONの後に各案の詳細評価（強み・致命的な弱点・競合に埋もれるリスク・D2C/モール/卸の勝ち筋・機能性表示食品可能性・法規制リスク・改善ポイント）をMarkdownで記述してください。
`;

  const output = await callClaude({ systemPrompt, userMessage, maxTokens: 16000 });

  const scoreResults = parseJsonFromMarkdown<ScoreResult[]>(output, "evaluator");

  // 元の商品データとマージして EvaluatedProduct[] を組み立てる
  const evaluated: EvaluatedProduct[] = scoreResults
    .map((score) => {
      const idea = productIdeas.find((p) => p.index === score.index);
      if (!idea) throw new Error(`[evaluator] index ${score.index} の商品案が見つかりません`);
      const { index: _idx, ...scores } = score;
      return { idea, scores: scores as EvaluationScore };
    })
    .sort((a, b) => b.scores.total - a.scores.total);

  const rankSummary = evaluated.map((e, i) => ({
    rank: i + 1,
    name: e.idea.name,
    brandTrack: e.idea.brandTrack,
    total: e.scores.total,
    verdict: e.scores.verdict,
  }));
  writeOutputFile(OUTPUT_FILE, output + "\n\n---\n\n```json\n" + JSON.stringify(rankSummary, null, 2) + "\n```");
  console.log(`[5/6] evaluator completed: outputs/${OUTPUT_FILE}`);

  return evaluated;
}
