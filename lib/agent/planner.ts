import type { ClarifiedGoal, PlanStep, WeatherSnapshot } from "@/lib/agent/types";

export interface PlaceOption {
  name: string;
  vibe: string;
  indoor: boolean;
}

const CITY_POI: Record<string, PlaceOption[]> = {
  上海: [
    { name: "思南公馆慢节奏咖啡馆", vibe: "relax", indoor: true },
    { name: "M50 创意园区", vibe: "art", indoor: true },
    { name: "西岸美术馆", vibe: "art", indoor: true },
    { name: "上海城市规划展示馆", vibe: "architecture", indoor: true },
    { name: "外滩历史建筑群", vibe: "architecture", indoor: false },
    { name: "武康路街区", vibe: "city-walk", indoor: false },
    { name: "徐汇滨江慢行步道", vibe: "city-walk", indoor: false },
  ],
  default: [
    { name: "本地独立咖啡馆", vibe: "relax", indoor: true },
    { name: "城市美术馆", vibe: "art", indoor: true },
    { name: "历史文化街区", vibe: "architecture", indoor: false },
    { name: "城市公园", vibe: "city-walk", indoor: false },
  ],
};

export function getCandidates(city: string): PlaceOption[] {
  return CITY_POI[city] ?? CITY_POI.default;
}

function pickSlot(timeframe: string): [string, string, string] {
  if (timeframe === "today morning") return ["09:30", "11:00", "12:30"];
  if (timeframe === "today evening") return ["17:30", "19:00", "20:30"];

  return ["14:00", "15:30", "17:00"];
}

function pickMode(mobility: ClarifiedGoal["mobility"], stepIndex: number): PlanStep["mode"] {
  if (mobility === "low") {
    return stepIndex === 1 ? "walk" : "taxi";
  }

  if (mobility === "high") {
    return stepIndex % 2 === 0 ? "walk" : "metro";
  }

  return stepIndex === 1 ? "metro" : "walk";
}

function choosePlace(
  candidates: PlaceOption[],
  preferredVibe: string,
  used: Set<string>,
  preferIndoor: boolean,
): PlaceOption {
  const sameVibe = candidates.filter((item) => item.vibe === preferredVibe && !used.has(item.name));
  const filtered = preferIndoor ? sameVibe.filter((item) => item.indoor) : sameVibe;

  if (filtered.length > 0) {
    return filtered[0];
  }

  if (sameVibe.length > 0) {
    return sameVibe[0];
  }

  const fallback = candidates.find((item) => !used.has(item.name) && (!preferIndoor || item.indoor));
  if (fallback) {
    return fallback;
  }

  return candidates[0];
}

function chooseAlternativePlace(
  candidates: PlaceOption[],
  preferredVibe: string,
  excludedPlaces: Set<string>,
  preferIndoor: boolean,
): PlaceOption | null {
  const ranked = candidates
    .filter((candidate) => !excludedPlaces.has(candidate.name))
    .sort((a, b) => {
      const vibeScoreA = a.vibe === preferredVibe ? 2 : 0;
      const vibeScoreB = b.vibe === preferredVibe ? 2 : 0;
      const indoorScoreA = preferIndoor && a.indoor ? 1 : 0;
      const indoorScoreB = preferIndoor && b.indoor ? 1 : 0;
      return vibeScoreB + indoorScoreB - (vibeScoreA + indoorScoreA);
    });

  return ranked[0] ?? null;
}

function stepReason(
  vibe: string,
  weather: WeatherSnapshot,
  mobility: ClarifiedGoal["mobility"],
  indoor: boolean,
): string {
  const vibeReason = `贴合你当前的兴趣偏好：${vibe}`;
  const weatherReason =
    weather.condition === "rainy"
      ? indoor
        ? "考虑到降雨，优先选择室内点位。"
        : "天气有变化风险，后续可切到室内备选。"
      : "当前天气较稳定。";
  const mobilityReason =
    mobility === "low" ? "已控制步行强度，避免过度体力消耗。" : "活动强度保持在可接受范围内。";

  return `${vibeReason}；${weatherReason}${mobilityReason}`;
}

function buildSummary(goal: ClarifiedGoal, weather: WeatherSnapshot): string {
  const followUp = goal.missing.length > 0 ? `建议补充：${goal.missing.join("、")}。` : "关键约束信息已充足。";
  return `已为${goal.city}生成 3 步轻量深度游初始计划。天气：${weather.condition} ${weather.temperatureC}°C。${followUp}`;
}

export function buildInitialPlan(goal: ClarifiedGoal, weather: WeatherSnapshot): PlanStep[] {
  const [t1, t2, t3] = pickSlot(goal.timeframe);
  const candidates = getCandidates(goal.city);
  const used = new Set<string>();
  const preferIndoor = weather.condition === "rainy" || goal.constraints.includes("prefer-indoor");

  const firstVibe = goal.vibes.includes("relax") ? "relax" : goal.vibes[0] ?? "city-walk";
  const secondVibe = goal.vibes[0] ?? "art";
  const thirdVibe = preferIndoor ? "relax" : "city-walk";

  const first = choosePlace(candidates, firstVibe, used, preferIndoor);
  used.add(first.name);

  const second = choosePlace(candidates, secondVibe, used, preferIndoor);
  used.add(second.name);

  const third = choosePlace(candidates, thirdVibe, used, preferIndoor);

  return [
    {
      id: "step-1",
      time: t1,
      place: first.name,
      action: "轻量热身，建立当日下午的节奏",
      vibe: first.vibe,
      mode: pickMode(goal.mobility, 0),
      durationMinutes: 60,
      reason: stepReason(first.vibe, weather, goal.mobility, first.indoor),
      indoor: first.indoor,
    },
    {
      id: "step-2",
      time: t2,
      place: second.name,
      action: "进入核心兴趣点深度停留",
      vibe: second.vibe,
      mode: pickMode(goal.mobility, 1),
      durationMinutes: 90,
      reason: stepReason(second.vibe, weather, goal.mobility, second.indoor),
      indoor: second.indoor,
    },
    {
      id: "step-3",
      time: t3,
      place: third.name,
      action: "收束行程并预留弹性结束时间",
      vibe: third.vibe,
      mode: pickMode(goal.mobility, 2),
      durationMinutes: 70,
      reason: stepReason(third.vibe, weather, goal.mobility, third.indoor),
      indoor: third.indoor,
    },
  ];
}

export function summarizeInitialPlan(goal: ClarifiedGoal, weather: WeatherSnapshot): string {
  return buildSummary(goal, weather);
}

interface ReplacementParams {
  goal: ClarifiedGoal;
  weather: WeatherSnapshot;
  originalStep: PlanStep;
  usedPlaces: Set<string>;
  forceIndoor?: boolean;
}

export function buildReplacementStep(params: ReplacementParams): PlanStep | null {
  const { goal, weather, originalStep, usedPlaces, forceIndoor = false } = params;
  const candidates = getCandidates(goal.city);
  const preferIndoor = forceIndoor || weather.condition === "rainy" || goal.constraints.includes("prefer-indoor");
  const excluded = new Set<string>([...usedPlaces, originalStep.place]);
  const replacement = chooseAlternativePlace(candidates, originalStep.vibe, excluded, preferIndoor);

  if (!replacement) {
    return null;
  }

  return {
    ...originalStep,
    place: replacement.name,
    indoor: replacement.indoor,
    vibe: replacement.vibe,
    reason: `重规划替代点位：${replacement.name}。原因为环境变化或点位不可用。`,
  };
}
