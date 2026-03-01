// ─── Strategy Modes ──────────────────────────────────────────

export type StrategyMode = "balanced" | "profit" | "waste" | "stress";

// ─── Suggestion Types ────────────────────────────────────────

export type SuggestionType =
  | "demand"
  | "inventory"
  | "pricing"
  | "timing"
  | "risk"
  | "reverse"
  | "breakeven"
  | "tomorrow"
  | "waste"
  | "special"
  | "social"
  | "reorder"
  | "cost"
  | "rush"
  | "production"
  | "discount";

export type SuggestionCategory =
  | "profit"
  | "waste"
  | "stress"
  | "emergency"
  | "marketing"
  | "revenue";

export type RiskLevel = "low" | "medium" | "high";
export type Difficulty = "easy" | "medium" | "hard";

// ─── Candidate Suggestion ────────────────────────────────────

export interface CandidateSuggestion {
  type: SuggestionType;
  category: SuggestionCategory;
  title: string;
  description: string;
  timing?: string;
  reasoning: string;
  expectedImpact: {
    revenue?: number;
    waste?: number;
    stress?: string; // "reduces" | "increases" | "neutral"
  };
  confidence: number; // 0-100
  riskLevel: RiskLevel;
  difficulty: Difficulty;
  inactionRisk?: string;
  targetDate?: Date;
  score?: number;
  sortOrder?: number;
}

// ─── Analysis Results ────────────────────────────────────────

export interface DayPattern {
  dayOfWeek: number; // 0-6
  avgSales: number;
  avgRevenue: number;
  avgWaste: number;
  trend: "rising" | "falling" | "stable";
}

export interface ProductAnalysis {
  productId: string;
  productName: string;
  category: string;
  avgDailySales: number;
  margin: number; // sellPrice - costPrice
  marginPercent: number;
  wasteRate: number; // avg waste / avg produced
  trend: "rising" | "falling" | "stable";
  spoilageHours: number;
  currentStock: number;
  daysUntilStockout: number;
}

export interface TimeSlotPattern {
  slot: string; // morning, midday, afternoon, evening
  avgCustomers: number;
  peakDay: number; // day of week
  rushStartsAt?: string;
}

export interface AnalysisResult {
  dayPatterns: DayPattern[];
  productAnalyses: ProductAnalysis[];
  timeSlots: TimeSlotPattern[];
  todayDow: number;
  todayWeather?: { condition: string; tempHigh: number };
  todayEvents: { name: string; impact: string }[];
  breakEven: { dailyCost: number; currentRevenue: number; remainingTarget: number };
  staffToday: { name: string; role: string; isNew: boolean }[];
  recentWasteAvg: number;
  dataQuality: number; // 0-100, based on days of data
  revenueByWeather: Record<string, number>;
  seasonalProducts: { id: string; name: string; seasonMonths: number[]; isInSeason: boolean }[];
  // Phase 3.3: Additional data integrations
  customerTraffic: { avgDaily: number; todayCount: number; trend: "rising" | "falling" | "stable" };
  revenueGoal: { target: number; current: number; remaining: number; period: string } | null;
  activePromotions: { id: string; name: string; type: string; discount: number }[];
  competitorAlerts: { name: string; event: string; notes: string | null }[];
  tempAlerts: { equipment: string; temperature: number; inRange: boolean }[];
  cashDiscrepancy: { date: string; expected: number; actual: number; diff: number } | null;
  pendingOrders: { supplierId: string; supplierName: string; itemCount: number; deliveryDate: string | null }[];
}

// ─── Emergency Types ─────────────────────────────────────────

export type EmergencyType =
  | "vendor"
  | "damaged"
  | "equipment"
  | "staff"
  | "rush"
  | "power";

export interface EmergencyInput {
  type: EmergencyType;
  details?: string;
  affectedProductIds?: string[];
  affectedEquipment?: string;
  severity?: "low" | "medium" | "high" | "critical";
}
