import type { ClarifiedGoal, WeatherSnapshot } from "@/lib/agent/types";

const CONDITIONS: WeatherSnapshot["condition"][] = ["sunny", "cloudy", "windy", "rainy"];
const GEOCODING_ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const WEATHER_TIMEOUT_MS = Number(process.env.WEATHER_TOOL_TIMEOUT_MS ?? 4500);

interface GeocodingResponse {
  results?: Array<{
    latitude: number;
    longitude: number;
    name: string;
  }>;
}

interface ForecastResponse {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
  };
}

function hashSeed(input: string): number {
  let hash = 0;

  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) % 1_000_000_007;
  }

  return hash;
}

function buildAdvice(condition: WeatherSnapshot["condition"], temperatureC: number): string {
  if (condition === "rainy") {
    return "建议以室内点位为主，并预留打车机动时间。";
  }

  if (temperatureC >= 32) {
    return "气温偏高，建议减少步行并安排补水休息点。";
  }

  if (condition === "windy") {
    return "风较大，建议将长时间户外活动替换为室内短停留。";
  }

  return "天气平稳，可执行常规城市漫游计划。";
}

function mapWeatherCodeToCondition(weatherCode: number | undefined): WeatherSnapshot["condition"] {
  if (weatherCode === undefined) return "unknown";
  if ([0, 1].includes(weatherCode)) return "sunny";
  if ([2, 3, 45, 48].includes(weatherCode)) return "cloudy";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) return "rainy";
  if ([71, 73, 75, 77, 85, 86, 95, 96, 99].includes(weatherCode)) return "windy";
  return "unknown";
}

function isOfflineOnly(): boolean {
  return process.env.AGENT_OFFLINE_ONLY?.trim().toLowerCase() === "true";
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEATHER_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

function normalizeCityForQuery(city: string): string {
  return city.replace(/市$/, "").trim();
}

export async function getMockWeather(goal: ClarifiedGoal): Promise<WeatherSnapshot> {
  const seed = hashSeed(`${goal.city}:${goal.timeframe}:${goal.rawInput}`);
  const condition = CONDITIONS[seed % CONDITIONS.length] ?? "unknown";
  const temperatureC = 16 + (seed % 18);

  return {
    city: goal.city,
    condition,
    temperatureC,
    advice: buildAdvice(condition, temperatureC),
    source: "mock-fallback",
  };
}

async function getLiveWeather(goal: ClarifiedGoal): Promise<WeatherSnapshot> {
  const queryCity = normalizeCityForQuery(goal.city);
  const geoUrl = `${GEOCODING_ENDPOINT}?name=${encodeURIComponent(queryCity)}&count=1&language=zh&format=json`;
  const geoResponse = await fetchWithTimeout(geoUrl);
  if (!geoResponse.ok) {
    throw new Error(`geocoding failed: ${geoResponse.status}`);
  }

  const geoData = (await geoResponse.json()) as GeocodingResponse;
  const first = geoData.results?.[0];
  if (!first) {
    throw new Error("geocoding empty result");
  }

  const forecastUrl = `${FORECAST_ENDPOINT}?latitude=${first.latitude}&longitude=${first.longitude}&current=temperature_2m,weather_code&timezone=auto`;
  const forecastResponse = await fetchWithTimeout(forecastUrl);
  if (!forecastResponse.ok) {
    throw new Error(`forecast failed: ${forecastResponse.status}`);
  }

  const forecastData = (await forecastResponse.json()) as ForecastResponse;
  const temperatureC = Math.round(forecastData.current?.temperature_2m ?? 24);
  const condition = mapWeatherCodeToCondition(forecastData.current?.weather_code);

  return {
    city: goal.city,
    condition,
    temperatureC,
    advice: buildAdvice(condition, temperatureC),
    source: "live",
  };
}

export async function getWeather(goal: ClarifiedGoal): Promise<WeatherSnapshot> {
  if (isOfflineOnly()) {
    return getMockWeather(goal);
  }

  try {
    return await getLiveWeather(goal);
  } catch {
    return getMockWeather(goal);
  }
}
