import { z } from "zod";

import type { PoiSearchResult } from "@/lib/agent/types";
import type { StandardTool } from "@/lib/agent/tools/tool-types";

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const AMAP_PLACE_TEXT_ENDPOINT = "https://restapi.amap.com/v3/place/text";
const POI_TIMEOUT_MS = Number(process.env.POI_TOOL_TIMEOUT_MS ?? 4500);
const POI_PROVIDER = (process.env.POI_PROVIDER ?? "").trim().toLowerCase();
const AMAP_WEB_KEY = process.env.AMAP_WEB_KEY?.trim();

interface PoiSearchToolInput {
  city: string;
  query: string;
}

function isOfflineOnly(): boolean {
  return process.env.AGENT_OFFLINE_ONLY?.trim().toLowerCase() === "true";
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

async function searchWithAmap(city: string, query: string): Promise<PoiSearchResult> {
  if (!AMAP_WEB_KEY) {
    throw new Error("AMAP_WEB_KEY missing");
  }

  const url =
    `${AMAP_PLACE_TEXT_ENDPOINT}?key=${encodeURIComponent(AMAP_WEB_KEY)}` +
    `&keywords=${encodeURIComponent(query)}` +
    `&city=${encodeURIComponent(city)}` +
    "&citylimit=true&offset=1&page=1&extensions=base";

  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    throw new Error(`amap place search failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    status?: string;
    pois?: Array<{
      name?: string;
      address?: string;
      location?: string;
    }>;
  };

  const first = data.pois?.[0];
  if (!first) {
    return {
      city,
      query,
      found: false,
      provider: "amap",
      source: "live",
    };
  }

  return {
    city,
    query,
    found: true,
    provider: "amap",
    source: "live",
    displayName: first.address ? `${first.name ?? query}（${first.address}）` : first.name ?? query,
    ...parseAmapLocation(first.location),
  };
}

async function searchWithOsm(city: string, query: string): Promise<PoiSearchResult> {
  const url = `${NOMINATIM_ENDPOINT}?q=${encodeURIComponent(`${query} ${city}`)}&format=jsonv2&limit=1`;
  const response = await fetchWithTimeout(url, {
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "User-Agent": "city-flaneur-agent/0.2 (course-project)",
  });

  if (!response.ok) {
    throw new Error(`nominatim failed: ${response.status}`);
  }

  const first = ((await response.json()) as Array<{ display_name?: string; lat?: string; lon?: string }>)[0];
  if (!first) {
    return {
      city,
      query,
      found: false,
      provider: "osm",
      source: "live",
    };
  }

  return {
    city,
    query,
    found: true,
    provider: "osm",
    source: "live",
    displayName: first.display_name,
    latitude: first.lat ? Number(first.lat) : undefined,
    longitude: first.lon ? Number(first.lon) : undefined,
  };
}

function mockSearch(city: string, query: string): PoiSearchResult {
  return {
    city,
    query,
    found: true,
    provider: "mock",
    source: "mock-fallback",
  };
}

export const poiSearchTool: StandardTool<PoiSearchToolInput, PoiSearchResult> = {
  name: "poi_search",
  description: "Search for a place and resolve a provider, display name and coordinates.",
  inputSchema: z.object({
    city: z.string().min(1),
    query: z.string().min(1),
  }),
  async execute({ city, query }) {
    if (isOfflineOnly()) {
      return mockSearch(city, query);
    }

    try {
      if (shouldPreferAmap()) {
        const amap = await searchWithAmap(city, query);
        if (amap.found) {
          return amap;
        }
        return await searchWithOsm(city, query);
      }

      return await searchWithOsm(city, query);
    } catch {
      return mockSearch(city, query);
    }
  },
  toEvaluationRecord(result) {
    return {
      found: result.found,
      provider: result.provider,
      source: result.source,
      hasCoordinates: typeof result.latitude === "number" && typeof result.longitude === "number",
    };
  },
};
