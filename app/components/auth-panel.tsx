"use client";

import { useState } from "react";

import type { AuthUser } from "@/lib/auth/types";

interface AuthPanelProps {
  authToken: string | null;
  currentUser: AuthUser | null;
  mode: "login" | "register";
  onAuthSuccess: (token: string, user: AuthUser) => void;
  onLogout: () => void;
  onRefreshMe: () => Promise<void>;
}

interface AuthSuccessPayload {
  token?: string;
  user?: AuthUser;
  error?: string;
  hint?: string;
}

async function readJsonSafe(response: Response): Promise<AuthSuccessPayload> {
  try {
    return (await response.json()) as AuthSuccessPayload;
  } catch {
    return {};
  }
}

export default function AuthPanel({ authToken, currentUser, mode, onAuthSuccess, onLogout, onRefreshMe }: AuthPanelProps) {
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: loginIdentifier,
          password: loginPassword,
        }),
      });
      const data = await readJsonSafe(response);
      if (!response.ok || !data.token || !data.user) {
        throw new Error(data.error ?? `登录失败：${response.status}`);
      }
      onAuthSuccess(data.token, data.user);
      setMessage(`登录成功，当前用户：${data.user.username}`);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: registerUsername,
          email: registerEmail,
          password: registerPassword,
        }),
      });
      const data = await readJsonSafe(response);
      if (!response.ok || !data.token || !data.user) {
        throw new Error(data.error ?? data.hint ?? `注册失败：${response.status}`);
      }
      onAuthSuccess(data.token, data.user);
      setMessage(`注册成功，当前用户：${data.user.username}`);
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : "注册失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mbo-hero mbo-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">认证中心</h2>
      <p className="mt-2 text-sm text-slate-600">支持注册、登录、读取当前用户、退出登录。</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="mbo-chip">
          <span className="mbo-chip-dot" />
          token issue
        </span>
        <span className="mbo-chip">role bind</span>
        <span className="mbo-chip">session keepalive</span>
      </div>

      {mode === "login" ? (
        <div className="mt-4 max-w-xl">
          <form onSubmit={handleLogin} className="mbo-panel space-y-2 rounded-xl border border-slate-200 p-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-900">登录</h3>
            <input
              value={loginIdentifier}
              onChange={(event) => setLoginIdentifier(event.target.value)}
              placeholder="用户名或邮箱"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              placeholder="密码"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading ? "提交中..." : "登录"}
            </button>
          </form>
        </div>
      ) : (
        <div className="mt-4 max-w-xl">
          <form onSubmit={handleRegister} className="mbo-panel space-y-2 rounded-xl border border-slate-200 p-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-900">注册</h3>
            <input
              value={registerUsername}
              onChange={(event) => setRegisterUsername(event.target.value)}
              placeholder="用户名（3-32）"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={registerEmail}
              onChange={(event) => setRegisterEmail(event.target.value)}
              placeholder="邮箱"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="password"
              value={registerPassword}
              onChange={(event) => setRegisterPassword(event.target.value)}
              placeholder="密码（至少 8 位）"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading ? "提交中..." : "注册"}
            </button>
          </form>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            void onRefreshMe();
          }}
          disabled={!authToken || loading}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
        >
          刷新当前用户
        </button>
        <button
          type="button"
          onClick={onLogout}
          disabled={!authToken}
          className="rounded-lg border border-rose-300 px-3 py-2 text-sm text-rose-700 disabled:opacity-60"
        >
          退出登录
        </button>
      </div>

      <div className="mbo-terminal mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
        <p>登录状态：{authToken ? "已登录" : "未登录"}</p>
        <p>
          当前用户：
          {currentUser
            ? `${currentUser.username} (${currentUser.role}) / ${currentUser.email}`
            : "无"}
        </p>
      </div>

      {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
    </section>
  );
}
