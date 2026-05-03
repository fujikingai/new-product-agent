import { loadEnv, loadAppConfig } from "./config.js";
import { runFullPipeline } from "./lib/pipeline.js";

async function main(): Promise<void> {
  loadEnv();
  const config = loadAppConfig();

  console.log("=".repeat(52));
  console.log("  新商品提案エージェント 起動");
  console.log(`  テーマ: ${config.businessTheme}`);
  console.log("=".repeat(52));

  await runFullPipeline(config);

  console.log("=".repeat(52));
  console.log("  完了！");
  console.log("  最終レポート : reports/daily-report.md");
  console.log("  中間成果物   : outputs/01〜05");
  console.log("=".repeat(52));
}

main().catch((err: unknown) => {
  console.error("[FATAL]", err instanceof Error ? err.message : err);
  process.exit(1);
});
