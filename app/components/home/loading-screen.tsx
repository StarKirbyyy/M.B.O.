"use client";

import { createPortal } from "react-dom";

import type { LoadingPhase } from "@/app/components/home/types";

export default function LoadingScreen({ progress, phase }: { progress: number; phase: LoadingPhase }) {
  if (typeof document === "undefined") {
    return null;
  }

  const displayProgress = Math.max(0, Math.min(100, Math.floor(progress)));
  const markerTop = `clamp(1.2rem, calc(${displayProgress}% - 1.5rem), calc(100% - 3rem))`;

  return createPortal(
    <div
      className={`mbo-loading-screen ${phase === "expand" || phase === "reveal" ? "is-expand" : ""} ${
        phase === "reveal" ? "is-reveal" : ""
      }`}
      aria-live="polite"
      aria-busy="true"
    >
      <div className="mbo-loading-grid" />
      <div className="mbo-loading-linework" />
      {phase === "progress" ? (
        <div className="mbo-loading-core">
          <p className="mbo-loading-brand">M.B.O.</p>
          <h1 className="mbo-loading-title">MOBILITY BUREAU OPERATION</h1>
          <p className="mbo-loading-slogan">OVER THE FRONTIER / INTO THE FRONT</p>
        </div>
      ) : null}
      <div className="mbo-loading-rail">
        <span className="mbo-loading-rail-fill" style={{ height: `${displayProgress}%` }} />
        <p className="mbo-loading-rail-value" style={{ top: markerTop }}>
          {displayProgress}%
        </p>
        <p className="mbo-loading-rail-caption" style={{ top: `calc(${markerTop} + 2.3rem)` }}>
          Updating...
        </p>
      </div>
    </div>,
    document.body,
  );
}
