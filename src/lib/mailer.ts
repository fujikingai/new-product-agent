import nodemailer from "nodemailer";
import * as fs from "fs";
import * as path from "path";

const REPORT_PATH = path.resolve(process.cwd(), "reports/daily-report.md");

function getEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`環境変数 ${key} が設定されていません (.env を確認してください)`);
  return val;
}

function todayJST(): string {
  return new Date().toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).replace(/\//g, "-");
}

function createTransporter(): nodemailer.Transporter {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: getEnv("REPORT_EMAIL_FROM"),
      pass: getEnv("GMAIL_APP_PASSWORD"),
    },
  });
}

/** reports/daily-report.md をメール送信する */
export async function sendReport(): Promise<void> {
  if (!fs.existsSync(REPORT_PATH)) {
    throw new Error(
      `レポートファイルが見つかりません: ${REPORT_PATH}\n` +
      `npm run generate を先に実行してください`
    );
  }

  const content = fs.readFileSync(REPORT_PATH, "utf-8");
  const transporter = createTransporter();

  const info = await transporter.sendMail({
    from: getEnv("REPORT_EMAIL_FROM"),
    to: getEnv("REPORT_EMAIL_TO"),
    subject: `【新商品提案レポート】${todayJST()}`,
    text: content,
  });

  console.log(`[mailer] 送信成功: ${info.messageId}`);
}

/** エラー発生時の通知メールを送信する */
export async function sendErrorReport(error: Error, step: string): Promise<void> {
  const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

  const body = [
    `発生日時: ${now}`,
    `失敗ステップ: ${step}`,
    ``,
    `エラー内容:`,
    error.message,
    ``,
    `スタックトレース:`,
    error.stack ?? "なし",
    ``,
    `確認すべきこと:`,
    `- ANTHROPIC_API_KEY が有効か`,
    `- REPORT_EMAIL_FROM / GMAIL_APP_PASSWORD が正しいか`,
    `- GOOGLE_SHEETS_SPREADSHEET_ID とサービスアカウント設定が正しいか`,
    `- outputs/ / reports/ ディレクトリが存在するか`,
    `- ネットワーク接続に問題がないか`,
  ].join("\n");

  const transporter = createTransporter();
  await transporter.sendMail({
    from: getEnv("REPORT_EMAIL_FROM"),
    to: getEnv("REPORT_EMAIL_TO"),
    subject: `【エラー】新商品提案レポート生成に失敗しました ${todayJST()}`,
    text: body,
  });

  console.log("[mailer] エラーメール送信完了");
}
