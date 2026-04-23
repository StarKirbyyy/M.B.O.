import { z } from "zod";

import { getWeather } from "@/lib/agent/tools/weather";
import type { ClarifiedIntent, WeatherSnapshot } from "@/lib/agent/types";
import type { StandardTool } from "@/lib/agent/tools/tool-types";

interface WeatherToolInput {
  intent: ClarifiedIntent;
}

interface WeatherToolResult extends WeatherSnapshot {
  ok: true;
}

export const weatherTool: StandardTool<WeatherToolInput, WeatherToolResult> = {
  name: "weather",
  description: "Resolve live or fallback weather for the target city and constraints.",
  inputSchema: z.object({
    intent: z.any(),
  }),
  async execute({ intent }) {
    const weather = await getWeather(intent);
    return {
      ok: true,
      ...weather,
    };
  },
  toEvaluationRecord(result) {
    return {
      ok: result.ok,
      city: result.city,
      condition: result.condition,
      source: result.source ?? "unknown",
    };
  },
};
