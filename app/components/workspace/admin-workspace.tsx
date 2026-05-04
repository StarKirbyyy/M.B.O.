"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import AdminPanel from "@/app/components/admin-panel";
import { useAuth } from "@/app/components/auth-provider";

type WorkspaceMode = "page" | "embedded";

interface AdminWorkspaceProps {
  mode?: WorkspaceMode;
}

function AdminWorkspaceHeader({ authError, accountLine }: { authError: string | null; accountLine: string }) {
  return (
    <section className="mbo-hero mbo-panel mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mbo-kicker">Administrative Control</p>
      <h1 className="text-2xl font-semibold text-slate-900">管理台</h1>
      <p className="mt-2 text-sm text-slate-600">{accountLine}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="mbo-chip">
          <span className="mbo-chip-dot" />
          USER OPS
        </span>
        <span className="mbo-chip">DB HEALTH</span>
        <span className="mbo-chip">ROLE CONTROL</span>
      </div>
      {authError ? <p className="mt-2 text-sm text-rose-600">{authError}</p> : null}
    </section>
  );
}

export default function AdminWorkspace({ mode = "page" }: AdminWorkspaceProps) {
  const router = useRouter();
  const { authToken, currentUser, booting, authError } = useAuth();

  useEffect(() => {
    if (mode !== "page") {
      return;
    }
    if (!booting && !authToken) {
      router.replace("/auth/login?next=/admin");
    }
    if (!booting && authToken && currentUser?.role !== "admin") {
      router.replace("/planner");
    }
  }, [mode, booting, authToken, currentUser?.role, router]);

  const accountLine = `当前账号：${currentUser ? `${currentUser.username} (${currentUser.role})` : "unknown"}。仅 admin 账号可成功调用管理接口。`;
  const ContainerTag = mode === "page" ? "main" : "section";
  const containerClassName =
    mode === "page" ? "mx-auto w-full max-w-6xl px-4 py-6 md:px-8" : "mx-auto w-full max-w-6xl px-0 py-0";

  if (booting) {
    return <ContainerTag className={containerClassName}>初始化中...</ContainerTag>;
  }

  if (!authToken) {
    if (mode === "embedded") {
      return (
        <ContainerTag className={containerClassName}>
          <AdminWorkspaceHeader authError={authError} accountLine={accountLine} />
          <section className="mbo-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-600">登录管理员账号后可在主页直接使用管理台能力。</p>
            <button
              type="button"
              onClick={() => router.push("/auth/login?next=/admin")}
              className="mbo-btn-cta mt-3 rounded-lg border border-sky-300 bg-sky-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white"
            >
              管理员登录
            </button>
          </section>
        </ContainerTag>
      );
    }

    return <ContainerTag className={containerClassName}>跳转到登录页...</ContainerTag>;
  }

  if (currentUser?.role !== "admin") {
    if (mode === "embedded") {
      return (
        <ContainerTag className={containerClassName}>
          <AdminWorkspaceHeader authError={authError} accountLine={accountLine} />
          <section className="mbo-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-600">当前账号不是管理员，无法使用管理台模块。</p>
          </section>
        </ContainerTag>
      );
    }

    return <ContainerTag className={containerClassName}>仅管理员可访问管理台。</ContainerTag>;
  }

  return (
    <ContainerTag className={containerClassName}>
      <AdminWorkspaceHeader authError={authError} accountLine={accountLine} />
      <AdminPanel
        authToken={authToken}
        onRequireAuth={() => {
          router.push("/auth/login?next=/admin");
        }}
      />
    </ContainerTag>
  );
}
