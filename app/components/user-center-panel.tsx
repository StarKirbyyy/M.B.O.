"use client";

import { useCallback, useEffect, useState } from "react";

interface UserCenterPanelProps {
  authToken: string | null;
  onRequireAuth?: () => void;
}

interface UserProfile {
  userId: string;
  nickname: string | null;
  language: string;
  defaultCity: string | null;
  budgetPreference: "low" | "medium" | "high" | "unknown";
  preferredMobility: "low" | "medium" | "high" | null;
  createdAt: string;
  updatedAt: string;
}

interface PlanHistory {
  id: string;
  inputText: string;
  plannerSource: "siliconflow" | "rule";
  summary: string;
  createdAt: string;
  result: unknown;
}

interface UserFeedbackRecord {
  id: string;
  likedVibes: string[];
  dislikedVibes: string[];
  dislikedPlaces: string[];
  preferredMobility: "low" | "medium" | "high" | null;
  createdAt: string;
}

interface UserSession {
  id: string;
  createdAt: string;
  expiresAt: string;
  userAgent: string | null;
  ipAddress: string | null;
}

interface JsonResponse {
  error?: string;
  profile?: UserProfile | null;
  plans?: PlanHistory[];
  feedback?: UserFeedbackRecord[];
  sessions?: UserSession[];
  ok?: boolean;
}

async function readJsonSafe(response: Response): Promise<JsonResponse> {
  try {
    return (await response.json()) as JsonResponse;
  } catch {
    return {};
  }
}

function buildAuthHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export default function UserCenterPanel({ authToken, onRequireAuth }: UserCenterPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plans, setPlans] = useState<PlanHistory[]>([]);
  const [feedback, setFeedback] = useState<UserFeedbackRecord[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);

  const [nickname, setNickname] = useState("");
  const [language, setLanguage] = useState("zh-CN");
  const [defaultCity, setDefaultCity] = useState("");
  const [budgetPreference, setBudgetPreference] = useState<UserProfile["budgetPreference"]>("unknown");
  const [preferredMobility, setPreferredMobility] = useState<UserProfile["preferredMobility"]>(null);

  const loadAll = useCallback(async () => {
    if (!authToken) {
      setProfile(null);
      setPlans([]);
      setFeedback([]);
      setSessions([]);
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const headers = buildAuthHeaders(authToken);
      const [profileResp, plansResp, feedbackResp, sessionsResp] = await Promise.all([
        fetch("/api/user/profile", { headers }),
        fetch("/api/user/plans?limit=20&offset=0", { headers }),
        fetch("/api/user/feedback?limit=20&offset=0", { headers }),
        fetch("/api/user/sessions", { headers }),
      ]);

      if ([profileResp, plansResp, feedbackResp, sessionsResp].some((item) => item.status === 401)) {
        onRequireAuth?.();
        throw new Error("登录已过期，请重新登录。");
      }

      const [profileData, plansData, feedbackData, sessionsData] = await Promise.all([
        readJsonSafe(profileResp),
        readJsonSafe(plansResp),
        readJsonSafe(feedbackResp),
        readJsonSafe(sessionsResp),
      ]);

      if (!profileResp.ok) {
        throw new Error(profileData.error ?? "读取用户资料失败");
      }
      if (!plansResp.ok) {
        throw new Error(plansData.error ?? "读取历史计划失败");
      }
      if (!feedbackResp.ok) {
        throw new Error(feedbackData.error ?? "读取反馈记录失败");
      }
      if (!sessionsResp.ok) {
        throw new Error(sessionsData.error ?? "读取会话记录失败");
      }

      const nextProfile = profileData.profile ?? null;
      setProfile(nextProfile);
      setPlans(plansData.plans ?? []);
      setFeedback(feedbackData.feedback ?? []);
      setSessions(sessionsData.sessions ?? []);

      if (nextProfile) {
        setNickname(nextProfile.nickname ?? "");
        setLanguage(nextProfile.language ?? "zh-CN");
        setDefaultCity(nextProfile.defaultCity ?? "");
        setBudgetPreference(nextProfile.budgetPreference ?? "unknown");
        setPreferredMobility(nextProfile.preferredMobility ?? null);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "读取用户中心数据失败");
    } finally {
      setLoading(false);
    }
  }, [authToken, onRequireAuth]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAll();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadAll]);

  async function handleUpdateProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) {
      onRequireAuth?.();
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: buildAuthHeaders(authToken),
        body: JSON.stringify({
          nickname: nickname || null,
          language,
          defaultCity: defaultCity || null,
          budgetPreference,
          preferredMobility,
        }),
      });
      const data = await readJsonSafe(response);
      if (response.status === 401) {
        onRequireAuth?.();
      }
      if (!response.ok || !data.profile) {
        throw new Error(data.error ?? `更新失败：${response.status}`);
      }
      setProfile(data.profile);
      setMessage("资料更新成功。");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "更新资料失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePlan(planId: string) {
    if (!authToken) {
      onRequireAuth?.();
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/user/plans/${encodeURIComponent(planId)}`, {
        method: "DELETE",
        headers: buildAuthHeaders(authToken),
      });
      const data = await readJsonSafe(response);
      if (!response.ok) {
        throw new Error(data.error ?? `删除失败：${response.status}`);
      }
      setPlans((prev) => prev.filter((item) => item.id !== planId));
      setMessage("历史记录已删除。");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除历史记录失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleClearData() {
    if (!authToken) {
      onRequireAuth?.();
      return;
    }
    const confirmed = window.confirm("确认清空当前账号的反馈、历史记录与会话数据吗？");
    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/user/data", {
        method: "DELETE",
        headers: buildAuthHeaders(authToken),
      });
      const data = await readJsonSafe(response);
      if (!response.ok) {
        throw new Error(data.error ?? `清空失败：${response.status}`);
      }
      setPlans([]);
      setFeedback([]);
      setSessions([]);
      setMessage("个人数据已清空。");
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : "清空数据失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mbo-hero mbo-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">用户中心</h2>
      <p className="mt-2 text-sm text-slate-600">支持资料管理、历史计划、反馈记录、会话查看与一键清空数据。</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="mbo-chip">
          <span className="mbo-chip-dot" />
          profile sync
        </span>
        <span className="mbo-chip">history index</span>
        <span className="mbo-chip">session ledger</span>
      </div>

      {!authToken ? (
        <p className="mbo-panel mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          请先登录后使用用户中心功能。
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            void loadAll();
          }}
          disabled={!authToken || loading}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
        >
          {loading ? "加载中..." : "刷新用户中心"}
        </button>
        <button
          type="button"
          onClick={() => {
            void handleClearData();
          }}
          disabled={!authToken || loading}
          className="rounded-lg border border-rose-300 px-3 py-2 text-sm text-rose-700 disabled:opacity-60"
        >
          清空个人数据
        </button>
      </div>

      <form onSubmit={handleUpdateProfile} className="mbo-panel mt-4 grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-2">
        <h3 className="md:col-span-2 text-sm font-semibold text-slate-900">资料编辑</h3>
        <label className="text-sm text-slate-700">
          昵称
          <input
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm text-slate-700">
          默认城市
          <input
            value={defaultCity}
            onChange={(event) => setDefaultCity(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm text-slate-700">
          语言偏好
          <input
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm text-slate-700">
          预算偏好
          <select
            value={budgetPreference}
            onChange={(event) => setBudgetPreference(event.target.value as UserProfile["budgetPreference"])}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="unknown">unknown</option>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </label>
        <label className="text-sm text-slate-700 md:col-span-2">
          体力偏好
          <select
            value={preferredMobility ?? ""}
            onChange={(event) =>
              setPreferredMobility((event.target.value || null) as UserProfile["preferredMobility"])
            }
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">不设置</option>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={!authToken || loading}
          className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 md:col-span-2"
        >
          保存资料
        </button>
      </form>

      <section className="mbo-panel mt-4 rounded-xl border border-slate-200 p-3">
        <h3 className="text-sm font-semibold text-slate-900">历史计划（{plans.length}）</h3>
        <div className="mt-2 space-y-2">
          {plans.map((plan) => (
            <article key={plan.id} className="mbo-panel rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm">
              <p className="font-medium text-slate-800">{plan.summary}</p>
              <p className="text-slate-600">
                {plan.plannerSource} · {new Date(plan.createdAt).toLocaleString()}
              </p>
              <p className="text-slate-600">输入：{plan.inputText}</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void handleDeletePlan(plan.id);
                  }}
                  disabled={loading}
                  className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700 disabled:opacity-60"
                >
                  删除
                </button>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-slate-600">查看原始结果 JSON</summary>
                <pre className="mbo-terminal mt-1 max-h-56 overflow-auto rounded bg-slate-900 p-2 text-xs text-slate-100">
                  {JSON.stringify(plan.result, null, 2)}
                </pre>
              </details>
            </article>
          ))}
          {plans.length === 0 ? <p className="text-sm text-slate-500">暂无历史计划。</p> : null}
        </div>
      </section>

      <section className="mbo-panel mt-4 rounded-xl border border-slate-200 p-3">
        <h3 className="text-sm font-semibold text-slate-900">反馈记录（{feedback.length}）</h3>
        <div className="mt-2 space-y-2">
          {feedback.map((item) => (
            <article key={item.id} className="mbo-panel rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm">
              <p className="text-slate-800">liked: {item.likedVibes.join(", ") || "-"}</p>
              <p className="text-slate-800">disliked vibes: {item.dislikedVibes.join(", ") || "-"}</p>
              <p className="text-slate-800">disliked places: {item.dislikedPlaces.join(", ") || "-"}</p>
              <p className="text-slate-600">
                preferred mobility: {item.preferredMobility ?? "null"} ·{" "}
                {new Date(item.createdAt).toLocaleString()}
              </p>
            </article>
          ))}
          {feedback.length === 0 ? <p className="text-sm text-slate-500">暂无反馈记录。</p> : null}
        </div>
      </section>

      <section className="mbo-panel mt-4 rounded-xl border border-slate-200 p-3">
        <h3 className="text-sm font-semibold text-slate-900">会话记录（{sessions.length}）</h3>
        <div className="mt-2 space-y-2">
          {sessions.map((item) => (
            <article key={item.id} className="mbo-panel rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm">
              <p className="text-slate-800">created: {new Date(item.createdAt).toLocaleString()}</p>
              <p className="text-slate-800">expires: {new Date(item.expiresAt).toLocaleString()}</p>
              <p className="text-slate-600">UA: {item.userAgent ?? "-"}</p>
              <p className="text-slate-600">IP: {item.ipAddress ?? "-"}</p>
            </article>
          ))}
          {sessions.length === 0 ? <p className="text-sm text-slate-500">暂无会话记录。</p> : null}
        </div>
      </section>

      {profile ? (
        <p className="mt-3 text-xs text-slate-500">
          用户ID：{profile.userId} · 更新于 {new Date(profile.updatedAt).toLocaleString()}
        </p>
      ) : null}
      {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
    </section>
  );
}
