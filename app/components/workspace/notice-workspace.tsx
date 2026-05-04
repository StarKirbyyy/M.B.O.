"use client";

export default function NoticeWorkspace() {
  return (
    <section className="mx-auto w-full max-w-6xl px-0 py-0">
      <section className="mbo-hero mbo-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mbo-kicker">Notice Center</p>
        <h1 className="text-2xl font-semibold text-slate-900">公告中心</h1>
        <p className="mt-2 text-sm text-slate-600">统一发布系统更新、版本变更、服务维护与功能上线公告。</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="mbo-chip">
            <span className="mbo-chip-dot" />
            VERSION NOTE
          </span>
          <span className="mbo-chip">SERVICE STATUS</span>
          <span className="mbo-chip">RELEASE NEWS</span>
        </div>
      </section>

      <section className="mbo-panel mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">近期公告</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          <li>2026-04-24: 主页框架与功能页面完成统一导航整合。</li>
          <li>2026-04-24: 登录/注册流程已接入主页壳层。</li>
          <li>2026-04-24: 侧边导航切换逻辑调整为一页一按钮绑定。</li>
        </ul>
      </section>
    </section>
  );
}
