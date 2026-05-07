import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";
import { parseJsonFromMarkdown } from "./file.js";
import type { ProductIdea, EvaluationScore } from "../types.js";

// ファイルパス
const REPORT_PATH = path.resolve(process.cwd(), "reports/daily-report.md");
const IDEAS_PATH  = path.resolve(process.cwd(), "outputs/04-product-ideas.md");
const EVAL_PATH   = path.resolve(process.cwd(), "outputs/05-evaluation.md");

// シート名
const SHEET_IDEAS         = "Ideas";
const SHEET_IDEADETAILS   = "IdeaDetails";
const SHEET_BRANDSUMMARY  = "BrandSummary";
const SHEET_RUNS          = "Runs";

// Ideas シートのヘッダー（軽い一覧）
const IDEAS_HEADER = [
  "実行日", "順位", "枠", "商品名", "悩みカテゴリ", "商品カテゴリ",
  "商品概要", "キャッチコピー", "評価点", "判定", "一言コメント",
];

// IdeaDetails シートのヘッダー（全案の詳細）
// NOTE: ensureSheet はシートが存在しない場合のみヘッダーを書き込む。
// 既存シートに新列を追加した場合、過去行のその列は空になる（意図通り）。
const IDEADETAILS_HEADER = [
  "実行日", "順位", "商品名", "評価点", "判定",
  "対応する悩み", "商品概要", "キャッチコピー",
  "なぜ高評価なのか",
  "独自性・差別化ポイント",
  "想定成分・処方・素材",
  "容器・形状・使用体験の特徴",
  "D2Cでの勝ち筋",
  "モールでの勝ち筋",
  "卸での勝ち筋",
  "機能性表示食品としての可能性",
  "法規制・表示リスク",
  "失敗する可能性",
  "初回検証方法",
  "SNS広告フック",
  "LPファーストビュー案",
  "次に確認すべきこと",
  // 追加列（ブランド枠・詳細）col 22-28
  "枠",
  "lineType",
  "ブランドで出す意味",
  "既存商品との被り",
  "シリーズ展開の余地",
  "卸との相性",
  "表現リスク詳細",
  // 追加列（過去案との差分）col 29-30
  "過去案との差分",
  "関連する過去案",
  // 追加列（重複回避用）col 31-32
  "悩みカテゴリ",
  "商品カテゴリ",
  // 追加列（商品仕様に根ざした差別化評価）col 33-37
  "視覚的に見せられる変化",
  "ビフォーアフター可能性",
  "大手を避ける勝ち筋",
  "新しい買う理由",
  "コモディティ化回避の切り口",
];

// BrandSummary シートのヘッダー（枠別最有力案）
const BRANDSUMMARY_HEADER = [
  "実行日", "枠", "枠内順位", "商品名", "評価点", "判定", "lineType",
  "なぜその枠で最有力か",
  "その枠での勝ち筋",
  "その枠での弱点",
  "次回その枠で深掘りすべき方向",
];

// Runs シートのヘッダー
const RUNS_HEADER = [
  "実行日時", "ステータス", "生成成功", "メール送信",
  "シート保存成功", "エラー内容", "レポートファイルパス",
];

export interface RunLogEntry {
  timestamp: string;
  status: "success" | "failure";
  generateSuccess: boolean;
  /** メール送信の状態: "success" | "failure" | "skipped"（送信しない場合は "skipped"） */
  emailStatus: "success" | "failure" | "skipped";
  sheetsSuccess: boolean;
  error: string;
  reportPath: string;
}

// ---- 認証 ----------------------------------------------------------------

function getEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`環境変数 ${key} が設定されていません (.env を確認してください)`);
  return val;
}

function createSheetsClient() {
  const privateKey = getEnv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY").replace(/\\n/g, "\n");
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: getEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

// ---- シート存在確認・作成 --------------------------------------------------

async function ensureSheet(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  title: string,
  header: string[]
): Promise<void> {
  const res = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = res.data.sheets?.some(s => s.properties?.title === title) ?? false;

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title } } }] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${title}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [header] },
    });
    console.log(`[sheets] "${title}" シートを新規作成し、ヘッダーを設定しました`);
  }
}

