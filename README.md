# new-product-agent

明確な悩みを持つ美容・健康・ヘアケア・機能性食品領域の新商品案を毎日生成するAIリサーチエージェント。

6つのAIエージェントが役割分担して処理し、最終的に `reports/daily-report.md` に
「今日の新商品提案レポート」を出力します。

**各エージェントは独立したClaude API呼び出しとして実行され、自分の成果物を `outputs/` に保存し、
次のエージェントはそのファイルをディスクから読み込んで処理します。**

## このエージェントの特徴

- **3ブランド枠・13案構成**：Teaflex（5案）・漢方ブランド（4案）・自由枠（4案）の構成で毎回提案
- **悩み起点の商品発掘**：「おしゃれで欲しい」ではなく「悩んでいるから必要」と思われる商品を優先
- **幅広い悩みカテゴリを探索**：白髪・肌・体型に限定せず、膝関節・目の疲れ・睡眠・血糖値・中性脂肪・尿酸値・腸内環境・更年期・口臭など幅広いカテゴリをカバー
- **機能性表示食品を最初から検討対象に含める**：届出難易度・エビデンス要件・初期コストも含めて評価
- **3チャネルを評価**：D2C（SNS広告→LP→定期購入）、モール（Amazon・楽天・Qoo10）、卸（ドラッグストア・バラエティショップ）
- **ブランド適合性を評価軸に追加**：共通100点評価にブランド適合性（9点）を組み込み、各枠に応じた評価を実施
- **厳しい評価基準**：既視感・競合過多・法規制リスク・機能性表示食品の届出難易度を重く見る。平均点75点以上は採点し直す

## エージェントの処理フローと中間成果物

```
入力: data/input-research.md + config.json
  ↓
[1] market-researcher    → 独立したClaude API呼び出し → outputs/01-market-research.md
  ↓（ファイルを読み込む）
[2] competitor-researcher → 独立したClaude API呼び出し → outputs/02-competitor-research.md
  ↓（ファイルを読み込む）
[3] trend-researcher     → 独立したClaude API呼び出し → outputs/03-trend-research.md
  ↓（ファイルを読み込む）
[4] product-planner      → 独立したClaude API呼び出し → outputs/04-product-ideas.md
  ↓（ファイルを読み込む）
[5] evaluator            → 独立したClaude API呼び出し → outputs/05-evaluation.md
  ↓（ファイルを読み込む）
[6] editor               → 独立したClaude API呼び出し → reports/daily-report.md
```

## 実行ログの例

```
==================================================
  新商品提案エージェント 起動
  テーマ: 美容・健康・ライフスタイル領域の新商品提案
==================================================
[1/6] market-researcher started
[1/6] market-researcher completed: outputs/01-market-research.md
[2/6] competitor-researcher started
[2/6] competitor-researcher completed: outputs/02-competitor-research.md
...
[6/6] editor completed: reports/daily-report.md
==================================================
  完了！
  最終レポート : reports/daily-report.md
  中間成果物   : outputs/01〜05
==================================================
```

## クイックスタート（APIキー設定後すぐに実行する手順）

```bash
cd new-product-agent

# 1. .env を作成して APIキーを設定する
cp .env.example .env
# .env を開いて以下の行を編集:  ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx

# 2. 依存パッケージをインストール
npm install

# 3. 型チェック（エラーがないことを確認）
npm run typecheck

# 4. レポート生成を実行（約1〜3分）
npm run generate

# 5. レポートを開く
open reports/daily-report.md
```

---

## セットアップ（詳細）

### 1. `.env` ファイルを作成する

```bash
cp .env.example .env
```

`.env` を開き、Anthropic APIキーを設定します：

```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx
```

APIキーは https://console.anthropic.com/ で取得できます。

### 2. 依存パッケージをインストールする

```bash
npm install
```

### 3. レポートを生成する

```bash
npm run typecheck   # 型チェック（エラーがないことを確認）
npm run generate    # 実行（約1〜3分かかります）
open reports/daily-report.md  # レポートを開く（Mac）
```

実行後、以下のファイルが生成されます：

| ファイル | 内容 |
|---------|------|
| `outputs/01-market-research.md` | 市場ニーズ・購買動機の分析 |
| `outputs/02-competitor-research.md` | 競合の強み・弱み・不満分析 |
| `outputs/03-trend-research.md` | SNS訴求・投稿テーマ分析 |
| `outputs/04-product-ideas.md` | 新商品案10個 |
| `outputs/05-evaluation.md` | 商品案の評価・ランキング |
| `reports/daily-report.md` | 最終日報レポート |

