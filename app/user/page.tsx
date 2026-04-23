"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/app/components/auth-provider";
import UserCenterPanel from "@/app/components/user-center-panel";

export default function UserPage() {
  const router = useRouter();
  const { authToken, currentUser, booting, authError } = useAuth();

  useEffect(() => {
    if (!booting && !authToken) {
      router.replace("/auth/login?next=/user");
    }
    if (!booting && authToken && currentUser?.role !== "user") {
      router.replace("/planner");
    }
  }, [booting, authToken, currentUser?.role, router]);

  if (booting) {
    return <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">初始化中...</main>;
  }

  if (!authToken) {
    return <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">跳转到登录页...</main>;
  }

  if (currentUser?.role !== "user") {
    return <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">仅普通用户可访问用户中心。</main>;
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
      <section className="mbo-hero mbo-panel mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mbo-kicker">User Operations</p>
        <h1 className="text-2xl font-semibold text-slate-900">用户中心</h1>
        <p className="mt-2 text-sm text-slate-600">在这里管理资料、历史、反馈和会话。</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="mbo-chip"><span className="mbo-chip-dot" />PROFILE</span>
          <span className="mbo-chip">HISTORY</span>
          <span className="mbo-chip">SESSION LOG</span>
        </div>
        {authError ? <p className="mt-2 text-sm text-rose-600">{authError}</p> : null}
      </section>
      <UserCenterPanel
        authToken={authToken}
        onRequireAuth={() => {
          router.push("/auth/login?next=/user");
        }}
      />
    </main>
  );
}
