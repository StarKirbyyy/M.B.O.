import { z } from "zod";

import type { PlanStep, PoiCheck, PoiSearchResult, WeatherSnapshot } from "@/lib/agent/types";
import type { StandardTool } from "@/lib/agent/tools/tool-types";

interface PoiValidateToolInput {
  step: PlanStep;
  weather: WeatherSnapshot;
  search: PoiSearchResult;
}

function hashSeed(input: string): number {
  let hash = 7;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) % 1_000_000_007;
  }
  return hash;
}

function deriveValidation({ step, weather, search }: PoiValidateToolInput): PoiCheck {
  const seed = hashSeed(`${step.place}:${step.time}:${weather.condition}`);

  if (!search.found) {
    return {
      stepId: step.id,
      place: step.place,
      available: false,
      reason: "poi_not_found",
      source: search.source,
      provider: search.provider,
    };
  }

  if (weather.condition === "rainy" && !step.indoor) {
    return {
      stepId: step.id,
      place: step.place,
      available: false,
      reason: "weather_risky_for_outdoor",
      source: search.source,
      provider: search.provider,
      displayName: search.displayName,
      latitude: search.latitude,
      longitude: search.longitude,
    };
  }

  if (seed % 19 === 0) {
    return {
      stepId: step.id,
      place: step.place,
      available: false,
      reason: "queue_too_long",
      source: search.source,
      provider: search.provider,
      displayName: search.displayName,
      latitude: search.latitude,
      longitude: search.longitude,
    };
  }

  if (seed % 23 === 0) {
    return {
      stepId: step.id,
      place: step.place,
      available: false,
      reason: "poi_temporarily_closed",
      source: search.source,
      provider: search.provider,
      displayName: search.displayName,
      latitude: search.latitude,
      longitude: search.longitude,
    };
  }

  return {
    stepId: step.id,
    place: step.place,
    available: true,
    reason: "ok",
    source: search.source,
    provider: search.provider,
    displayName: search.displayName,
    latitude: search.latitude,
    longitude: search.longitude,
  };
}

export const poiValidateTool: StandardTool<PoiValidateToolInput, PoiCheck> = {
  name: "poi_validate",
  description: "Validate whether a planned place is usable under current weather and provider observations.",
  inputSchema: z.object({
    step: z.any(),
    weather: z.any(),
    search: z.any(),
  }),
  async execute(input) {
    return deriveValidation(input);
  },
  toEvaluationRecord(result) {
    return {
      available: result.available,
      reason: result.reason,
      provider: result.provider ?? "unknown",
      source: result.source,
    };
  },
};
