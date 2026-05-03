import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import type { AppConfig } from "./types.js";

dotenv.config({ override: true });

export function loadEnv(): { apiKey: string } {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(
      "[ERROR] ANTHROPIC_API_KEY が設定されていません。\n" +
        "  1. .env.example を .env にコピーしてください\n" +
        "  2. .env に ANTHROPIC_API_KEY=your_api_key_here を設定してください"
    );
    process.exit(1);
  }
  return { apiKey };
}

export function loadAppConfig(): AppConfig {
  const configPath = path.resolve(process.cwd(), "config.json");
  if (!fs.existsSync(configPath)) {
    console.error(`[ERROR] config.json が見つかりません: ${configPath}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(configPath, "utf-8");
  return JSON.parse(raw) as AppConfig;
}
