import { z } from "zod";

import {
  buildInitialPlan as buildRuleInitialPlan,
  buildReplacementStep as buildRuleReplacementStep,
  summarizeInitialPlan as summarizeRulePlan,
} from "@/lib/agent/planner";
import { generateStructuredObject, isAgentModelConfigured } from "@/lib/agent/model/provider";
import type { ClarifiedIntent, PlanStep, WeatherSnapshot } from "@/lib/agent/types";

const planStepSchema = z.object({
  time: z.string(),
  place: z.string(),
  action: z.string(),
  vibe: z.string(),
  mode: z.enum(["walk", "metro", "taxi", "bike"]),
  durationMinutes: z.number().int().min(40).max(180),
  indoor: z.boolean(),
  reason: z.string(),
  requiresTools: z.array(z.enum(["weather", "poi_search", "poi_validate"])).min(1),
});

const planSchema = z.object({
  steps: z.array(planStepSchema).min(3).max(3),
  confidence: z.number().min(0).max(1),
});

function normalizePlanSteps(steps: Array<z.infer<typeof planStepSchema>>): PlanStep[] {
  return steps.map((step, index) => ({
    id: `step-${index + 1}`,
    time: step.time,
    place: step.place,
    action: step.action,
    vibe: step.vibe,
    mode: step.mode,
    durationMinutes: step.durationMinutes,
    indoor: step.indoor,
    reason: step.reason,
    requiresTools: step.requiresTools,
  }));
}

export async function buildCityPlan(params: {
  intent: ClarifiedIntent;
  weather: WeatherSnapshot;
}): Promise<{ steps: PlanStep[]; source: "siliconflow" | "rule"; confidence?: number }> {
  const { intent, weather } = params;
  const fallback = buildRuleInitialPlan(intent, weather).map((step) => ({
    ...step,
    requiresTools: ["poi_search", "poi_validate"] as Array<"poi_search" | "poi_validate">,
  }));

  if (!isAgentModelConfigured()) {
    return {
      steps: fallback,
      source: "rule",
    };
  }

  const modelResult = await generateStructuredObject({
    schema: planSchema,
    system: "你是城市深度游 agent 的 plan-and-execute 规划模块。只输出 3 步计划，不要输出解释性文本。",
    prompt: [
      `城市：${intent.city}`,
      `时间：${intent.timeframe}`,
      `偏好：${intent.vibes.join(", ")}`,
      `体力：${intent.mobility}`,
      `预算：${intent.budget}`,
      `约束：${intent.constraints.join(", ") || "none"}`,
      `天气：${weather.condition} / ${weather.temperatureC}C`,
      "每步都必须携带 requiresTools。",
    ].join("\n"),
  });

  if (!modelResult) {
    return {
      steps: fallback,
      source: "rule",
    };
  }

  return {
    steps: normalizePlanSteps(modelResult.steps),
    source: "siliconflow",
    confidence: modelResult.confidence,
  };
}

export function buildReplacementCityStep(params: {
  intent: ClarifiedIntent;
  weather: WeatherSnapshot;
  originalStep: PlanStep;
  usedPlaces: Set<string>;
  forceIndoor?: boolean;
}): PlanStep | null {
  const replacement = buildRuleReplacementStep({
    goal: params.intent,
    weather: params.weather,
    originalStep: params.originalStep,
    usedPlaces: params.usedPlaces,
    forceIndoor: params.forceIndoor,
  });
  if (!replacement) {
    return null;
  }

  return {
    ...replacement,
    requiresTools: ["poi_search", "poi_validate"],
  };
}

export function summarizeCityPlan(intent: ClarifiedIntent, weather: WeatherSnapshot): string {
  return summarizeRulePlan(intent, weather);
}
