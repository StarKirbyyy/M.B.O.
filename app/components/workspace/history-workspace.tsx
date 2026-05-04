"use client";

import { useRouter } from "next/navigation";

export default function HistoryWorkspace() {
  const router = useRouter();

  return (
    <section className="mx-auto w-full max-w-6xl px-0 py-0">
      <section className="mbo-hero mbo-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mbo-kicker">History Archive</p>
        <h1 className="text-2xl font-semibold text-slate-900">历史归档</h1>
        <p className="mt-2 text-sm text-slate-600">沉淀每次规划记录、用户反馈与执行轨迹，作为后续规划的参考基线。</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="mbo-chip">
            <span className="mbo-chip-dot" />
            PLAN TRACE
          </span>
          <span className="mbo-chip">FEEDBACK LOG</span>
          <span className="mbo-chip">SESSION RECORD</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => router.push("/user")}
            className="mbo-btn-cta rounded-lg border border-sky-300 bg-sky-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white"
          >
            查看用户历史
          </button>
          <button
            type="button"
            onClick={() => router.push("/planner")}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700"
          >
            返回路径规划
          </button>
        </div>
      </section>

      <section className="mbo-panel mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">归档入口说明</h2>
        <p className="mt-2 text-sm text-slate-600">
          当前版本中，详细历史数据已在“用户工作台”内可用。后续可在本页补充检索、筛选、导出等专用能力。
        </p>
      </section>
    </section>
  );
}