## config.json の変更方法

`config.json` を編集するだけで、ビジネステーマ・ターゲット・価格帯などを変更できます。

```json
{
  "businessTheme": "美容・健康・ライフスタイル領域の新商品提案",
  "targetCustomer": "30代前後の女性",
  "priceRange": "3000円〜12000円",
  "salesChannels": ["TikTok", "Instagram", "LP", "楽天", "Amazon"],
  "mustHave": ["SNSで見せやすい", "小ロットで検証しやすい", ...],
  "avoid": ["薬機法リスクが高い表現", ...],
  "dailyIdeaCount": 10,
  "topPickCount": 3
}
```

## リサーチ情報の更新方法

`data/input-research.md` を編集することで、リサーチ情報を更新できます。
将来的にはWebスクレイピング・検索APIによる自動収集に置き換える予定です。

## 型チェック

```bash
npm run typecheck
```

## フォルダ構成

```
new-product-agent/
  agents/                    # 各エージェントのシステムプロンプト（.md）
  src/
    index.ts                 # レポート生成エントリーポイント
    sendReport.ts            # メール送信エントリーポイント
    saveReportToSheet.ts     # スプレッドシート保存エントリーポイント
    runReportWorkflow.ts     # 生成→送信→保存の一括ワークフロー
    config.ts                # 設定ロード
    types.ts                 # 型定義
    lib/
      claude.ts              # Claude API呼び出し
      file.ts                # ファイルI/O
      pipeline.ts            # 6エージェントを順番に呼ぶ共通パイプライン
      mailer.ts              # メール送信ロジック（nodemailer）
      sheetsClient.ts        # Google Sheets保存ロジック（googleapis）
    agents/
      runMarketResearcher.ts     # 01: 市場リサーチ
      runCompetitorResearcher.ts # 02: 競合リサーチ
      runTrendResearcher.ts      # 03: トレンドリサーチ
      runProductPlanner.ts       # 04: 商品企画
      runEvaluator.ts            # 05: 評価
      runEditor.ts               # 06: レポート編集
      runEditorOnly.ts           # editorのみ再実行用
  data/
    input-research.md        # モックリサーチ情報（ここを編集して入力を変える）
  outputs/                   # 各エージェントの中間成果物（自動生成）
  reports/
    daily-report.md          # 最終日報レポート（自動生成）
  config.json                # ビジネス設定
  .env.example               # 環境変数サンプル
```

---

## 商品案の構成

毎回13案を以下の3枠で生成します。

| 枠 | 案数 | 内容 |
|---|---|---|
| **Teaflex** | 5案 | 機能性粉末ティー3案 + お茶に合う悩み解決食品2案 |
| **漢方ブランド**（ファーミー漢方） | 4案 | 漢方発想の食品・ドリンク4案 |
| **自由枠** | 4案 | 食品・ヘアケア・化粧品など混在。うち1案は必ず卸向けヘアケア |

---

## レポート運用方針

- 毎週 **月曜・木曜の朝5時** に実行予定
- 生成結果は **Google スプレッドシート** に自動保存（メイン運用）
  - **Ideas シート**：13案サマリー（11列）を蓄積
  - **IdeaDetails シート**：全13案の詳細情報（33列）を蓄積
  - **BrandSummary シート**：枠別最有力案（7行/回・11列）を蓄積
  - **Runs シート**：実行ログ（成功/失敗）を自動記録
- エラー発生時は **Runs シートに失敗ログ** を記録してプロセス終了（exit 1）
- メール送信は任意（`npm run send:report` で手動実行可能）

---

## 手動実行

```bash
npm run generate          # レポート生成のみ（Claude API 6回呼び出し）
npm run generate:editor   # editor だけ再実行（既存 outputs を再利用）
npm run run:report        # 生成→スプレッドシート保存の一括実行（本番運用用）
npm run save:sheet        # 既存レポートをスプレッドシートに保存（単体）
npm run send:report       # 既存レポートをメール送信（任意・手動用）
```

---

## Gmail 設定

1. Google アカウントで **2段階認証** を有効にする
2. [Googleアカウント] → [セキュリティ] → [アプリパスワード] でアプリパスワードを発行する
3. `.env` に以下を設定する：
   ```
   REPORT_EMAIL_FROM=your-gmail@gmail.com
   REPORT_EMAIL_TO=recipient@example.com
   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
   ```

---

## Google Sheets 設定

