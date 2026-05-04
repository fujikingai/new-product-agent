export interface AppConfig {
  businessTheme: string;
  targetCustomer: string;
  priceRange: string;
  salesChannels: string[];
  mustHave: string[];
  niceToHave?: string[];
  avoid: string[];
  dailyIdeaCount: number;
  topPickCount: number;
}

export interface MarketInsights {
  worryCategories: string;       // 悩みカテゴリ候補
  blueOcean: string;             // ブルーオーシャン候補
  worryDepthAndUrgency: string;  // 悩みの深さ・購入緊急度・支払い意欲
  searchKeywords: string;        // 検索されやすいキーワード
  snsAdWords: string;            // SNS広告で刺さる悩みワード
  channelStrengths: string;      // D2C・モール・卸での伸ばしやすさ
  functionalFoodPotential: string; // 機能性表示食品に向く可能性
  regulatoryNotes: string;       // 法規制上注意が必要な表現
}

export interface CompetitorInsights {
  d2cCompetitors: string;        // D2C競合
  mallCompetitors: string;       // Amazon/楽天売れ筋
  offlineCompetitors: string;    // ドラッグストア・バラエティの既存商品
  functionalFoodCompetitors: string; // 機能性表示食品競合
  gapOpportunities: string;      // 大手との差別化余地・隙間市場
  reviewComplaints: string;      // レビューで見える不満
  mallKeywords: string;          // モール検索で勝つキーワード
}

export interface TrendInsights {
  tiktokAdHook: string;          // TikTok広告 冒頭3秒の悩み訴求
  instagramAdVisual: string;     // Instagram広告ビジュアル訴求
  metaAdCopy: string;            // Meta広告で使える悩みコピー
  lpFirstView: string;           // LPファーストビューコピー
  mallKeywords: string;          // モール商品名・検索キーワード案
  storePop: string;              // 店頭POPコピー
  functionalFoodClaims: string;  // 機能性表示食品で使いやすい訴求軸
  ngExpressions: string;         // 薬機法・景表法NGになりやすい表現
}

export interface ProductIdea {
  index: number;
  name: string;
  brandTrack: "Teaflex" | "KampoInspired" | "FreeCategory"; // ブランド枠
  lineType:                                                   // 商品ライン種別
    | "FunctionalTea"       // Teaflex 機能性粉末ティー
    | "TeaPairingFood"      // Teaflex お茶に合う悩み解決食品
    | "KampoInspiredFood"   // 漢方ブランド発想の食品
    | "KampoInspiredDrink"  // 漢方ブランド発想のドリンク
    | "Free"                // 自由枠（汎用）
    | "HairCare";           // 自由枠ヘアケア
  worryTarget: string;           // 対応する悩み
  worryCategory: string;         // 悩みカテゴリ
  productCategory: string;       // 商品カテゴリ
  concept: string;               // 一言コンセプト
  targetCustomer: string;
  price: string;
  isFunctionalFood: boolean;     // 機能性表示食品に向くか
  functionalIngredients: string; // 機能性関与成分候補
  functionalClaims: string;      // 表示できそうな機能性の方向性
  d2cStrategy: string;
  mallStrategy: string;          // Amazon/楽天での売り方
  wholesaleOpportunity: string;  // 卸での展開可能性
  salesChannels: string[];
  storeCopy: string;             // 店頭POPコピー案
  packageExperience: string;     // 容器・形状・使用体験の特徴
  repeatReason: string;          // リピート購入理由
  differentiation: string;
  brandFitReason: string;        // そのブランドで出す意味・文脈
  existingProductConflict: string; // 既存商品との被り・カニバリ可能性
  seriesExpansion: string;       // シリーズ化・横展開の余地
  wholesaleFit: string;          // 卸展開との相性
  regulatoryRisk: string;        // 法規制・表示リスク
  regulatoryExpressionRisk: string; // 薬機法・景表法・食品表示上の表現リスク詳細
  risks: string;
  noveltyComparedToPast: string; // 過去提案と比べて何が新しいか
  relatedPastIdea: string;       // 似ている過去案の商品名（なければ空文字）
  // 商品仕様に根ざした差別化評価軸（新規追加）
  visualProof?: string;              // 広告・LPで見せられる変化・使用シーン（仕様から自然に生まれるもの）
  beforeAfterPotential?: string;     // ビフォーアフター・変化訴求の可能性
  avoidBigBrandWarStrategy?: string; // 商品仕様上の大手回避戦略
  newBuyingReason?: string;          // 既存品ではなくこれを買う理由（仕様に根ざしたもの）
  commodityAvoidanceAngle?: string;  // コモディティ化を避ける商品設計上の切り口
  // 廃止フィールド（後方互換のためoptionalで残す。Claude出力JSONには含めない）
  validationMethod?: string;
  snsAdHook?: string;
  lpFirstView?: string;
}

export interface EvaluationScore {
  worryClarity: number;          // 悩みの明確さ /12
  purchaseUrgency: number;       // 購入緊急度・支払い意欲 /12
  d2cAdEase: number;             // D2C広告での売りやすさ /12
  mallSearchDemand: number;      // モール検索需要 /10
  wholesaleEase: number;         // 卸・店頭展開しやすさ /10
  grossMarginStructure: number;  // 粗利・原価構造 /10
  ltv: number;                   // 継続購入・LTV可能性 /10
  differentiation: number;       // 競合との差別化 /10
  brandFit: number;              // ブランド適合性 /9
  regulatoryEase: number;        // 法規制・開発難易度の低さ /5
  total: number;                 // /100
  verdict: string;               // 最優先で検証 / 有力候補 / 改善前提で検証可能 / 保留 / 見送り
  comment: string;               // 80字以内の総評
}

export interface EvaluatedProduct {
  idea: ProductIdea;
  scores: EvaluationScore;
}
