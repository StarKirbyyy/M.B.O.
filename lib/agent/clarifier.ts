import type { BudgetLevel, ClarifiedGoal, MobilityLevel } from "@/lib/agent/types";

interface CityAlias {
  canonical: string;
  aliases: string[];
}

const CITY_ALIASES: CityAlias[] = [
  { canonical: "上海", aliases: ["上海", "shanghai"] },
  { canonical: "北京", aliases: ["北京", "beijing"] },
  { canonical: "广州", aliases: ["广州", "guangzhou"] },
  { canonical: "深圳", aliases: ["深圳", "shenzhen"] },
  { canonical: "杭州", aliases: ["杭州", "hangzhou"] },
  { canonical: "南京", aliases: ["南京", "nanjing"] },
  { canonical: "苏州", aliases: ["苏州", "suzhou"] },
  { canonical: "成都", aliases: ["成都", "chengdu"] },
  { canonical: "重庆", aliases: ["重庆", "chongqing"] },
  { canonical: "武汉", aliases: ["武汉", "wuhan"] },
  { canonical: "西安", aliases: ["西安", "xian", "xi'an"] },
  { canonical: "天津", aliases: ["天津", "tianjin"] },
  { canonical: "长沙", aliases: ["长沙", "changsha"] },
  { canonical: "青岛", aliases: ["青岛", "qingdao"] },
];

const CITY_STOP_WORDS = new Set(["一个", "下午", "晚上", "上午", "周末", "城市", "地方"]);

function detectCity(input: string): string {
  const lower = input.toLowerCase();

  for (const city of CITY_ALIASES) {
    const hit = city.aliases.some((alias) => lower.includes(alias.toLowerCase()));
    if (hit) {
      return city.canonical;
    }
  }

  const cnMatch = input.match(/(?:在|去|到)([\u4e00-\u9fa5]{2,8}?)(?:市)?(?=度过|玩|逛|旅游|旅行|待|住|的|，|。|\s|$)/);
  if (cnMatch && cnMatch[1]) {
    const candidate = cnMatch[1];
    if (!CITY_STOP_WORDS.has(candidate)) {
      return candidate;
    }
  }

  return "上海";
}

function detectTimeframe(input: string): string {
  if (input.includes("上午")) return "today morning";
  if (input.includes("下午")) return "today afternoon";
  if (input.includes("晚上") || input.includes("夜")) return "today evening";
  if (input.includes("明天")) return "tomorrow";
  if (input.includes("周末")) return "this weekend";

  return "today afternoon";
}

function detectVibes(input: string): string[] {
  const vibes: string[] = [];

  if (input.includes("艺术") || input.includes("美术") || input.includes("展")) {
    vibes.push("art");
  }
  if (input.includes("建筑") || input.includes("历史") || input.includes("古") || input.includes("人文")) {
    vibes.push("architecture");
  }
  if (input.includes("咖啡") || input.includes("休息") || input.includes("放松") || input.includes("chill")) {
    vibes.push("relax");
  }

  if (vibes.length === 0) {
    vibes.push("city-walk");
  }

  return vibes;
}

function detectMobility(input: string): MobilityLevel {
  const lower = input.toLowerCase();

  if (
    input.includes("不想太累") ||
    input.includes("轻松") ||
    input.includes("少走") ||
    input.includes("休闲") ||
    lower.includes("easy")
  ) {
    return "low";
  }

  if (input.includes("暴走") || input.includes("高强度") || lower.includes("intense")) {
    return "high";
  }

  return "medium";
}

function detectBudget(input: string): BudgetLevel {
  const lower = input.toLowerCase();

  if (input.includes("省钱") || input.includes("便宜") || input.includes("学生") || lower.includes("budget")) {
    return "low";
  }

  if (input.includes("高预算") || input.includes("奢华") || input.includes("高端") || lower.includes("luxury")) {
    return "high";
  }

  if (input.includes("预算") || input.includes("花费")) {
    return "medium";
  }

  return "unknown";
}

function detectConstraints(input: string): string[] {
  const constraints: string[] = [];

  if (input.includes("不想太累") || input.includes("少走")) {
    constraints.push("limit-walking");
  }
  if (input.includes("下雨") || input.includes("室内")) {
    constraints.push("prefer-indoor");
  }
  if (input.includes("地铁") || input.includes("公共交通")) {
    constraints.push("public-transport-only");
  }

  return constraints;
}

function detectMissing(input: string, budget: BudgetLevel): string[] {
  const missing: string[] = [];

  const hasExplicitTime = ["上午", "下午", "晚上", "夜", "明天", "周末"].some((keyword) => input.includes(keyword));
  if (!hasExplicitTime) {
    missing.push("timeframe");
  }

  if (budget === "unknown") {
    missing.push("budget");
  }

  return missing;
}

export function clarifyGoal(userInput: string): ClarifiedGoal {
  const normalized = userInput.trim();
  const city = detectCity(normalized);
  const timeframe = detectTimeframe(normalized);
  const vibes = detectVibes(normalized);
  const mobility = detectMobility(normalized);
  const budget = detectBudget(normalized);
  const constraints = detectConstraints(normalized);
  const missing = detectMissing(normalized, budget);

  return {
    rawInput: normalized,
    city,
    timeframe,
    vibes,
    mobility,
    budget,
    constraints,
    missing,
  };
}
