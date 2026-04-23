"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import AmapDynamicMap from "@/app/components/amap-dynamic-map";
import type { MobilityLevel, PlanResult } from "@/lib/agent/types";

const DEFAULT_INPUT = "我想在上海度过一个有艺术感的下午，但不想太累";

interface Week1DemoProps {
  authToken?: string | null;
  currentUserId?: string | null;
  onRequireAuth?: () => void;
}

export default function Week1Demo({ authToken = null, currentUserId = null, onRequireAuth }: Week1DemoProps) {
  const [userId, setUserId] = useState(currentUserId ?? "demo-user");
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [progressLogs, setProgressLogs] = useState<string[]>([]);
  const [modelOutputPreview, setModelOutputPreview] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [likedVibesInput, setLikedVibesInput] = useState("");
  const [dislikedPlacesInput, setDislikedPlacesInput] = useState("");
  const [preferredMobility, setPreferredMobility] = useState<MobilityLevel | "">("");

  useEffect(() => {
    if (currentUserId) {
      setUserId(currentUserId);
    }
  }, [currentUserId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setProgressLogs([]);
    setModelOutputPreview("");
    setResult(null);
    setFeedbackMessage(null);
    setFeedbackError(null);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const response = await fetch("/api/agent/plan/stream", {
        method: "POST",
        headers,
        body: JSON.stringify({ input, userId }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          onRequireAuth?.();
        }
        const message = `请求失败：${response.status}`;
        throw new Error(message);
      }

      if (!response.body) {
        throw new Error("流式响应为空");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const appendLog = (text: string) => {
        setProgressLogs((prev) => [...prev, text]);
      };

      const handleSseBlock = (block: string) => {
        if (!block.trim()) {
          return;
        }

        const lines = block.split("\n");
        let eventType = "message";
        const dataLines: string[] = [];

        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventType = line.slice("event:".length).trim();
            continue;
          }
          if (line.startsWith("data:")) {
            dataLines.push(line.slice("data:".length).trimStart());
          }
        }

        if (dataLines.length === 0) {
          return;
        }

        const payloadText = dataLines.join("\n");

        let parsed: unknown = null;
        try {
          parsed = JSON.parse(payloadText);
        } catch {
          return;
        }

        if (eventType === "stage" && parsed && typeof parsed === "object") {
          const stage = "stage" in parsed ? String(parsed.stage) : "UNKNOWN";
          const detail = "detail" in parsed ? String(parsed.detail) : "";
          appendLog(`${stage} · ${detail}`);
          return;
        }

        if (eventType === "model_chunk" && parsed && typeof parsed === "object") {
          const chunk = "chunk" in parsed ? String(parsed.chunk) : "";
          if (chunk) {
            setModelOutputPreview((prev) => prev + chunk);
          }
          return;
        }

        if (eventType === "final" && parsed && typeof parsed === "object" && "result" in parsed) {
          setResult((parsed as { result: PlanResult }).result);
          appendLog("DONE · 收到最终结果。");
          return;
        }

        if (eventType === "error" && parsed && typeof parsed === "object" && "message" in parsed) {
          const message = String((parsed as { message: unknown }).message);
          setError(message);
          appendLog(`ERROR · ${message}`);
          return;
        }

        if (eventType === "heartbeat" && parsed && typeof parsed === "object" && "detail" in parsed) {
          const detail = String((parsed as { detail: unknown }).detail);
          appendLog(`HEARTBEAT · ${detail}`);
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";

        for (const block of blocks) {
          handleSseBlock(block);
        }
      }

      if (buffer.trim()) {
        handleSseBlock(buffer);
      }
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "未知错误";
      setError(message);
      setResult(null);
    } finally {
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

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const response = await fetch("/api/agent/feedback", {
        method: "POST",
        headers,
        body: JSON.stringify({
          userId,
          likedVibes,
          dislikedPlaces,
          preferredMobility: preferredMobility || undefined,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          onRequireAuth?.();
        }
        throw new Error(`反馈提交失败：${response.status}`);
      }

      setFeedbackMessage("反馈已写入用户记忆。下一次生成会自动使用这些偏好。");
    } catch (feedbackSubmitError) {
      const message = feedbackSubmitError instanceof Error ? feedbackSubmitError.message : "反馈提交失败";
      setFeedbackError(message);
    } finally {
      setFeedbackLoading(false);
    }
  }

  return (
    <div className="mbo-console mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-8">
      <section className="mbo-hero mbo-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mbo-kicker">Runtime Feed</p>
        <h2 className="text-lg font-semibold text-slate-900">Week 3 Demo: 可视化 + 长期偏好记忆</h2>
        <p className="mt-2 text-sm text-slate-600">
          当前版本已打通：输入需求 - 目标澄清 - 记忆读取 - 天气与POI工具 - 异常检测与自动重规划 - 反馈写回记忆。
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="mbo-chip">
            <span className="mbo-chip-dot" />
            stage stream
          </span>
          <span className="mbo-chip">memory writeback</span>
          <span className="mbo-chip">map telemetry</span>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <label htmlFor="user-id" className="text-sm font-medium text-slate-700">
            用户ID（用于长期记忆）
          </label>
          <input
            id="user-id"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            disabled={Boolean(currentUserId)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />
          {currentUserId ? (
            <p className="text-xs text-slate-500">当前已登录，userId 将自动使用当前账号。</p>
          ) : null}
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
              {loading ? "生成中..." : "生成并校正行程"}
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

        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </section>

      {loading || progressLogs.length > 0 || modelOutputPreview ? (
        <section className="mbo-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">实时推理过程（结构化）</h3>
          <div className="mbo-terminal mt-3 max-h-56 space-y-2 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
            {progressLogs.length > 0 ? (
              progressLogs.map((log, index) => (
                <p key={`progress-${index}`} className="text-sm text-slate-700">
                  {log}
                </p>
              ))
            ) : (
              <p className="text-sm text-slate-500">等待阶段事件...</p>
            )}
          </div>
          <h4 className="mt-4 text-sm font-semibold text-slate-900">模型输出流（原始片段）</h4>
          <pre className="mbo-terminal mt-2 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-700">
            {modelOutputPreview || "等待模型输出..."}
          </pre>
        </section>
      ) : null}

      {result ? (
        <>
          <section className="grid gap-4 md:grid-cols-2">
            <article className="mbo-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">目标澄清结果</h3>
              <div className="mt-3 space-y-1 text-sm text-slate-700">
                <p>城市：{result.clarified.city}</p>
                <p>时段：{result.clarified.timeframe}</p>
                <p>偏好：{result.clarified.vibes.join(" / ")}</p>
                <p>体力模式：{result.clarified.mobility}</p>
                <p>预算：{result.clarified.budget}</p>
                <p>
                  缺失信息：
                  {result.clarified.missing.length > 0 ? result.clarified.missing.join(" / ") : "无"}
                </p>
              </div>
            </article>

            <article className="mbo-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">环境感知（Weather Tool）</h3>
              <div className="mt-3 space-y-1 text-sm text-slate-700">
                <p>天气：{result.weather.condition}</p>
                <p>温度：{result.weather.temperatureC}°C</p>
                <p>来源：{result.weather.source ?? "unknown"}</p>
                <p>建议：{result.weather.advice}</p>
              </div>
            </article>
          </section>

          <section className="mbo-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">用户长期记忆快照</h3>
            <div className="mt-3 space-y-1 text-sm text-slate-700">
              <p>userId：{result.userId}</p>
              <p>高权重偏好：{result.memory.topVibes.length > 0 ? result.memory.topVibes.join(" / ") : "无"}</p>
              <p>偏好体力模式：{result.memory.preferredMobility ?? "无"}</p>
              <p>
                不喜欢地点：
                {result.memory.dislikedPlaces.length > 0 ? result.memory.dislikedPlaces.join(" / ") : "无"}
              </p>
            </div>
          </section>

          <section className="mbo-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">重规划后计划（最终）</h3>
            <p className="mt-2 text-sm text-slate-600">{result.summary}</p>
            <p className="mt-1 text-sm text-slate-600">初始规划来源：{result.plannerSource}</p>
            <div className="mt-4 space-y-3">
              {result.plan.map((step) => (
                <article key={step.id} className="mbo-panel rounded-xl border border-slate-200 bg-slate-50 p-3">
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
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <article className="mbo-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">初始计划快照</h3>
              <div className="mt-3 space-y-2">
                {result.initialPlan.map((step) => (
                  <p key={`initial-${step.id}`} className="text-sm text-slate-700">
                    {step.id} · {step.time} · {step.place}
                  </p>
                ))}
              </div>
            </article>

            <article className="mbo-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">自我修正记录</h3>
              <div className="mt-3 space-y-2">
                {result.corrections.length > 0 ? (
                  result.corrections.map((item) => (
                    <p key={`correction-${item.stepId}`} className="text-sm text-slate-700">
                      {item.stepId}: 策略 {item.strategyId} · 动作 {item.action}
                      {item.oldPlace && item.newPlace ? ` · ${item.oldPlace} -> ${item.newPlace}` : ""}
                      {typeof item.oldDurationMinutes === "number" && typeof item.newDurationMinutes === "number"
                        ? ` · ${item.oldDurationMinutes}min -> ${item.newDurationMinutes}min`
                        : ""}
                      {`（${item.reason}）`}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-slate-600">本次未触发重规划。</p>
                )}
              </div>
            </article>
          </section>

          <section className="mbo-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">POI 工具检查结果</h3>
            <div className="mt-3 space-y-2">
              {result.poiChecks.map((check) => (
                <article key={`poi-${check.stepId}`} className="mbo-panel rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <p className="font-medium text-slate-800">
                    {check.stepId} · {check.place} · {check.available ? "可用" : "不可用"}
                  </p>
                  <p className="text-slate-600">
                    reason: {check.reason} · source: {check.source} · provider: {check.provider ?? "unknown"}
                  </p>
                  {check.displayName ? <p className="text-slate-500">poi: {check.displayName}</p> : null}
                </article>
              ))}
            </div>
          </section>

          <section className="mbo-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">写入反馈（Week 3 记忆更新）</h3>
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

          <section className="mbo-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">动态地图标注（高德 JS）</h3>
            {result.mapPoints.length > 0 ? (
              <AmapDynamicMap points={result.mapPoints} />
            ) : (
              <p className="mt-3 text-sm text-slate-600">本次未获取到可用于地图标注的经纬度。</p>
            )}
          </section>

          <section className="mbo-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">最终地点地图标注（高德静态地图）</h3>
            {result.mapPoints.length > 0 ? (
              <>
                <Image
                  className="mt-3 w-full rounded-xl border border-slate-200"
                  alt="final map markers"
                  src={`/api/map/static?points=${encodeURIComponent(
                    result.mapPoints
                      .map((point) => `${point.order},${point.longitude},${point.latitude}`)
                      .join(";"),
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

          <section className="mbo-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">状态流转（含 Replan）</h3>
            <div className="mt-3 grid gap-2">
              {result.timeline.map((event, index) => (
                <article key={`${event.stage}-${index}`} className="mbo-panel rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <p className="font-medium text-slate-800">
                    {index + 1}. {event.stage}
                  </p>
                  <p className="text-slate-600">{event.detail}</p>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
