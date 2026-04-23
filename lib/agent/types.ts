export type MobilityLevel = "low" | "medium" | "high";
export type BudgetLevel = "low" | "medium" | "high" | "unknown";
export type AgentStage = "understand" | "plan" | "act" | "observe" | "reflect" | "finalize";
export type AgentRunStatus = "queued" | "running" | "completed" | "failed";

export interface ClarifiedIntent {
  rawInput: string;
  city: string;
  timeframe: string;
  vibes: string[];
  mobility: MobilityLevel;
  budget: BudgetLevel;
  constraints: string[];
  missing: string[];
  confidence?: number;
}

export type ClarifiedGoal = ClarifiedIntent;

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
  requiresTools?: Array<"weather" | "poi_search" | "poi_validate">;
  observationSummary?: string;
}

export interface AgentThought {
  stage: AgentStage;
  summary: string;
  confidence?: number;
}

export interface PoiCheck {
  stepId: string;
  place: string;
  available: boolean;
  reason: string;
  source: "live" | "mock-fallback" | "memory";
  provider?: "amap" | "osm" | "mock";
  displayName?: string;
  latitude?: number;
  longitude?: number;
}

export interface PoiSearchResult {
  query: string;
  city: string;
  provider: "amap" | "osm" | "mock";
  found: boolean;
  displayName?: string;
  latitude?: number;
  longitude?: number;
  source: "live" | "mock-fallback";
}

export interface ToolCallRecord {
  toolCallId: string;
  toolName: "weather" | "poi_search" | "poi_validate";
  args: Record<string, unknown>;
  result: Record<string, unknown>;
  durationMs: number;
  success: boolean;
  errorType?: string;
}

export interface ReplanRecord {
  stepId: string;
  reason: string;
  strategyId: string;
  oldPlace?: string;
  newPlace?: string;
  oldDurationMinutes?: number;
  newDurationMinutes?: number;
  note: string;
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

export interface EvaluationArtifacts {
  input: string;
  expectedTaskType: "city-itinerary";
  steps: Array<{
    id: string;
    stage: AgentStage;
    type: string;
    summary: string;
  }>;
  toolSuccessRate: number;
  latencyMs: number;
  completionStatus: "completed" | "degraded" | "failed";
  judgeReadyTranscript: string;
  replanCount: number;
  failureReasons: string[];
}

export type AgentRunEvent =
  | {
      type: "run_started";
      runId: string;
      status: AgentRunStatus;
      input: string;
      userId: string;
      createdAt: string;
    }
  | {
      type: "stage_started";
      runId: string;
      stage: AgentStage;
      detail: string;
      timestamp: string;
    }
  | {
      type: "thought_generated";
      runId: string;
      stage: AgentStage;
      summary: string;
      confidence?: number;
      timestamp: string;
    }
  | {
      type: "tool_called";
      runId: string;
      stage: AgentStage;
      toolCallId: string;
      toolName: ToolCallRecord["toolName"];
      args: Record<string, unknown>;
      timestamp: string;
    }
  | {
      type: "tool_result";
      runId: string;
      stage: AgentStage;
      toolCallId: string;
      toolName: ToolCallRecord["toolName"];
      success: boolean;
      durationMs: number;
      result: Record<string, unknown>;
      errorType?: string;
      timestamp: string;
    }
  | {
      type: "replan_requested";
      runId: string;
      stepId: string;
      reason: string;
      strategyId: string;
      timestamp: string;
    }
  | {
      type: "replan_applied";
      runId: string;
      stepId: string;
      reason: string;
      strategyId: string;
      oldPlace?: string;
      newPlace?: string;
      timestamp: string;
    }
  | {
      type: "run_completed";
      runId: string;
      status: "completed";
      result: AgentRunResult;
      timestamp: string;
    }
  | {
      type: "run_failed";
      runId: string;
      status: "failed";
      message: string;
      timestamp: string;
    };

export interface AgentRunResult {
  runId: string;
  userId: string;
  input: string;
  status: Extract<AgentRunStatus, "completed" | "failed">;
  clarifiedIntent: ClarifiedIntent;
  finalPlan: PlanStep[];
  finalAnswer: string;
  traceSummary: string;
  toolCalls: ToolCallRecord[];
  replans: ReplanRecord[];
  memoryApplied: MemorySnapshot;
  weather?: WeatherSnapshot;
  mapPoints: MapPoint[];
  evaluationArtifacts: EvaluationArtifacts;
  events: AgentRunEvent[];
  plannerSource: "siliconflow" | "rule";

  // Stable alias fields kept for existing UI, persistence, and evaluation consumers.
  clarified: ClarifiedIntent;
  memory: MemorySnapshot;
  initialPlan: PlanStep[];
  plan: PlanStep[];
  poiChecks: PoiCheck[];
  corrections: Array<{
    stepId: string;
    strategyId: string;
    action: "replace" | "duration-adjust" | "replace-and-duration-adjust" | "none";
    oldPlace?: string;
    newPlace?: string;
    oldDurationMinutes?: number;
    newDurationMinutes?: number;
    reason: string;
  }>;
  summary: string;
  timeline: Array<{
    stage:
      | "INPUT"
      | "MODEL_CLARIFY"
      | "CLARIFY"
      | "MEMORY_READ"
      | "TOOL_WEATHER"
      | "MODEL_PLAN"
      | "PLAN"
      | "TOOL_POI"
      | "REPLAN";
    detail: string;
    payload?: Record<string, unknown>;
  }>;
}

export type PlanResult = AgentRunResult;
