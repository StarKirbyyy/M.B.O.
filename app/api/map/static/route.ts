const AMAP_STATICMAP_ENDPOINT = "https://restapi.amap.com/v3/staticmap";
const AMAP_WEB_KEY = process.env.AMAP_WEB_KEY?.trim();

export const dynamic = "force-dynamic";

interface Point {
  order: string;
  lng: number;
  lat: number;
}

function parsePoints(raw: string | null): Point[] {
  if (!raw) {
    return [];
  }

  return raw
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [order, lngText, latText] = item.split(",");
      const lng = Number(lngText);
      const lat = Number(latText);

      return {
        order: order?.trim() || "",
        lng,
        lat,
      };
    })
    .filter((item) => item.order && Number.isFinite(item.lng) && Number.isFinite(item.lat));
}

function buildAmapUrl(points: Point[]): string {
  if (!AMAP_WEB_KEY) {
    throw new Error("AMAP_WEB_KEY missing");
  }

  const markers = points
    .map((point) => `mid,0x3B82F6,${point.order}:${point.lng},${point.lat}`)
    .join("|");

  const visible = points.map((point) => `${point.lng},${point.lat}`).join("|");

  const query = new URLSearchParams({
    key: AMAP_WEB_KEY,
    size: "960*520",
    scale: "2",
    traffic: "1",
    markers,
    visible,
  });

  return `${AMAP_STATICMAP_ENDPOINT}?${query.toString()}`;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const points = parsePoints(url.searchParams.get("points"));

    if (points.length === 0) {
      return Response.json(
        {
          error: "invalid points",
          hint: "points 格式: 1,121.47,31.23;2,121.45,31.20",
        },
        { status: 400 },
      );
    }

    const target = buildAmapUrl(points);
    const response = await fetch(target, {
      cache: "no-store",
    });

    if (!response.ok) {
      return Response.json(
        {
          error: "amap static map failed",
          status: response.status,
        },
        { status: 502 },
      );
    }

    const contentType = response.headers.get("content-type") ?? "image/png";
    const bytes = await response.arrayBuffer();

    return new Response(bytes, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json(
      {
        error: "map render failed",
      },
      { status: 500 },
    );
  }
}
