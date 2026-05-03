import * as fs from "fs";
import * as path from "path";

export function readFile(filePath: string): string {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`ファイルが見つかりません: ${resolved}`);
  }
  return fs.readFileSync(resolved, "utf-8");
}

export function writeFile(filePath: string, content: string): void {
  const resolved = path.resolve(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, content, "utf-8");
}

export function readAgentPrompt(agentName: string): string {
  return readFile(`agents/${agentName}.md`);
}

export function readOutputFile(filename: string): string {
  return readFile(`outputs/${filename}`);
}

export function writeOutputFile(filename: string, content: string): void {
  writeFile(`outputs/${filename}`, content);
}

export function ensureOutputDir(): void {
  fs.mkdirSync(path.resolve(process.cwd(), "outputs"), { recursive: true });
  fs.mkdirSync(path.resolve(process.cwd(), "reports"), { recursive: true });
}

/**
 * JSON文字列値の内側にある未エスケープのダブルクォートを自動修復する。
 * Claude が「"口活"」のように値内に半角 " を出力した場合の対策。
 */
function repairUnescapedQuotes(jsonStr: string): string {
  // 文字を1つずつ走査し、文字列値の内側にある未エスケープ " を \" に置換する
  let result = "";
  let inString = false;
  for (let i = 0; i < jsonStr.length; i++) {
    const ch = jsonStr[i];
    const prev = result[result.length - 1];
    if (ch === '"') {
      if (!inString) {
        // 文字列開始
        inString = true;
        result += ch;
      } else if (prev === "\\") {
        // 直前がバックスラッシュ → すでにエスケープ済み
        result += ch;
      } else {
        // 文字列の終端か、値内の未エスケープ " かを判断する
        // 後ろのトークンをスキップして次の意味ある文字を確認する
        let j = i + 1;
        while (j < jsonStr.length && (jsonStr[j] === " " || jsonStr[j] === "\t" || jsonStr[j] === "\n" || jsonStr[j] === "\r")) j++;
        const next = jsonStr[j] ?? "";
        // 文字列終端と判断できる後続文字: , } ] :
        if (next === "," || next === "}" || next === "]" || next === ":") {
          inString = false;
          result += ch;
        } else {
          // 値の内側 → エスケープして続行
          result += '\\"';
        }
      }
    } else if (ch === "\\" && inString) {
      // エスケープシーケンス開始 → 次の文字ごとそのまま出力
      result += ch;
      if (i + 1 < jsonStr.length) {
        result += jsonStr[i + 1];
        i++;
      }
    } else {
      result += ch;
    }
  }
  return result;
}

/**
 * Claude の出力から最初の ```json ブロックを抽出してパースする。
 * 出力形式: ```json{...}``` → Markdown詳細
 * 値内の未エスケープ " を自動修復してから JSON.parse する。
 */
export function parseJsonFromMarkdown<T>(raw: string, agentName: string): T {
  const matches = [...raw.matchAll(/```json\s*([\s\S]*?)```/g)];
  if (matches.length === 0) {
    throw new Error(`[${agentName}] JSONブロックが見つかりませんでした:\n${raw.slice(0, 300)}`);
  }
  // JSON-first 形式（先頭優先）
  const jsonStr = matches[0][1].trim();

  // まずそのままパース、失敗したら自動修復して再試行
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    try {
      const repaired = repairUnescapedQuotes(jsonStr);
      return JSON.parse(repaired) as T;
    } catch {
      throw new Error(`[${agentName}] JSONのパースに失敗しました:\n${jsonStr.slice(0, 300)}`);
    }
  }
}
