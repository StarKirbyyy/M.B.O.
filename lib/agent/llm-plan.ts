import OpenAI from "openai";

import type { ClarifiedGoal, PlanStep, WeatherSnapshot } from "@/lib/agent/types";

const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY?.trim();
const SILICONFLOW_BASE_URL = process.env.SILICONFLOW_BASE_URL?.trim() || "https://api.siliconflow.cn/v1";
const SILICONFLOW_MODEL = process.env.SILICONFLOW_MODEL?.trim();
const SILICONFLOW_TIMEOUT_MS = Number(process.env.SILICONFLOW_TIMEOUT_MS ?? 12000);

interface ModelStep {
  time?: string;
  place?: string;
  action?: string;
  vibe?: string;
  mode?: "walk" | "metro" | "taxi" | "bike";
  durationMinutes?: number;
  indoor?: boolean;
  reason?: string;
}

interface ModelPayload {
  steps?: ModelStep[];
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

function normalizeMode(mode: unknown): PlanStep["mode"] {
  if (mode === "metro" || mode === "taxi" || mode === "bike") {
    return mode;
  }

  return "walk";
}

function normalizeVibe(vibe: unknown): string {
  if (typeof vibe === "string" && vibe.trim()) {
    return vibe.trim();
  }

  return "city-walk";
}

function toPlanSteps(payload: ModelPayload): PlanStep[] | null {
  if (!Array.isArray(payload.steps) || payload.steps.length < 3) {
    return null;
  }

  const normalized = payload.steps.slice(0, 3).map((step, index) => {
    const id = `step-${index + 1}`;
    return {
      id,
      time: typeof step.time === "string" && step.time.trim() ? step.time.trim() : `${14 + index}:00`,
      place: typeof step.place === "string" && step.place.trim() ? step.place.trim() : `候选地点 ${index + 1}`,
      action: typeof step.action === "string" && step.action.trim() ? step.action.trim() : "按计划执行",
      vibe: normalizeVibe(step.vibe),
      mode: normalizeMode(step.mode),
      durationMinutes:
        typeof step.durationMinutes === "number" && Number.isFinite(step.durationMinutes)
          ? Math.max(40, Math.round(step.durationMinutes))
          : 60,
      indoor: typeof step.indoor === "boolean" ? step.indoor : false,
      reason: typeof step.reason === "string" && step.reason.trim() ? step.reason.trim() : "由模型根据约束生成",
    } satisfies PlanStep;
  });

  return normalized;
}

function buildPrompt(goal: ClarifiedGoal, weather: WeatherSnapshot): string {
  return [
    "请输出 3 步城市行程计划，必须为 JSON，且只返回 JSON。",
    'JSON 结构: {"steps":[{"time":"14:00","place":"...","action":"...","vibe":"art","mode":"walk|metro|taxi|bike","durationMinutes":60,"indoor":true,"reason":"..."}]}',
    `城市: ${goal.city}`,
    `时段: ${goal.timeframe}`,
    `偏好: ${goal.vibes.join(",")}`,
    `体力模式: ${goal.mobility}`,
    `预算: ${goal.budget}`,
    `天气: ${weather.condition}, ${weather.temperatureC}C`,
    `附加约束: ${goal.constraints.join(",") || "none"}`,
    "要求: 至少一个步骤与偏好最相关；天气下雨时优先室内；语言使用中文简洁描述。",
  ].join("\n");
}

export function isSiliconFlowConfigured(): boolean {
  if (isOfflineOnly()) {
    return false;
  }

  return Boolean(SILICONFLOW_API_KEY && SILICONFLOW_MODEL);
}

export async function generatePlanWithSiliconFlow(params: {
  goal: ClarifiedGoal;
  weather: WeatherSnapshot;
}): Promise<PlanStep[] | null> {
  const { goal, weather } = params;
  const client = getClient();

  if (!client || !SILICONFLOW_MODEL) {
    return null;
  }

  try {
    const response = await client.chat.completions.create({
      model: SILICONFLOW_MODEL,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: "你是一个城市深度游助手，擅长根据约束输出结构化行程。",
        },
        {
          role: "user",
          content: buildPrompt(goal, weather),
        },
      ],
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      return null;
    }

    const jsonText = extractJson(content);
    const parsed = JSON.parse(jsonText) as ModelPayload;
    return toPlanSteps(parsed);
  } catch {
    return null;
  }
}

export async function generatePlanWithSiliconFlowStreaming(params: {
  goal: ClarifiedGoal;
  weather: WeatherSnapshot;
  onChunk?: (chunk: string) => void;
}): Promise<PlanStep[] | null> {
  const { goal, weather, onChunk } = params;
  const client = getClient();

  if (!client || !SILICONFLOW_MODEL) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SILICONFLOW_TIMEOUT_MS);
    try {
      const stream = await client.chat.completions.create(
        {
          model: SILICONFLOW_MODEL,
          temperature: 0.3,
          stream: true,
          messages: [
            {
              role: "system",
              content: "你是一个城市深度游助手，擅长根据约束输出结构化行程。",
            },
            {
              role: "user",
              content: buildPrompt(goal, weather),
            },
          ],
        },
        {
          signal: controller.signal,
        },
      );

      let content = "";
      for await (const part of stream) {
        const delta = part.choices?.[0]?.delta?.content ?? "";
        if (delta) {
          content += delta;
          onChunk?.(delta);
        }
      }

      if (!content) {
        return null;
      }

      const jsonText = extractJson(content);
      const parsed = JSON.parse(jsonText) as ModelPayload;
      return toPlanSteps(parsed);
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return null;
  }
}
