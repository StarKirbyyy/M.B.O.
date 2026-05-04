"use client";

import CityAgentConsole from "@/app/components/city-agent-console";

interface PlannerWorkspaceProps {
  mode?: "page" | "embedded";
}

function PlannerWorkspaceBody() {
  return (
    <>
      <section className="mbo-hero mbo-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mbo-kicker">Planning Console</p>
        <h1 className="text-2xl font-semibold text-slate-900">规划与可视化</h1>
        <p className="mt-2 text-sm text-slate-600">
          当前页面支持 SSE 规划流、状态链路、地图、反馈写回。登录后自动绑定当前账号的 userId。
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="mbo-chip">
            <span className="mbo-chip-dot" />
            LIVE STREAM
          </span>
          <span className="mbo-chip">REPLAN TRACK</span>
          <span className="mbo-chip">MAP LINK</span>
        </div>
      </section>
      <CityAgentConsole />
    </>
  );
}

export default function PlannerWorkspace({ mode = "page" }: PlannerWorkspaceProps) {
  if (mode === "embedded") {
    return (
      <section className="mx-auto w-full max-w-6xl px-0 py-0">
        <PlannerWorkspaceBody />
      </section>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
      <PlannerWorkspaceBody />
    </main>
  );
}
