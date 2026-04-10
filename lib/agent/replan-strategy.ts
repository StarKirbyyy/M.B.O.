export interface ReplanStrategy {
  id:
    | "weather-force-indoor"
    | "poi-closed-replace"
    | "queue-soft-adjust"
    | "poi-not-found-replace"
    | "memory-disliked-replace"
    | "generic-replace";
  label: string;
  forceIndoor: boolean;
  shouldReplace: boolean;
  durationDeltaMinutes: number;
}

function normalizeReason(reason: string): string {
  return reason.replace(/_fallback$/, "");
}

export function getReplanStrategy(rawReason: string): ReplanStrategy {
  const reason = normalizeReason(rawReason);

  if (reason === "weather_risky_for_outdoor") {
    return {
      id: "weather-force-indoor",
      label: "天气风险优先室内替换",
      forceIndoor: true,
      shouldReplace: true,
      durationDeltaMinutes: -10,
    };
  }

  if (reason === "poi_temporarily_closed") {
    return {
      id: "poi-closed-replace",
      label: "闭馆触发同偏好替换",
      forceIndoor: false,
      shouldReplace: true,
      durationDeltaMinutes: 0,
    };
  }

  if (reason === "queue_too_long") {
    return {
      id: "queue-soft-adjust",
      label: "排队过长先缩短停留并尝试替换",
      forceIndoor: false,
      shouldReplace: true,
      durationDeltaMinutes: -20,
    };
  }

  if (reason === "poi_not_found") {
    return {
      id: "poi-not-found-replace",
      label: "POI 不可定位触发保守替换",
      forceIndoor: false,
      shouldReplace: true,
      durationDeltaMinutes: -10,
    };
  }

  if (reason === "memory_disliked_place") {
    return {
      id: "memory-disliked-replace",
      label: "历史负反馈地点替换",
      forceIndoor: false,
      shouldReplace: true,
      durationDeltaMinutes: 0,
    };
  }

  return {
    id: "generic-replace",
    label: "通用替换策略",
    forceIndoor: false,
    shouldReplace: true,
    durationDeltaMinutes: 0,
  };
}

export function applyDurationDelta(durationMinutes: number, delta: number): number {
  if (delta === 0) {
    return durationMinutes;
  }

  return Math.max(40, durationMinutes + delta);
}
