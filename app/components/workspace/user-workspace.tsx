"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/app/components/auth-provider";
import UserCenterPanel from "@/app/components/user-center-panel";

type WorkspaceMode = "page" | "embedded";

interface UserWorkspaceProps {
  mode?: WorkspaceMode;
}

function UserWorkspaceHeader({ authError }: { authError: string | null }) {
  return (
    <section className="mbo-hero mbo-panel mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mbo-kicker">User Operations</p>
      <h1 className="text-2xl font-semibold text-slate-900">用户中心</h1>
      <p className="mt-2 text-sm text-slate-600">在这里管理资料、历史、反馈和会话。</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="mbo-chip">
          <span className="mbo-chip-dot" />
          PROFILE
        </span>
        <span className="mbo-chip">HISTORY</span>
        <span className="mbo-chip">SESSION LOG</span>
      </div>
      {authError ? <p className="mt-2 text-sm text-rose-600">{authError}</p> : null}
    </section>
  );
}

export default function UserWorkspace({ mode = "page" }: UserWorkspaceProps) {
  const router = useRouter();
  const { authToken, currentUser, booting, authError } = useAuth();

  useEffect(() => {
    if (mode !== "page") {
      return;
    }
    if (!booting && !authToken) {
      router.replace("/auth/login?next=/user");
    }
    if (!booting && authToken && currentUser?.role !== "user") {
      router.replace("/planner");
    }
  }, [mode, booting, authToken, currentUser?.role, router]);

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
          <UserWorkspaceHeader authError={authError} />
          <section className="mbo-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-600">登录后可在主页直接使用用户中心能力。</p>
            <button
              type="button"
              onClick={() => router.push("/auth/login?next=/user")}
              className="mbo-btn-cta mt-3 rounded-lg border border-sky-300 bg-sky-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white"
            >
              前往登录
            </button>
          </section>
        </ContainerTag>
      );
    }

    return <ContainerTag className={containerClassName}>跳转到登录页...</ContainerTag>;
  }

  if (currentUser?.role !== "user") {
    if (mode === "embedded") {
      return (
        <ContainerTag className={containerClassName}>
          <UserWorkspaceHeader authError={authError} />
          <section className="mbo-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-600">当前账号不是普通用户，无法使用用户中心模块。</p>
          </section>
        </ContainerTag>
      );
    }

    return <ContainerTag className={containerClassName}>仅普通用户可访问用户中心。</ContainerTag>;
  }

  return (
    <ContainerTag className={containerClassName}>
      <UserWorkspaceHeader authError={authError} />
      <UserCenterPanel
        authToken={authToken}
        onRequireAuth={() => {
          router.push("/auth/login?next=/user");
        }}
      />
    </ContainerTag>
  );
}
