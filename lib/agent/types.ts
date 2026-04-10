export type MobilityLevel = "low" | "medium" | "high";
export type BudgetLevel = "low" | "medium" | "high" | "unknown";

export interface ClarifiedGoal {
  rawInput: string;
  city: string;
  timeframe: string;
  vibes: string[];
  mobility: MobilityLevel;
  budget: BudgetLevel;
  constraints: string[];
  missing: string[];
}

export interface WeatherSnapshot {
  city: string;
  condition: "sunny" | "rainy" | "cloudy" | "windy" | "unknown";
  temperatureC: number;
  advice: string;
  source?: "live" | "mock-fallback";
}

export interface PlanStep {
  id: string;
  time: string;
  place: string;
  action: string;
  vibe: string;
  mode: "walk" | "metro" | "taxi" | "bike";
  durationMinutes: number;
  reason: string;
  indoor: boolean;
}

export interface AgentEvent {
  stage: "INPUT" | "CLARIFY" | "MEMORY_READ" | "TOOL_WEATHER" | "MODEL_PLAN" | "PLAN" | "TOOL_POI" | "REPLAN";
  detail: string;
  payload?: Record<string, unknown>;
}

export interface PoiCheck {
  stepId: string;
  place: string;
  available: boolean;
  reason: string;
  source: "live" | "mock-fallback";
  provider?: "amap" | "osm" | "mock";
  displayName?: string;
  latitude?: number;
  longitude?: number;
}

export interface CorrectionRecord {
  stepId: string;
  strategyId: string;
  action: "replace" | "duration-adjust" | "replace-and-duration-adjust" | "none";
  oldPlace?: string;
  newPlace?: string;
  oldDurationMinutes?: number;
  newDurationMinutes?: number;
  reason: string;
}

export interface MapPoint {
  stepId: string;
  order: number;
  place: string;
  latitude: number;
  longitude: number;
  provider?: "amap" | "osm" | "mock";
}

export interface MemorySnapshot {
  userId: string;
  preferredMobility?: MobilityLevel;
  topVibes: string[];
  dislikedPlaces: string[];
}

export interface PlanResult {
  userId: string;
  clarified: ClarifiedGoal;
  memory: MemorySnapshot;
  weather: WeatherSnapshot;
  plannerSource: "siliconflow" | "rule";
  initialPlan: PlanStep[];
  plan: PlanStep[];
  poiChecks: PoiCheck[];
  corrections: CorrectionRecord[];
  mapPoints: MapPoint[];
  summary: string;
  timeline: AgentEvent[];
}
