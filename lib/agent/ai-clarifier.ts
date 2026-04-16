import OpenAI from "openai";

import type { ClarifiedGoal } from "@/lib/agent/types";

const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY?.trim();
const SILICONFLOW_BASE_URL = process.env.SILICONFLOW_BASE_URL?.trim() || "https://api.siliconflow.cn/v1";
const SILICONFLOW_MODEL = process.env.SILICONFLOW_MODEL?.trim();
const SILICONFLOW_TIMEOUT_MS = Number(process.env.SILICONFLOW_TIMEOUT_MS ?? 12000);

const TIMEFRAME_SET = new Set([
  "today morning",
  "today afternoon",
  "today evening",
  "tomorrow",
  "this weekend",
]);
const MOBILITY_SET = new Set(["low", "medium", "high"]);
const BUDGET_SET = new Set(["low", "medium", "high", "unknown"]);
const CONSTRAINT_SET = new Set(["limit-walking", "prefer-indoor", "public-transport-only"]);
const MISSING_SET = new Set(["timeframe", "budget"]);

interface AiClarifierPayload {
  city: string;
  timeframe: string;
  vibes: string[];
  mobility: string;
  budget: string;
  constraints: string[];
  missing: string[];
  confidence: number;
}

export interface AiClarifierResult {
  clarified: ClarifiedGoal;
  confidence: number;
}

function getClient(): OpenAI | null {
  if (!SILICONFLOW_API_KEY || !SILICONFLOW_MODEL) {
    return null;
  }

  return new OpenAI({
    apiKey: SILICONFLOW_API_KEY,
    baseURL: SILICONFLOW_BASE_URL,
  });
}

function isOfflineOnly(): boolean {
  return process.env.AGENT_OFFLINE_ONLY?.trim().toLowerCase() === "true";
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  const match = trimmed.match(/```json\s*([\s\S]*?)\s*```/i) ?? trimmed.match(/```\s*([\s\S]*?)\s*```/i);
  return match?.[1]?.trim() ?? trimmed;
}

function normalizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function toPayload(input: unknown): AiClarifierPayload | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const candidate = input as Partial<AiClarifierPayload>;
  const city = typeof candidate.city === "string" ? candidate.city.trim() : "";
  const timeframe = typeof candidate.timeframe === "string" ? candidate.timeframe.trim() : "";
  const vibes = normalizeStringArray(candidate.vibes).slice(0, 5);
  const mobility = typeof candidate.mobility === "string" ? candidate.mobility.trim() : "";
  const budget = typeof candidate.budget === "string" ? candidate.budget.trim() : "";
  const constraints = normalizeStringArray(candidate.constraints).filter((item) => CONSTRAINT_SET.has(item));
  const missing = normalizeStringArray(candidate.missing).filter((item) => MISSING_SET.has(item));
  const confidence =
    typeof candidate.confidence === "number" && Number.isFinite(candidate.confidence) ? candidate.confidence : -1;

  if (!city || !TIMEFRAME_SET.has(timeframe) || vibes.length === 0) {
    return null;
  }

  if (!MOBILITY_SET.has(mobility) || !BUDGET_SET.has(budget)) {
    return null;
  }

  if (confidence < 0 || confidence > 1) {
    return null;
  }

  return {
    city,
    timeframe,
    vibes,
    mobility,
    budget,
    constraints,
    missing,
    confidence,
  };
}

function buildPrompt(userInput: string): string {
  return [
    "你是参数解析器，只做结构化抽取，不能规划行程。",
    "必须输出严格 JSON，且只能输出 1 个 JSON 对象，不得包含 markdown 或额外文字。",
    "字段必须全部存在：city,timeframe,vibes,mobility,budget,constraints,missing,confidence。",
    "若输入信息不完整，你必须根据语义合理推断并补全，不允许输出空字符串、空数组（尤其 vibes 不能为空）。",
    "vibes 至少 1 项；可用值建议优先从 [art,architecture,relax,city-walk] 里选择最匹配项。",
    'timeframe 若无法直接判断，默认填 "today afternoon"；budget 若不确定填 "unknown"。',
    'missing 仅允许表示仍无法确定的字段，且只能在 ["timeframe","budget"] 中选择；不能输出 "vibes"。',
    'timeframe 只能取: "today morning"|"today afternoon"|"today evening"|"tomorrow"|"this weekend"。',
    'mobility 只能取: "low"|"medium"|"high"。',
    'budget 只能取: "low"|"medium"|"high"|"unknown"。',
    'constraints 元素只能取: "limit-walking"|"prefer-indoor"|"public-transport-only"。',
    'missing 元素只能取: "timeframe"|"budget"。',
    "confidence 为 0~1 的小数。",
    `用户输入: ${userInput}`,
    "输出示例：",
    '{"city":"上海","timeframe":"today afternoon","vibes":["art"],"mobility":"low","budget":"unknown","constraints":["limit-walking"],"missing":["budget"],"confidence":0.86}',
  ].join("\n");
}

export function parseAiClarifierText(rawText: string): AiClarifierPayload | null {
  try {
    const jsonText = extractJson(rawText);
    const parsed = JSON.parse(jsonText) as unknown;
    return toPayload(parsed);
  } catch {
    return null;
  }
}

export async function clarifyGoalWithAi(params: {
  userInput: string;
  fallback: ClarifiedGoal;
}): Promise<AiClarifierResult | null> {
  const { userInput, fallback } = params;
  if (isOfflineOnly()) {
    return null;
  }

  const client = getClient();
  if (!client || !SILICONFLOW_MODEL) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SILICONFLOW_TIMEOUT_MS);

    try {
      const response = await client.chat.completions.create(
        {
          model: SILICONFLOW_MODEL,
          temperature: 0,
          messages: [
            {
              role: "system",
              content: "你是结构化参数解析器。",
            },
            {
              role: "user",
              content: buildPrompt(userInput),
            },
          ],
        },
        {
          signal: controller.signal,
        },
      );

      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        return null;
      }

      const payload = parseAiClarifierText(content);
      if (!payload || payload.confidence < 0.5) {
        return null;
      }

      return {
        clarified: {
          rawInput: fallback.rawInput,
          city: payload.city,
          timeframe: payload.timeframe,
          vibes: payload.vibes,
          mobility: payload.mobility as ClarifiedGoal["mobility"],
          budget: payload.budget as ClarifiedGoal["budget"],
          constraints: payload.constraints,
          missing: payload.missing,
        },
        confidence: payload.confidence,
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return null;
  }
}