// ---- ブランド枠ラベル変換 ------------------------------------------------

function brandTrackLabel(track: string): string {
  if (track === "Teaflex") return "Teaflex";
  if (track === "KampoInspired") return "漢方ブランド";
  if (track === "FreeCategory") return "自由枠";
  return track;
}

// ---- Ideas 用: 全案サマリーのパース ----------------------------------------

interface SummaryRow {
  rank: number;
  brandTrack: string;
  name: string;
  worryCategory: string;
  productCategory: string;
  overview: string;
  catchphrase: string;
  score: number;
  verdict: string;
  comment: string;
}

/**
 * reports/daily-report.md の Markdownテーブルから全案サマリーを抽出する。
 * テーブル形式: | 順位 | 枠 | 商品名 | 悩みカテゴリ | 商品カテゴリ | 商品概要 | キャッチコピー | 評価点 | 判定 | 一言コメント |
 */
function parseSummaryFromMarkdown(): SummaryRow[] | null {
  try {
    const md = fs.readFileSync(REPORT_PATH, "utf-8");
    const sectionMatch = md.match(/## [\d]+案サマリー\n([\s\S]*?)(?=\n## |\n---\s*$|$)/);
    if (!sectionMatch) return null;

    const lines = sectionMatch[1]
      .split("\n")
      .filter(l => l.startsWith("|") && !l.match(/^\|[-| :]+\|$/));

    const dataLines = lines.slice(1);
    if (dataLines.length === 0) return null;

    const rows: SummaryRow[] = [];
    for (const line of dataLines) {
      const cells = line.slice(1, -1).split("|").map(c => c.trim());
      if (cells.length < 10) continue;
      rows.push({
        rank:            parseInt(cells[0]) || 0,
        brandTrack:      cells[1],   // 枠列（Teaflex / 漢方ブランド / 自由枠）
        name:            cells[2],
        worryCategory:   cells[3],
        productCategory: cells[4],
        overview:        cells[5],
        catchphrase:     cells[6],
        score:           parseInt(cells[7]) || 0,
        verdict:         cells[8],
        comment:         cells[9],
      });
    }
    return rows.length > 0 ? rows : null;
  } catch {
    return null;
  }
}

/** outputs/ の JSON から全案サマリーを組み立てる（Markdownパース失敗時のフォールバック） */
function parseSummaryFromJson(): SummaryRow[] {
  type ScoreResult = { index: number } & EvaluationScore;

  const ideas  = parseJsonFromMarkdown<ProductIdea[]>(
    fs.readFileSync(IDEAS_PATH, "utf-8"), "sheetsClient-ideas"
  );
  const scores = parseJsonFromMarkdown<ScoreResult[]>(
    fs.readFileSync(EVAL_PATH, "utf-8"), "sheetsClient-eval"
  );

  return [...scores]
    .sort((a, b) => b.total - a.total)
    .map((score, i) => {
      const idea = ideas.find(p => p.index === score.index);
      if (!idea) throw new Error(`[sheetsClient] index ${score.index} の商品案が見つかりません`);
      return {
        rank:            i + 1,
        brandTrack:      brandTrackLabel(idea.brandTrack),
        name:            idea.name,
        worryCategory:   idea.worryCategory,
        productCategory: idea.productCategory,
        overview:        idea.concept,
        catchphrase:     idea.storeCopy,
        score:           score.total,
        verdict:         score.verdict,
        comment:         score.comment,
      };
    });
}

// ---- IdeaDetails 用: ベスト3 Markdown セクションの補完データ ---------------

interface BestPickExtra {
  nextSteps: string; // 次に確認すべきこと（ベスト3のみ存在）
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractBulletValue(section: string, key: string): string {
  const re = new RegExp(
    `- \\*\\*${escapeRegex(key)}\\*\\*：([^\\n]*(?:\\n[ \\t]+-[^\\n]+)*)`,
  );
  const match = section.match(re);
  if (!match) return "";
  return match[1]
    .split("\n")
    .map(l => l.replace(/^[ \t]+-\s*/, "").trim())
    .filter(Boolean)
    .join(" / ");
}

/**
 * reports/daily-report.md の「本日のベスト3」セクションから
 * 順位 → 追加データ（次に確認すべきこと）の Map を返す。
 * ベスト3以外は存在しないため空文字になる。
 */
function parseBestPicksExtras(): Map<number, BestPickExtra> {
  const result = new Map<number, BestPickExtra>();
  try {
    const md = fs.readFileSync(REPORT_PATH, "utf-8");
    const bestMatch = md.match(/## 本日のベスト\d+\n([\s\S]*?)(?=\n## |\s*$)/);
    if (!bestMatch) return result;

    const blocks = bestMatch[1].split(/(?=### \d+位：)/);
    for (const block of blocks) {
      const headerMatch = block.match(/### (\d+)位：/);
      if (!headerMatch) continue;
      const rank = parseInt(headerMatch[1]);
      result.set(rank, {
        nextSteps: extractBulletValue(block, "次に確認すべきこと"),
      });
    }
  } catch {
    // パース失敗は無視
  }
  return result;
}

// ---- 詳細データ組み立てヘルパー -------------------------------------------

/**
 * 「なぜ高評価/低評価なのか」を評価スコアのコメントとスコア内訳から組み立てる。
 * コメントが空でも点数と各軸のスコアをテキスト化して返す。
 */
function buildWhyScore(score: { index: number } & EvaluationScore): string {
  const parts: string[] = [];
  if (score.comment) parts.push(score.comment);

  // スコア内訳を補足として付与
  const axes = [
    `悩みの明確さ ${score.worryClarity}/12`,
    `購入緊急度 ${score.purchaseUrgency}/12`,
    `D2C広告 ${score.d2cAdEase}/12`,
    `モール需要 ${score.mallSearchDemand}/10`,
    `卸展開 ${score.wholesaleEase}/10`,
    `粗利構造 ${score.grossMarginStructure}/10`,
    `LTV ${score.ltv}/10`,
    `差別化 ${score.differentiation}/10`,
    `ブランド適合 ${score.brandFit}/9`,
    `法規制 ${score.regulatoryEase}/5`,
  ];
  parts.push(`[内訳] ${axes.join(" / ")}`);
  return parts.join("\n");
}

/**
 * 「想定成分・処方・素材」を組み立てる。
 * functionalIngredients があればそれを優先し、なければ concept から補完。
 */
function buildIngredients(idea: ProductIdea): string {
  if (idea.functionalIngredients) return idea.functionalIngredients;
  return `（OEM確認時に記入）※コンセプト: ${idea.concept}`;
}

/**
 * 「機能性表示食品としての可能性」を組み立てる。
 */
function buildFunctionalPotential(idea: ProductIdea): string {
  if (idea.isFunctionalFood) {
    return `届出候補: ${idea.functionalClaims || "（詳細未設定）"}`;
  }
  if (idea.functionalClaims) {
    return `要検討: ${idea.functionalClaims}`;
  }
  return "対象外（健康食品 / 化粧品として展開）";
}

// ---- 公開関数 -------------------------------------------------------------

/** Ideas シートに全案サマリー（軽い一覧）を追記する */
export async function saveIdeasToSheet(runDate: string): Promise<void> {
  const sheets = createSheetsClient();
  const spreadsheetId = getEnv("GOOGLE_SHEETS_SPREADSHEET_ID");

  await ensureSheet(sheets, spreadsheetId, SHEET_IDEAS, IDEAS_HEADER);

  const summary = parseSummaryFromMarkdown() ?? parseSummaryFromJson();
  console.log(`[sheets] ${summary.length} 件の商品データを取得しました`);

  const rows = summary.map(r => [
    runDate, r.rank, r.brandTrack, r.name, r.worryCategory, r.productCategory,
    r.overview, r.catchphrase, r.score, r.verdict, r.comment,
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_IDEAS}!A:A`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });

  console.log(`[sheets] Ideas シートに ${rows.length} 行を追記しました`);
}

/**
 * IdeaDetails シートに全案の詳細を追記する（38列）。
 * データソース: outputs/04（ProductIdea JSON）+ outputs/05（EvaluationScore JSON）
 * 商品概要・キャッチコピーは MDテーブル → JSON フォールバック
 * col 18-21（初回検証方法・SNS広告フック・LPファーストビュー・次に確認すべきこと）は廃止のため空文字
 * col 33-37 は商品仕様に根ざした差別化評価の新列
 */
export async function saveIdeaDetailsToSheet(runDate: string): Promise<void> {
  type ScoreResult = { index: number } & EvaluationScore;

  const ideas  = parseJsonFromMarkdown<ProductIdea[]>(
    fs.readFileSync(IDEAS_PATH, "utf-8"), "sheetsClient-details-ideas"
  );
  const scores = parseJsonFromMarkdown<ScoreResult[]>(
    fs.readFileSync(EVAL_PATH, "utf-8"), "sheetsClient-details-eval"
  );

  // 評価点の降順でランク付け（全案）
  const ranked = [...scores].sort((a, b) => b.total - a.total);

  // 商品概要・キャッチコピー: MDテーブル → フォールバック
  const summaryRows = parseSummaryFromMarkdown() ?? parseSummaryFromJson();
  const summaryByName = new Map(summaryRows.map(r => [r.name, r]));

  // 次に確認すべきこと: ベスト3 MDセクション（4位以下は空文字）
  const mdExtras = parseBestPicksExtras();

  const rows = ranked.map((score, i) => {
    const rank = i + 1;
    const idea = ideas.find(p => p.index === score.index);
    if (!idea) throw new Error(`[sheetsClient/IdeaDetails] index ${score.index} が見つかりません`);

    const summary     = summaryByName.get(idea.name);
    const overview    = summary?.overview    ?? idea.concept;
    const catchphrase = summary?.catchphrase ?? idea.storeCopy;
    const mdExtra     = mdExtras.get(rank);

    return [
      // 基本22列
      runDate,
      rank,
      idea.name,
      score.total,
      score.verdict,
      idea.worryTarget,
      overview,
      catchphrase,
      buildWhyScore(score),             // なぜ高評価なのか（コメント + 内訳）
      idea.differentiation,             // 独自性・差別化ポイント
      buildIngredients(idea),           // 想定成分・処方・素材
      idea.packageExperience || "（OEM確認時に記入）", // 容器・形状・使用体験の特徴
      idea.d2cStrategy,
      idea.mallStrategy,
      idea.wholesaleOpportunity,
      buildFunctionalPotential(idea),   // 機能性表示食品としての可能性
      idea.regulatoryRisk,
      idea.risks,                       // 失敗する可能性
      "",                               // col 18: 初回検証方法（廃止 — 空文字で保持）
      "",                               // col 19: SNS広告フック（廃止 — 空文字で保持）
      "",                               // col 20: LPファーストビュー案（廃止 — 空文字で保持）
      "",                               // col 21: 次に確認すべきこと（廃止 — 空文字で保持）
      // 追加7列
      brandTrackLabel(idea.brandTrack),         // 枠
      idea.lineType,                             // lineType
      idea.brandFitReason || "",                 // ブランドで出す意味
      idea.existingProductConflict || "",        // 既存商品との被り
      idea.seriesExpansion || "",                // シリーズ展開の余地
      idea.wholesaleFit || "",                   // 卸との相性
      idea.regulatoryExpressionRisk || "",       // 表現リスク詳細
      idea.noveltyComparedToPast || "",          // 過去案との差分
      idea.relatedPastIdea || "",               // 関連する過去案
      idea.worryCategory || "",                 // 悩みカテゴリ（col 31）
      idea.productCategory || "",               // 商品カテゴリ（col 32）
      // 商品仕様に根ざした差別化評価 col 33-37
      idea.visualProof || "",
      idea.beforeAfterPotential || "",
      idea.avoidBigBrandWarStrategy || "",
      idea.newBuyingReason || "",
      idea.commodityAvoidanceAngle || "",
    ];
  });

  const sheets = createSheetsClient();
  const spreadsheetId = getEnv("GOOGLE_SHEETS_SPREADSHEET_ID");

  await ensureSheet(sheets, spreadsheetId, SHEET_IDEADETAILS, IDEADETAILS_HEADER);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_IDEADETAILS}!A:A`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });

  console.log(`[sheets] IdeaDetails シートに ${rows.length} 行（全${ranked.length}案）を追記しました`);
}

// ---- 過去案履歴取得 --------------------------------------------------------

export interface PastIdeaSummary {
  brandTrack: string;             // 枠（日本語ラベル）
  lineType: string;
  name: string;
  worryCategory: string;          // 悩みカテゴリ
  productCategory: string;        // 商品カテゴリ
  worryTarget: string;            // 対応する悩み
  overview: string;               // 商品概要
  catchphrase: string;            // キャッチコピー
  score: number;                  // 評価点
  newBuyingReason: string;        // 新しい買う理由（col 36）
  commodityAvoidanceAngle: string; // コモディティ化回避の切り口（col 37）
}

/**
 * IdeaDetails シートから直近200件の商品案サマリーを取得する。
 * シートが存在しない・認証情報未設定・API失敗時はすべて空配列を返す（初回実行を考慮）。
 *
 * 取得カラム（0-indexed）:
 *   0:実行日, 2:商品名, 3:評価点, 5:対応する悩み, 6:商品概要, 7:キャッチコピー,
 *   22:枠, 23:lineType, 31:悩みカテゴリ, 32:商品カテゴリ,
 *   36:新しい買う理由, 37:コモディティ化回避の切り口
 *
 * 既存データで各列が空の場合はフォールバックとして空文字を返す（エラーにならない）。
 */
export async function fetchPastIdeasFromSheet(): Promise<PastIdeaSummary[]> {
  // Sheets 設定が未完了な環境ではスキップ
  if (!process.env.GOOGLE_SHEETS_SPREADSHEET_ID) return [];
  try {
    const sheets = createSheetsClient();
    const spreadsheetId = getEnv("GOOGLE_SHEETS_SPREADSHEET_ID");

    // A:AL = col 0〜37（newBuyingReason・commodityAvoidanceAngle を含む全列）
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_IDEADETAILS}!A:AL`,
    });

    const rows = res.data.values ?? [];
    if (rows.length <= 1) return [];  // ヘッダーのみ or 空

    // ヘッダー行を除いた最新200件
    const dataRows = rows.slice(1).slice(-200);

    return dataRows
      .map(row => ({
        brandTrack:               String(row[22] ?? ""),
        lineType:                 String(row[23] ?? ""),
        name:                     String(row[2]  ?? ""),
        worryCategory:            String(row[31] ?? ""),
        productCategory:          String(row[32] ?? ""),
        worryTarget:              String(row[5]  ?? ""),
        overview:                 String(row[6]  ?? ""),
        catchphrase:              String(row[7]  ?? ""),
        score:                    parseInt(String(row[3] ?? "0")) || 0,
        newBuyingReason:          String(row[36] ?? ""),
        commodityAvoidanceAngle:  String(row[37] ?? ""),
      }))
      .filter(r => r.name.length > 0);  // 空行を除外
  } catch {
    // シート未存在・認証エラーなどは無視して空配列を返す
    return [];
  }
}

/**
 * PastIdeaSummary[] の直近50件を product-planner プロンプト用の詳細テキストに変換する（Section A）。
 *
 * 出力形式（1行1案）:
 * - 枠 / lineType / 商品名：〇〇 / 悩みカテゴリ：〇〇 / 商品カテゴリ：〇〇 / 悩み：〇〇 / 概要：〇〇 / キャッチ：〇〇 / 評価点：〇〇
 *
 * 既存データで worryCategory / productCategory が空の場合は「未設定」を表示する。
 */
export function formatPastIdeasForPrompt(pastIdeas: PastIdeaSummary[]): string {
  if (pastIdeas.length === 0) return "（過去の提案履歴なし — 初回実行）";
  // 最新50件のみ詳細表示
  const recent = pastIdeas.slice(-50);
  return recent
    .map(p => [
      `- ${p.brandTrack} / ${p.lineType}`,
      `商品名：${p.name}`,
      `悩みカテゴリ：${p.worryCategory || "未設定"}`,
      `商品カテゴリ：${p.productCategory || "未設定"}`,
      `悩み：${p.worryTarget}`,
      `概要：${p.overview}`,
      `キャッチ：${p.catchphrase}`,
      `評価点：${p.score}`,
    ].join(" / "))
    .join("\n");
}

// ---- 過去案集計・分析ユーティリティ -------------------------------------------

export interface PastCategoryFrequency {
  worryCategory: string;
  productCategory: string;
  brandTrack: string;
  count: number;
}

/**
 * 過去200件の全案を（悩みカテゴリ × 商品カテゴリ × 枠）でグループ化し、
 * 提案回数の多い順 top20 を返す（Section B: カテゴリ飽和マップ）。
 */
export function summarizePastCategoryFrequency(pastIdeas: PastIdeaSummary[]): PastCategoryFrequency[] {
  const freq = new Map<string, PastCategoryFrequency>();
  for (const idea of pastIdeas) {
    const key = `${idea.brandTrack}|${idea.worryCategory}|${idea.productCategory}`;
    if (!freq.has(key)) {
      freq.set(key, {
        worryCategory: idea.worryCategory,
        productCategory: idea.productCategory,
        brandTrack: idea.brandTrack,
        count: 0,
      });
    }
    freq.get(key)!.count++;
  }
  return [...freq.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

/**
 * PastCategoryFrequency[] を product-planner プロンプト用テキストに変換する（Section B）。
 */
export function formatPastCategoryFrequencyForPrompt(summary: PastCategoryFrequency[]): string {
  if (summary.length === 0) return "（カテゴリ集計なし — 初回実行）";
  return summary
    .map(s =>
      `- ${s.brandTrack} / 悩みカテゴリ：${s.worryCategory || "未設定"} / 商品カテゴリ：${s.productCategory || "未設定"} / 提案回数：${s.count}回`
    )
    .join("\n");
}

/**
 * 評価点が threshold 以上の案を score 降順で最大 limit 件返す（Section C: 高評価参照）。
 */
export function filterHighScoringPastIdeas(
  pastIdeas: PastIdeaSummary[],
  threshold = 75,
  limit = 30,
): PastIdeaSummary[] {
  return pastIdeas
    .filter(idea => idea.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * 高評価過去案リストを product-planner プロンプト用テキストに変換する（Section C）。
 * 新しい買う理由・コモディティ化回避の切り口を付加して、焼き直し防止に使う。
 */
export function formatHighScoringPastIdeasForPrompt(ideas: PastIdeaSummary[]): string {
  if (ideas.length === 0) return "（高評価案なし — 初回実行）";
  return ideas
    .map(p => [
      `- ${p.brandTrack} / ${p.lineType}`,
      `商品名：${p.name}`,
      `評価点：${p.score}`,
      `悩みカテゴリ：${p.worryCategory || "未設定"}`,
      `商品カテゴリ：${p.productCategory || "未設定"}`,
      `悩み：${p.worryTarget}`,
      `概要：${p.overview}`,
      `新しい買う理由：${p.newBuyingReason || "未設定"}`,
      `コモディティ化回避：${p.commodityAvoidanceAngle || "未設定"}`,
    ].join(" / "))
    .join("\n");
}

// ---- BrandSummary ヘルパー ------------------------------------------------

/** 複数フィールドを結合し、空文字は除外して返す */
function joinFields(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).map(s => s!.trim()).join(" / ");
}

/**
 * BrandSummary シートに枠別最有力案を追記する。
 * Teaflex 上位3案、KampoInspired 上位2案、FreeCategory 上位2案 = 計7行。
 * データソース: outputs/04（ProductIdea JSON）+ outputs/05（EvaluationScore JSON）
 */
export async function saveBrandSummaryToSheet(runDate: string): Promise<void> {
  type ScoreResult = { index: number } & EvaluationScore;

  const ideas  = parseJsonFromMarkdown<ProductIdea[]>(
    fs.readFileSync(IDEAS_PATH, "utf-8"), "brandSummary-ideas"
  );
  const scores = parseJsonFromMarkdown<ScoreResult[]>(
    fs.readFileSync(EVAL_PATH, "utf-8"), "brandSummary-eval"
  );

  // brandTrack ごとの上位件数設定
  const topN: Record<string, number> = {
    Teaflex:       3,
    KampoInspired: 2,
    FreeCategory:  2,
  };

  const rows: unknown[][] = [];

  for (const [track, n] of Object.entries(topN)) {
    // そのブランド枠の案だけ抽出して評価点降順でソート
    const trackIdeas = ideas.filter(p => p.brandTrack === track);
    const trackScores = scores
      .filter(s => trackIdeas.some(p => p.index === s.index))
      .sort((a, b) => b.total - a.total)
      .slice(0, n);

    trackScores.forEach((score, i) => {
      const idea = trackIdeas.find(p => p.index === score.index);
      if (!idea) return;

      const whyBest = joinFields(
        score.comment,
        idea.brandFitReason,
        idea.differentiation,
      );

      const winStrategy = joinFields(
        idea.d2cStrategy   ? `D2C: ${idea.d2cStrategy}` : undefined,
        idea.mallStrategy  ? `モール: ${idea.mallStrategy}` : undefined,
        idea.wholesaleOpportunity ? `卸: ${idea.wholesaleOpportunity}` : undefined,
      );

      const weakness = joinFields(
        idea.existingProductConflict,
        idea.regulatoryExpressionRisk,
        idea.risks,
      );

      const nextFocus = joinFields(
        idea.seriesExpansion,
      );

      rows.push([
        runDate,
        brandTrackLabel(track),
        i + 1,           // 枠内順位
        idea.name,
        score.total,
        score.verdict,
        idea.lineType,
        whyBest,
        winStrategy,
        weakness,
        nextFocus,
      ]);
    });
  }

  const sheets = createSheetsClient();
  const spreadsheetId = getEnv("GOOGLE_SHEETS_SPREADSHEET_ID");

  await ensureSheet(sheets, spreadsheetId, SHEET_BRANDSUMMARY, BRANDSUMMARY_HEADER);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_BRANDSUMMARY}!A:A`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });

  console.log(`[sheets] BrandSummary シートに ${rows.length} 行（枠別最有力案）を追記しました`);
}

/** Runs シートに実行ログを1行追記する */
export async function appendRunLog(entry: RunLogEntry): Promise<void> {
  const sheets = createSheetsClient();
  const spreadsheetId = getEnv("GOOGLE_SHEETS_SPREADSHEET_ID");

  await ensureSheet(sheets, spreadsheetId, SHEET_RUNS, RUNS_HEADER);

  const row = [
    entry.timestamp,
    entry.status,
    entry.generateSuccess ? "✓" : "✗",
    entry.emailStatus,
    entry.sheetsSuccess   ? "✓" : "✗",
    entry.error,
    entry.reportPath,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_RUNS}!A:A`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });

  console.log(`[sheets] Runs シートにログを追記しました (${entry.status})`);
}