### 1. Google Cloud でサービスアカウントを作成する

1. [Google Cloud Console](https://console.cloud.google.com/) を開く
2. プロジェクトを作成（または既存を選択）
3. [APIとサービス] → [ライブラリ] で **Google Sheets API** を有効化する
4. [APIとサービス] → [認証情報] → [サービスアカウントを作成] をクリック
5. サービスアカウントを作成し、**JSONキー** をダウンロードする

### 2. スプレッドシートを作成してサービスアカウントと共有する

1. Google スプレッドシートを新規作成する
2. URLの `/spreadsheets/d/` 以降の部分が `GOOGLE_SHEETS_SPREADSHEET_ID`
3. 共有設定で、サービスアカウントのメールアドレス（`xxx@xxx.iam.gserviceaccount.com`）を **編集者** として追加する

> **シートの自動作成**: `Ideas`・`IdeaDetails`・`BrandSummary`・`Runs` の4シートは初回実行時に自動作成されます。

### 3. `.env` に設定する

```
GOOGLE_SHEETS_SPREADSHEET_ID=1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nxxx...\n-----END PRIVATE KEY-----\n"
```

> **注意**: `PRIVATE_KEY` の改行は `\n` のまま `.env` に書いてください。実装側で自動変換します。

---

## スプレッドシートのシート構成

### Ideas シート（13案サマリーの蓄積・11列）

| 実行日 | 順位 | 枠 | 商品名 | 悩みカテゴリ | 商品カテゴリ | 商品概要 | キャッチコピー | 評価点 | 判定 | 一言コメント |
|---|---|---|---|---|---|---|---|---|---|---|

### IdeaDetails シート（全13案の詳細・33列）

33列で各案の詳細情報を保存します。初回実行時に自動作成されます。

- 基本22列（実行日〜次に確認すべきこと）
- 追加7列（枠・lineType・ブランドで出す意味・既存商品との被り・シリーズ展開の余地・卸との相性・表現リスク詳細）
- 過去案差分2列（過去案との差分・関連する過去案）
- 重複回避用2列（悩みカテゴリ・商品カテゴリ）

> 「過去案との差分」「関連する過去案」「悩みカテゴリ」「商品カテゴリ」は、次回実行時の重複回避ロジックにも活用されます。

### BrandSummary シート（枠別最有力案・11列）

| 実行日 | 枠 | 枠内順位 | 商品名 | 評価点 | 判定 | lineType | なぜその枠で最有力か | その枠での勝ち筋 | その枠での弱点 | 次回その枠で深掘りすべき方向 |
|---|---|---|---|---|---|---|---|---|---|---|

Teaflex 上位3案・漢方ブランド上位2案・自由枠上位2案 = 計7行を毎回追記します。

### Runs シート（実行ログ）

| 実行日時 | ステータス | 生成成功 | メール送信 | シート保存成功 | エラー内容 | レポートファイルパス |
|---|---|---|---|---|---|---|

---

## GitHub Actions 自動実行

`.github/workflows/new-product-report.yml` で **毎週月曜・木曜の朝5時（JST）** に自動実行されます。

```yaml
on:
  schedule:
    - cron: "0 20 * * 0,3"  # UTC 日曜・水曜 20:00 = JST 月曜・木曜 05:00
  workflow_dispatch:           # 手動実行も可能
```

### GitHub Secrets の設定

リポジトリの **Settings → Secrets and variables → Actions** で以下の4つを設定してください。

| Secret 名 | 内容 |
|-----------|------|
| `ANTHROPIC_API_KEY` | Anthropic API キー（`sk-ant-...`） |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | スプレッドシートのID（URLの `/d/` 以降） |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | サービスアカウントのメールアドレス |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | サービスアカウントの秘密鍵（`-----BEGIN PRIVATE KEY-----\n...` の形式） |

> Gmail関連のSecretsは不要です（`npm run run:report` はメール送信を行いません）。

### 失敗時の挙動

- GitHub Actions のジョブが失敗した場合、**Runs シートに `failure` ログ**が記録されます（設計上の保証）
- GitHub Actions の通知設定でメール通知を受け取ることも可能です

---

## 今後の拡張案

| 機能 | 概要 |
|------|------|
| Web検索連携 | Tavily / Brave Search API で最新情報を取得し `data/input-research.md` を自動更新 |
| HTMLメール | レポートを HTML に変換して見やすいメールで送信 |
| モデル切り替え | `config.json` に `model` フィールドを追加して変更可能に |
