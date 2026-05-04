import { callClaude } from "../lib/claude.js";
import {
  readAgentPrompt,
  readOutputFile,
  writeFile,
} from "../lib/file.js";
import type { AppConfig } from "../types.js";

const OUTPUT_PATH = "reports/daily-report.md";

export async function runEditor(config: AppConfig): Promise<void> {
  console.log("[6/6] editor started");

  const systemPrompt = readAgentPrompt("editor");
  const marketResearch = readOutputFile("01-market-research.md");
  const competitorResearch = readOutputFile("02-competitor-research.md");
  const trendResearch = readOutputFile("03-trend-research.md");
  const productIdeas = readOutputFile("04-product-ideas.md");
  const evaluation = readOutputFile("05-evaluation.md");

  const userMessage = `
## ビジネス設定
- テーマ：${config.businessTheme}
- ターゲット：${config.targetCustomer}
- 価格帯：${config.priceRange}
- 販売チャネル：${config.salesChannels.join("、")}

## 評価結果（outputs/05-evaluation.md）
${evaluation}

## 商品案詳細（outputs/04-product-ideas.md）
${productIdeas}

## 市場リサーチ（01）
${marketResearch}

## 競合リサーチ（02）
${competitorResearch}

## トレンドリサーチ（03）
${trendResearch}

## 重要制約
- 評価点は 05-evaluation.md のJSONの値をそのまま使うこと（変更・再計算禁止）
- ベスト3は合計点上位3案をそのまま使うこと
- 13案サマリーは表1つで完結させること。長文で再掲しない
- 商品概要は30〜60文字で商品内容を簡潔に
- キャッチコピーは15〜35文字。以下の断定表現は一切使わない：「治る・改善する・消える・黒くなる・眠れるようになる・老けない・若返る・防ぐ・効く」
- 睡眠系のコピーは体験断定を避けてシーン・習慣訴求に寄せる
- 詳細解説はベスト3のみ。1位は各項目1〜3文以内、2位・3位は1位より短く
- 新しい商品案を追加しないこと
- JSONや構造化データは出力に含めないこと（純粋なMarkdownのみ）
- レポートが途中で切れないことを最優先すること

## 出力フォーマット（このフォーマットに必ず従い、末尾まで出力すること）

# 今日の新商品提案レポート

## 今日の結論

- **最優先で検証すべき商品**：
- **理由**：
- **今回強かったブランド枠**：
- **次回改善すべき点**：

## ${config.dailyIdeaCount}案サマリー

| 順位 | 枠 | 商品名 | 悩みカテゴリ | 商品カテゴリ | 商品概要 | キャッチコピー | 評価点 | 判定 | 一言コメント |
|---|---|---|---|---|---|---|---:|---|---|
（13行、評価点の高い順で記入。枠は Teaflex / 漢方ブランド / 自由枠 と記入）
※商品概要：30〜60文字で商品の内容を簡潔に
※キャッチコピー：15〜35文字の軽いコピー。断定表現は使わない

## 本日のベスト${config.topPickCount}

### 1位：商品名（XX点）【枠名】

- **対応する悩み**：
- **なぜ売れる可能性があるか**：（悩みの深さ・購入緊急度・仕様の強さを簡潔に）
- **視覚的に見せられる変化**：（仕様から自然に生まれる視覚訴求。PRの後付けではないこと）
- **ビフォーアフター可能性**：（薬機法範囲内で変化を伝えられるか）
- **大手と戦わずに勝つ角度**：（形状・処方・体験・ブランド文脈など仕様上の理由）
- **新しい買う理由**：（既存品ではなくこれを選ぶ商品設計上の理由）
- **コモディティ化回避の切り口**：（成分違いだけに依存しない設計の何が違うか）
- **D2Cでの勝ち筋**：
- **モールでの勝ち筋**：
- **卸での可能性**：
- **機能性表示食品として検討すべきか**：
- **それでも弱い点**：（致命的な弱点・失敗リスク）

### 2位：商品名（XX点）【枠名】

（1位より短めに同じ構成で）

### 3位：商品名（XX点）【枠名】

（1位より短めに同じ構成で）

## 枠別の注目案

- **Teaflex枠の最有力案**：商品名（XX点）— 一言理由
- **漢方ブランド枠の最有力案**：商品名（XX点）— 一言理由
- **自由枠の最有力案**：商品名（XX点）— 一言理由

## 捨てる・後回しにするべき案

| 商品名 | 枠 | 評価点 | 後回しにする理由 | 改善すれば伸びる可能性 |
|---|---|---:|---|---|
（下位3案を記入）

## 今回のリサーチから見えた示唆

- **Teaflexで伸びそうな方向**：
- **漢方ブランドで伸びそうな方向**：
- **自由枠で見えたチャンス**：
- **卸展開で有利そうなカテゴリ**：
- **避けるべき方向**：

## 次回リサーチで深掘りしたい方向性

| 深掘りテーマ | 理由 | 想定商品方向性 |
|---|---|---|
（3〜5行。今回出なかった有望カテゴリ・次回探索すべき未開拓領域を記入）
`;

  const report = await callClaude({ systemPrompt, userMessage, maxTokens: 16000 });
  writeFile(OUTPUT_PATH, report);
  console.log(`[6/6] editor completed: ${OUTPUT_PATH}`);
}
