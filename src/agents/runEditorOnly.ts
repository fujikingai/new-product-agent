import { loadEnv, loadAppConfig } from "../config.js";
import { runEditor } from "./runEditor.js";

loadEnv();
const config = loadAppConfig();

console.log("====================================================");
console.log("  editor のみ再実行");
console.log("  既存の outputs/01〜05 を使用します");
console.log("====================================================");

runEditor(config)
  .then(() => {
    console.log("====================================================");
    console.log("  完了！");
    console.log("  最終レポート : reports/daily-report.md");
    console.log("====================================================");
  })
  .catch((err) => {
    console.error("[ERROR]", err);
    process.exit(1);
  });
