import type { ClarifiedGoal, PlanStep, PoiCheck, WeatherSnapshot } from "@/lib/agent/types";

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const AMAP_PLACE_TEXT_ENDPOINT = "https://restapi.amap.com/v3/place/text";
const POI_TIMEOUT_MS = Number(process.env.POI_TOOL_TIMEOUT_MS ?? 4500);
const POI_PROVIDER = (process.env.POI_PROVIDER ?? "").trim().toLowerCase();
const AMAP_WEB_KEY = process.env.AMAP_WEB_KEY?.trim();

interface NominatimRecord {
  display_name?: string;
  lat?: string;
  lon?: string;
}

interface AmapPoi {
  name?: string;
  address?: string;
  location?: string;
  business_status?: string;
}

interface AmapPlaceTextResponse {
  status?: string;
  info?: string;
  pois?: AmapPoi[];
}

function hashSeed(input: string): number {
  let hash = 7;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) % 1_000_000_007;
  }
  return hash;
}

function isOfflineOnly(): boolean {
  return process.env.AGENT_OFFLINE_ONLY?.trim().toLowerCase() === "true";
}

async function fetchWithTimeout(url: string, headers?: HeadersInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), POI_TIMEOUT_MS);

  try {
    return await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers,
    });
  } finally {
    clearTimeout(timer);
  }
}

function baseRule(params: {
  seed: number;
  step: PlanStep;
  weather: WeatherSnapshot;
}): { available: boolean; reason: string } {
  const { seed, step, weather } = params;

  if (weather.condition === "rainy" && !step.indoor) {
    return {
      available: false,
      reason: "weather_risky_for_outdoor",
    };
  }

  if (seed % 19 === 0) {
    return {
      available: false,
      reason: "queue_too_long",
    };
  }

  return {
    available: true,
    reason: "ok",
  };
}

function parseAmapLocation(location?: string): { latitude?: number; longitude?: number } {
  if (!location || !location.includes(",")) {
    return {};
  }

  const [lng, lat] = location.split(",");
  const longitude = Number(lng);
  const latitude = Number(lat);

  return {
    latitude: Number.isFinite(latitude) ? latitude : undefined,
    longitude: Number.isFinite(longitude) ? longitude : undefined,
  };
}

function normalizeBusinessStatus(status?: string): "open" | "closed" | "unknown" {
  if (!status) return "unknown";

  if (status.includes("营业中") || status.toLowerCase().includes("open")) {
    return "open";
  }

  if (
    status.includes("暂停") ||
    status.includes("关闭") ||
    status.includes("休息") ||
    status.toLowerCase().includes("close")
  ) {
    return "closed";
  }

  return "unknown";
}

async function checkPoiWithAmap(params: {
  goal: ClarifiedGoal;
  step: PlanStep;
  weather: WeatherSnapshot;
  seed: number;
}): Promise<PoiCheck> {
  const { goal, step, weather, seed } = params;

  if (!AMAP_WEB_KEY) {
    throw new Error("AMAP_WEB_KEY missing");
  }

  const url =
    `${AMAP_PLACE_TEXT_ENDPOINT}?key=${encodeURIComponent(AMAP_WEB_KEY)}` +
    `&keywords=${encodeURIComponent(step.place)}` +
    `&city=${encodeURIComponent(goal.city)}` +
    "&citylimit=true&offset=1&page=1&extensions=base";

  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    throw new Error(`amap place search failed: ${response.status}`);
  }

  const data = (await response.json()) as AmapPlaceTextResponse;
  if (data.status !== "1") {
    throw new Error(`amap api error: ${data.info ?? "unknown"}`);
  }

  const first = data.pois?.[0];
  if (!first) {
    return {
      stepId: step.id,
      place: step.place,
      available: false,
      reason: "poi_not_found",
      source: "live",
      provider: "amap",
    };
  }

  const businessStatus = normalizeBusinessStatus(first.business_status);
  if (businessStatus === "closed") {
    const coordinates = parseAmapLocation(first.location);
    return {
      stepId: step.id,
      place: step.place,
      available: false,
      reason: "poi_temporarily_closed",
      source: "live",
      provider: "amap",
      displayName: first.address ? `${first.name ?? step.place}（${first.address}）` : first.name ?? step.place,
      ...coordinates,
    };
  }

  const rule = baseRule({ seed, step, weather });
  const coordinates = parseAmapLocation(first.location);

  return {
    stepId: step.id,
    place: step.place,
    available: rule.available,
    reason: rule.reason,
    source: "live",
    provider: "amap",
    displayName: first.address ? `${first.name ?? step.place}（${first.address}）` : first.name ?? step.place,
    ...coordinates,
  };
}

async function checkPoiWithOsm(params: {
  goal: ClarifiedGoal;
  step: PlanStep;
  weather: WeatherSnapshot;
  seed: number;
}): Promise<PoiCheck> {
  const { goal, step, weather, seed } = params;
  const query = `${step.place} ${goal.city}`;
  const url = `${NOMINATIM_ENDPOINT}?q=${encodeURIComponent(query)}&format=jsonv2&limit=1`;

  const response = await fetchWithTimeout(url, {
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "User-Agent": "city-flaneur-agent/0.1 (course-project)",
  });

  if (!response.ok) {
    throw new Error(`nominatim failed: ${response.status}`);
  }

  const data = (await response.json()) as NominatimRecord[];
  const first = data[0];

  if (!first) {
    return {
      stepId: step.id,
      place: step.place,
      available: false,
      reason: "poi_not_found",
      source: "live",
      provider: "osm",
    };
  }

  const rule = baseRule({ seed, step, weather });
  return {
    stepId: step.id,
    place: step.place,
    available: rule.available,
    reason: rule.reason,
    source: "live",
    provider: "osm",
    displayName: first.display_name,
    latitude: first.lat ? Number(first.lat) : undefined,
    longitude: first.lon ? Number(first.lon) : undefined,
  };
}

function shouldPreferAmap(): boolean {
  if (POI_PROVIDER === "amap") {
    return true;
  }

  if (POI_PROVIDER === "osm") {
    return false;
  }

  return Boolean(AMAP_WEB_KEY);
}

export async function checkPoiAvailability(params: {
  goal: ClarifiedGoal;
  step: PlanStep;
  weather: WeatherSnapshot;
}): Promise<PoiCheck> {
  const { goal, step, weather } = params;
  const seed = hashSeed(`${goal.city}:${step.place}:${step.time}:${goal.rawInput}`);

  if (isOfflineOnly()) {
    const rule = baseRule({ seed, step, weather });
    return {
      stepId: step.id,
      place: step.place,
      available: rule.available,
      reason: `${rule.reason}_offline`,
      source: "mock-fallback",
      provider: "mock",
    };
  }

  try {
    if (shouldPreferAmap()) {
      const amapResult = await checkPoiWithAmap({ goal, step, weather, seed });
      if (amapResult.reason !== "poi_not_found") {
        return amapResult;
      }

      const osmResult = await checkPoiWithOsm({ goal, step, weather, seed });
      return osmResult.reason === "poi_not_found" ? amapResult : osmResult;
    }

    return await checkPoiWithOsm({ goal, step, weather, seed });
  } catch {
    const rule = baseRule({ seed, step, weather });
    return {
      stepId: step.id,
      place: step.place,
      available: rule.available,
      reason: `${rule.reason}_fallback`,
      source: "mock-fallback",
      provider: "mock",
    };
  }
}
