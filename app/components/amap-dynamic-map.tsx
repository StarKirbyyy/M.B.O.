"use client";

import { useEffect, useRef, useState } from "react";

import type { MapPoint } from "@/lib/agent/types";

interface DynamicMapProps {
  points: MapPoint[];
}

declare global {
  interface Window {
    AMap?: {
      Map: new (container: HTMLElement, options?: Record<string, unknown>) => AMapMap;
      Marker: new (options?: Record<string, unknown>) => unknown;
      Polyline: new (options?: Record<string, unknown>) => unknown;
      Pixel: new (x: number, y: number) => unknown;
    };
    __amapScriptLoading?: Promise<void>;
  }
}

interface AMapMap {
  add: (overlays: unknown[] | unknown) => void;
  setFitView: (overlays?: unknown[]) => void;
  destroy: () => void;
}

const NEXT_PUBLIC_AMAP_JS_KEY = process.env.NEXT_PUBLIC_AMAP_JS_KEY;

function loadAmapScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("window is undefined"));
  }

  if (window.AMap) {
    return Promise.resolve();
  }

  if (window.__amapScriptLoading) {
    return window.__amapScriptLoading;
  }

  if (!NEXT_PUBLIC_AMAP_JS_KEY) {
    return Promise.reject(new Error("NEXT_PUBLIC_AMAP_JS_KEY missing"));
  }

  window.__amapScriptLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(NEXT_PUBLIC_AMAP_JS_KEY)}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load AMap JS SDK"));
    document.head.appendChild(script);
  });

  return window.__amapScriptLoading;
}

export default function AmapDynamicMap({ points }: DynamicMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<AMapMap | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        setError(null);

        if (!containerRef.current) {
          return;
        }

        if (points.length === 0) {
          return;
        }

        await loadAmapScript();

        if (cancelled || !window.AMap || !containerRef.current) {
          return;
        }

        if (mapRef.current) {
          mapRef.current.destroy();
          mapRef.current = null;
        }

        const center = [points[0].longitude, points[0].latitude];
        const map = new window.AMap.Map(containerRef.current, {
          viewMode: "2D",
          zoom: 12,
          center,
        });

        const markers = points.map((point) =>
          new window.AMap!.Marker({
            position: [point.longitude, point.latitude],
            title: `${point.order}. ${point.place}`,
            label: {
              content: `${point.order}. ${point.place}`,
              direction: "top",
              offset: new window.AMap!.Pixel(0, -8),
            },
          }),
        );

        const polyline =
          points.length > 1
            ? new window.AMap.Polyline({
                path: points.map((point) => [point.longitude, point.latitude]),
                strokeColor: "#2563eb",
                strokeOpacity: 0.9,
                strokeWeight: 4,
              })
            : null;

        if (polyline) {
          map.add([polyline, ...markers]);
          map.setFitView([polyline, ...markers]);
        } else {
          map.add(markers);
          map.setFitView(markers);
        }

        mapRef.current = map;
      } catch (mapError) {
        const message = mapError instanceof Error ? mapError.message : "动态地图初始化失败";
        setError(message);
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, [points]);

  if (!NEXT_PUBLIC_AMAP_JS_KEY) {
    return (
      <p className="mt-3 text-sm text-amber-700">
        未配置 `NEXT_PUBLIC_AMAP_JS_KEY`，暂时无法展示动态地图。
      </p>
    );
  }

  return (
    <>
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      <div ref={containerRef} className="mt-3 h-[380px] w-full overflow-hidden rounded-xl border border-slate-200" />
    </>
  );
}
