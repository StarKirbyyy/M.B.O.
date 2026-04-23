"use client";

import { useState } from "react";

import type { AuthUser } from "@/lib/auth/types";

interface AdminPanelProps {
  authToken: string | null;
  onRequireAuth?: () => void;
}

interface HealthResponse {
  ok?: boolean;
  now?: string;
  error?: string;
}

interface UsersResponse {
  users?: AuthUser[];
  user?: AuthUser;
  ok?: boolean;
  error?: string;
}

async function readJsonSafe<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}

function withAuthHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export default function AdminPanel({ authToken, onRequireAuth }: AdminPanelProps) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [createUsername, setCreateUsername] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<"admin" | "user">("user");

  const [targetUserId, setTargetUserId] = useState("");
  const [patchUsername, setPatchUsername] = useState("");
  const [patchEmail, setPatchEmail] = useState("");
  const [patchRole, setPatchRole] = useState<"admin" | "user">("user");
  const [patchStatus, setPatchStatus] = useState<"active" | "disabled">("active");
  const [patchPassword, setPatchPassword] = useState("");

  async function checkHealth() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/db/health");
      const data = await readJsonSafe<HealthResponse>(response);
      setHealth(data);
      if (!response.ok) {
        throw new Error(data.error ?? `健康检查失败：${response.status}`);
      }
      setMessage("数据库健康检查完成。");
    } catch (healthError) {
      setError(healthError instanceof Error ? healthError.message : "健康检查失败");
    } finally {
      setLoading(false);
    }
  }

  async function listUsers() {
    if (!authToken) {
      onRequireAuth?.();
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/users", {
        headers: withAuthHeaders(authToken),
      });
      const data = await readJsonSafe<UsersResponse>(response);
      if (response.status === 401) {
        onRequireAuth?.();
      }
      if (!response.ok) {
        throw new Error(data.error ?? `读取用户列表失败：${response.status}`);
      }
      setUsers(data.users ?? []);
      setMessage(`读取用户列表成功，共 ${data.users?.length ?? 0} 条。`);
    } catch (listError) {
      setError(listError instanceof Error ? listError.message : "读取用户列表失败");
    } finally {
      setLoading(false);
    }
  }

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken) {
      onRequireAuth?.();
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: withAuthHeaders(authToken),
        body: JSON.stringify({
          username: createUsername,
          email: createEmail,
          password: createPassword,
          role: createRole,
        }),
      });
      const data = await readJsonSafe<UsersResponse>(response);
      if (!response.ok) {
        throw new Error(data.error ?? `创建用户失败：${response.status}`);
      }
      setMessage(`创建用户成功：${data.user?.username ?? "-"}`);
      await listUsers();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "创建用户失败");
    } finally {
      setLoading(false);
    }
  }

  async function getUserById() {
    if (!authToken) {
      onRequireAuth?.();
      return;
    }
    if (!targetUserId.trim()) {
      setError("请先输入用户 ID。");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(targetUserId.trim())}`, {
        headers: withAuthHeaders(authToken),
      });
      const data = await readJsonSafe<UsersResponse>(response);
      if (!response.ok || !data.user) {
        throw new Error(data.error ?? `查询失败：${response.status}`);
      }
      setPatchUsername(data.user.username);
      setPatchEmail(data.user.email);
      setPatchRole(data.user.role);
      setPatchStatus(data.user.status);
      setPatchPassword("");
      setMessage(`已加载用户：${data.user.username}`);
    } catch (getError) {
      setError(getError instanceof Error ? getError.message : "查询用户失败");
    } finally {
      setLoading(false);
    }
  }

  async function patchUser() {
    if (!authToken) {
      onRequireAuth?.();
      return;
    }
    if (!targetUserId.trim()) {
      setError("请先输入用户 ID。");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const payload: Record<string, string> = {
        username: patchUsername,
        email: patchEmail,
        role: patchRole,
        status: patchStatus,
      };
      if (patchPassword.trim()) {
        payload.password = patchPassword.trim();
      }
      const response = await fetch(`/api/admin/users/${encodeURIComponent(targetUserId.trim())}`, {
        method: "PATCH",
        headers: withAuthHeaders(authToken),
        body: JSON.stringify(payload),
      });
      const data = await readJsonSafe<UsersResponse>(response);
      if (!response.ok) {
        throw new Error(data.error ?? `更新失败：${response.status}`);
      }
      setMessage("用户更新成功。");
      await listUsers();
    } catch (patchError) {
      setError(patchError instanceof Error ? patchError.message : "更新用户失败");
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser() {
    if (!authToken) {
      onRequireAuth?.();
      return;
    }
    if (!targetUserId.trim()) {
      setError("请先输入用户 ID。");
      return;
    }
    const confirmed = window.confirm("确认删除该用户吗？");
    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(targetUserId.trim())}`, {
        method: "DELETE",
        headers: withAuthHeaders(authToken),
      });
      const data = await readJsonSafe<UsersResponse>(response);
      if (!response.ok) {
        throw new Error(data.error ?? `删除失败：${response.status}`);
      }
      setMessage("用户删除成功。");
      await listUsers();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除用户失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mbo-hero mbo-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">管理台（需 admin）</h2>
      <p className="mt-2 text-sm text-slate-600">支持 DB 健康检查、用户列表、创建用户、按 ID 查询/更新/删除用户。</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="mbo-chip">
          <span className="mbo-chip-dot" />
          db health
        </span>
        <span className="mbo-chip">identity ops</span>
        <span className="mbo-chip">role control</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            void checkHealth();
          }}
          disabled={loading}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
        >
          DB 健康检查
        </button>
        <button
          type="button"
          onClick={() => {
            void listUsers();
          }}
          disabled={!authToken || loading}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
        >
          拉取用户列表
        </button>
      </div>

      <form onSubmit={createUser} className="mbo-panel mt-4 grid gap-2 rounded-xl border border-slate-200 p-3 md:grid-cols-2">
        <h3 className="md:col-span-2 text-sm font-semibold text-slate-900">创建用户</h3>
        <input
          value={createUsername}
          onChange={(event) => setCreateUsername(event.target.value)}
          placeholder="username"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          value={createEmail}
          onChange={(event) => setCreateEmail(event.target.value)}
          placeholder="email"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          value={createPassword}
          onChange={(event) => setCreatePassword(event.target.value)}
          placeholder="password"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          type="password"
        />
        <select
          value={createRole}
          onChange={(event) => setCreateRole(event.target.value as "admin" | "user")}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
        <button
          type="submit"
          disabled={!authToken || loading}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 md:col-span-2"
        >
          创建用户
        </button>
      </form>

      <div className="mbo-panel mt-4 rounded-xl border border-slate-200 p-3">
        <h3 className="text-sm font-semibold text-slate-900">按 ID 管理用户</h3>
        <input
          value={targetUserId}
          onChange={(event) => setTargetUserId(event.target.value)}
          placeholder="user id"
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              void getUserById();
            }}
            disabled={!authToken || loading}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
          >
            查询
          </button>
          <button
            type="button"
            onClick={() => {
              void patchUser();
            }}
            disabled={!authToken || loading}
            className="rounded-lg border border-sky-300 px-3 py-2 text-sm text-sky-700 disabled:opacity-60"
          >
            更新
          </button>
          <button
            type="button"
            onClick={() => {
              void deleteUser();
            }}
            disabled={!authToken || loading}
            className="rounded-lg border border-rose-300 px-3 py-2 text-sm text-rose-700 disabled:opacity-60"
          >
            删除
          </button>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input
            value={patchUsername}
            onChange={(event) => setPatchUsername(event.target.value)}
            placeholder="username"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={patchEmail}
            onChange={(event) => setPatchEmail(event.target.value)}
            placeholder="email"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={patchRole}
            onChange={(event) => setPatchRole(event.target.value as "admin" | "user")}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
          <select
            value={patchStatus}
            onChange={(event) => setPatchStatus(event.target.value as "active" | "disabled")}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="active">active</option>
            <option value="disabled">disabled</option>
          </select>
          <input
            value={patchPassword}
            onChange={(event) => setPatchPassword(event.target.value)}
            placeholder="new password (optional)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
            type="password"
          />
        </div>
      </div>

      <section className="mbo-panel mt-4 rounded-xl border border-slate-200 p-3">
        <h3 className="text-sm font-semibold text-slate-900">用户列表（{users.length}）</h3>
        <div className="mt-2 space-y-2">
          {users.map((user) => (
            <article key={user.id} className="mbo-panel rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm">
              <p className="font-medium text-slate-800">
                {user.username} ({user.role}) · {user.status}
              </p>
              <p className="text-slate-600">{user.email}</p>
              <p className="text-slate-500">id: {user.id}</p>
            </article>
          ))}
          {users.length === 0 ? <p className="text-sm text-slate-500">暂无数据或尚未加载。</p> : null}
        </div>
      </section>

      <section className="mbo-terminal mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
        <h3 className="font-semibold text-slate-900">DB 健康检查结果</h3>
        <pre className="mt-2 overflow-auto text-xs text-slate-700">{JSON.stringify(health, null, 2)}</pre>
      </section>

      {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
    </section>
  );
}
