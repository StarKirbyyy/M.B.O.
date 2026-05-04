"use client";

import Image from "next/image";
import { useState } from "react";

import AmapDynamicMap from "@/app/components/amap-dynamic-map";
import type { AgentRunEvent, MobilityLevel, PlanResult } from "@/lib/agent/types";

const DEFAULT_INPUT = "我想在上海度过一个有艺术感的下午，但不想太累";

function describeEvent(event: AgentRunEvent): string {
  switch (event.type) {
    case "run_started":
      return "运行已启动";
    case "stage_started":
      return `${event.stage} · ${event.detail}`;
    case "thought_generated":
      return `${event.stage} · ${event.summary}`;
    case "tool_called":
      return `${event.stage} · 调用 ${event.toolName}`;
    case "tool_result":
      return `${event.stage} · ${event.toolName} ${event.success ? "成功" : "失败"}`;
    case "replan_requested":
      return `reflect · 请求重规划：${event.reason}`;
    case "replan_applied":
      return `reflect · 应用重规划：${event.reason}`;
    case "run_completed":
      return "运行完成";
    case "run_failed":
      return `运行失败：${event.message}`;
    default:
      return "未知事件";
  }
}

export default function CityAgentConsole() {
  const [userId, setUserId] = useState("local-user");
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [events, setEvents] = useState<AgentRunEvent[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [likedVibesInput, setLikedVibesInput] = useState("");
  const [dislikedPlacesInput, setDislikedPlacesInput] = useState("");
  const [preferredMobility, setPreferredMobility] = useState<MobilityLevel | "">("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setRunId(null);
    setResult(null);
    setEvents([]);
    setFeedbackMessage(null);
    setFeedbackError(null);

    try {
      const createResponse = await fetch("/api/agent/runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input, userId }),
      });

      if (!createResponse.ok) {
        throw new Error(`请求失败：${createResponse.status}`);
      }

      const created = (await createResponse.json()) as { runId: string };
      setRunId(created.runId);

      const source = new EventSource(`/api/agent/runs/${created.runId}/events`);
      source.addEventListener("run_started", (message) => {
        const parsed = JSON.parse((message as MessageEvent).data) as AgentRunEvent;
        setEvents((prev) => [...prev, parsed]);
      });
      source.addEventListener("stage_started", (message) => {
        const parsed = JSON.parse((message as MessageEvent).data) as AgentRunEvent;
        setEvents((prev) => [...prev, parsed]);
      });
      source.addEventListener("thought_generated", (message) => {
        const parsed = JSON.parse((message as MessageEvent).data) as AgentRunEvent;
        setEvents((prev) => [...prev, parsed]);
      });
      source.addEventListener("tool_called", (message) => {
        const parsed = JSON.parse((message as MessageEvent).data) as AgentRunEvent;
        setEvents((prev) => [...prev, parsed]);
      });
      source.addEventListener("tool_result", (message) => {
        const parsed = JSON.parse((message as MessageEvent).data) as AgentRunEvent;
        setEvents((prev) => [...prev, parsed]);
      });
      source.addEventListener("replan_requested", (message) => {
        const parsed = JSON.parse((message as MessageEvent).data) as AgentRunEvent;
        setEvents((prev) => [...prev, parsed]);
      });
      source.addEventListener("replan_applied", (message) => {
        const parsed = JSON.parse((message as MessageEvent).data) as AgentRunEvent;
        setEvents((prev) => [...prev, parsed]);
      });
      source.addEventListener("run_completed", (message) => {
        const parsed = JSON.parse((message as MessageEvent).data) as Extract<AgentRunEvent, { type: "run_completed" }>;
        setEvents((prev) => [...prev, parsed]);
        setResult(parsed.result);
        setLoading(false);
        source.close();
      });
      source.addEventListener("run_failed", (message) => {
        const parsed = JSON.parse((message as MessageEvent).data) as Extract<AgentRunEvent, { type: "run_failed" }>;
        setEvents((prev) => [...prev, parsed]);
        setError(parsed.message);
        setLoading(false);
        source.close();
      });
      source.onerror = () => {
        source.close();
      };
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "未知错误";
      setError(message);
      setLoading(false);
    }
  }

  async function handleFeedbackSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedbackLoading(true);
    setFeedbackMessage(null);
    setFeedbackError(null);

    try {
      const likedVibes = likedVibesInput
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const dislikedPlaces = dislikedPlacesInput
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const response = await fetch("/api/agent/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          likedVibes,
          dislikedPlaces,
          preferredMobility: preferredMobility || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`反馈提交失败：${response.status}`);
      }

      setFeedbackMessage("反馈已写入用户记忆。下一次运行会自动读取这些偏好。");
    } catch (feedbackSubmitError) {
      const message = feedbackSubmitError instanceof Error ? feedbackSubmitError.message : "反馈提交失败";
      setFeedbackError(message);
    } finally {
      setFeedbackLoading(false);
    }
  }

  return (
    <div className="mbo-route-force-light mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">City Agent Runtime</h2>
        <p className="mt-2 text-sm text-slate-600">
          当前页面只消费统一的 run / event 协议，展示阶段流转、工具执行、自我修正与评测预埋结果。
        </p>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <label htmlFor="user-id" className="text-sm font-medium text-slate-700">
            用户 ID
          </label>
          <input
            id="user-id"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />
          <label htmlFor="trip-input" className="text-sm font-medium text-slate-700">
            用户需求输入
          </label>
          <textarea
            id="trip-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="min-h-24 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "运行中..." : "启动 Agent Run"}
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              onClick={() => {
                setInput(DEFAULT_INPUT);
              }}
            >
              恢复示例输入
            </button>
          </div>
        </form>

        {runId ? <p className="mt-3 text-xs text-slate-500">runId: {runId}</p> : null}
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </section>

      {loading || events.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">运行事件流</h3>
          <div className="mt-3 max-h-72 space-y-2 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
            {events.length > 0 ? (
              events.map((item, index) => (
                <p key={`${item.type}-${index}`} className="text-sm text-slate-700">
                  {describeEvent(item)}
                </p>
              ))
            ) : (
              <p className="text-sm text-slate-500">等待事件...</p>
            )}
          </div>
        </section>
      ) : null}

      {result ? (
        <>
          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">澄清意图</h3>
              <div className="mt-3 space-y-1 text-sm text-slate-700">
                <p>城市：{result.clarifiedIntent.city}</p>
                <p>时段：{result.clarifiedIntent.timeframe}</p>
                <p>偏好：{result.clarifiedIntent.vibes.join(" / ")}</p>
                <p>体力模式：{result.clarifiedIntent.mobility}</p>
                <p>预算：{result.clarifiedIntent.budget}</p>
              </div>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">记忆上下文</h3>
              <div className="mt-3 space-y-1 text-sm text-slate-700">
                <p>高权重偏好：{result.memoryApplied.topVibes.length > 0 ? result.memoryApplied.topVibes.join(" / ") : "无"}</p>
                <p>负反馈地点：{result.memoryApplied.dislikedPlaces.length > 0 ? result.memoryApplied.dislikedPlaces.join(" / ") : "无"}</p>
                <p>偏好体力：{result.memoryApplied.preferredMobility ?? "无"}</p>
              </div>
            </article>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">最终答复</h3>
            <p className="mt-3 text-sm leading-7 text-slate-700">{result.finalAnswer}</p>
            <p className="mt-3 text-sm text-slate-600">{result.traceSummary}</p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">最终计划</h3>
            <div className="mt-4 space-y-3">
              {result.finalPlan.map((step) => (
                <article key={step.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {step.time} · {step.place}
                    </p>
                    <p className="text-xs text-slate-600">
                      {step.mode} · {step.durationMinutes} 分钟 · {step.indoor ? "室内" : "室外"}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">动作：{step.action}</p>
                  <p className="mt-1 text-sm text-slate-600">原因：{step.reason}</p>
                  <p className="mt-1 text-xs text-slate-500">tools: {(step.requiresTools ?? []).join(" / ") || "none"}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">工具调用记录</h3>
              <div className="mt-3 space-y-2">
                {result.toolCalls.map((item) => (
                  <p key={item.toolCallId} className="text-sm text-slate-700">
                    {item.toolName} · {item.success ? "success" : "failed"} · {item.durationMs}ms
                  </p>
                ))}
              </div>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">自我修正</h3>
              <div className="mt-3 space-y-2">
                {result.replans.length > 0 ? (
                  result.replans.map((item) => (
                    <p key={`${item.stepId}-${item.reason}`} className="text-sm text-slate-700">
                      {item.stepId} · {item.note}
                      {item.oldPlace && item.newPlace ? ` · ${item.oldPlace} -> ${item.newPlace}` : ""}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-slate-600">本次未触发重规划。</p>
                )}
              </div>
            </article>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">评测预埋结果</h3>
            <div className="mt-3 space-y-1 text-sm text-slate-700">
              <p>completionStatus：{result.evaluationArtifacts.completionStatus}</p>
              <p>toolSuccessRate：{result.evaluationArtifacts.toolSuccessRate.toFixed(2)}</p>
              <p>latencyMs：{result.evaluationArtifacts.latencyMs}</p>
              <p>replanCount：{result.evaluationArtifacts.replanCount}</p>
            </div>
            <pre className="mt-3 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-700">
              {result.evaluationArtifacts.judgeReadyTranscript}
            </pre>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">写入反馈</h3>
            <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={handleFeedbackSubmit}>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                喜欢的 vibe（逗号分隔）
                <input
                  value={likedVibesInput}
                  onChange={(event) => setLikedVibesInput(event.target.value)}
                  placeholder="art,architecture"
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                不喜欢地点（逗号分隔）
                <input
                  value={dislikedPlacesInput}
                  onChange={(event) => setDislikedPlacesInput(event.target.value)}
                  placeholder="武康路街区"
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
                偏好体力模式
                <select
                  value={preferredMobility}
                  onChange={(event) => setPreferredMobility(event.target.value as MobilityLevel | "")}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                >
                  <option value="">不设置</option>
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
              </label>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={feedbackLoading}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {feedbackLoading ? "写入中..." : "写入反馈到记忆"}
                </button>
                {feedbackMessage ? <p className="mt-2 text-sm text-emerald-700">{feedbackMessage}</p> : null}
                {feedbackError ? <p className="mt-2 text-sm text-rose-600">{feedbackError}</p> : null}
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">动态地图标注</h3>
            {result.mapPoints.length > 0 ? (
              <AmapDynamicMap points={result.mapPoints} />
            ) : (
              <p className="mt-3 text-sm text-slate-600">本次未获取到可用于地图标注的经纬度。</p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">静态地图标注</h3>
            {result.mapPoints.length > 0 ? (
              <>
                <Image
                  className="mt-3 w-full rounded-xl border border-slate-200"
                  alt="final map markers"
                  src={`/api/map/static?points=${encodeURIComponent(
                    result.mapPoints.map((point) => `${point.order},${point.longitude},${point.latitude}`).join(";"),
                  )}`}
                  width={960}
                  height={520}
                  unoptimized
                />
                <div className="mt-3 space-y-1 text-sm text-slate-700">
                  {result.mapPoints.map((point) => (
                    <p key={`map-point-${point.stepId}`}>
                      {point.order}. {point.place} ({point.longitude.toFixed(6)}, {point.latitude.toFixed(6)}) ·{" "}
                      {point.provider ?? "unknown"}
                    </p>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-600">本次未获取到可用于地图标注的经纬度。</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
