import { z } from "zod";

import { clarifyGoal as clarifyWithRules } from "@/lib/agent/clarifier";
import { generateStructuredObject, isAgentModelConfigured } from "@/lib/agent/model/provider";
import type { ClarifiedIntent } from "@/lib/agent/types";

const intentSchema = z.object({
  city: z.string(),
  timeframe: z.enum(["today morning", "today afternoon", "today evening", "tomorrow", "this weekend", "full-day"]),
  vibes: z.array(z.string()).min(1).max(5),
  mobility: z.enum(["low", "medium", "high"]),
  budget: z.enum(["low", "medium", "high", "unknown"]),
  constraints: z.array(z.string()),
  missing: z.array(z.enum(["timeframe", "budget"])),
  confidence: z.number().min(0).max(1),
});

export async function parseCityIntent(input: string): Promise<{ intent: ClarifiedIntent; source: "model" | "rule" }> {
  const fallback = clarifyWithRules(input);
  if (!isAgentModelConfigured()) {
    return {
      intent: fallback,
      source: "rule",
    };
  }

  const modelResult = await generateStructuredObject({
    schema: intentSchema,
    system: "你是城市深度游 agent 的理解模块，只做结构化意图抽取，不输出多余文本。",
    prompt: [
      "根据用户输入抽取城市、时间、偏好、体力、预算、约束和缺失信息。",
      "如果用户表达一整天、全天、整天，timeframe 使用 full-day。",
      "必须返回合法 JSON。",
      `用户输入：${input}`,
    ].join("\n"),
  });

  if (!modelResult) {
    return {
      intent: fallback,
      source: "rule",
    };
  }

  return {
    intent: {
      rawInput: input.trim(),
      city: modelResult.city,
      timeframe: modelResult.timeframe,
      vibes: modelResult.vibes,
      mobility: modelResult.mobility,
      budget: modelResult.budget,
      constraints: modelResult.constraints,
      missing: modelResult.missing,
      confidence: modelResult.confidence,
    },
    source: "model",
  };
}
