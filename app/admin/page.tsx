"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import AdminPanel from "@/app/components/admin-panel";
import { useAuth } from "@/app/components/auth-provider";

export default function AdminPage() {
  const router = useRouter();
  const { authToken, currentUser, booting, authError } = useAuth();

  useEffect(() => {
    if (!booting && !authToken) {
      router.replace("/auth/login?next=/admin");
    }
    if (!booting && authToken && currentUser?.role !== "admin") {
      router.replace("/planner");
    }
  }, [booting, authToken, currentUser?.role, router]);

  if (booting) {
    return <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">初始化中...</main>;
  }

  if (!authToken) {
    return <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">跳转到登录页...</main>;
  }

  if (currentUser?.role !== "admin") {
    return <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">仅管理员可访问管理台。</main>;
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
      <section className="mbo-hero mbo-panel mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mbo-kicker">Administrative Control</p>
        <h1 className="text-2xl font-semibold text-slate-900">管理台</h1>
        <p className="mt-2 text-sm text-slate-600">
          当前账号：{currentUser ? `${currentUser.username} (${currentUser.role})` : "unknown"}。仅 admin 账号可成功调用管理接口。
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="mbo-chip"><span className="mbo-chip-dot" />USER OPS</span>
          <span className="mbo-chip">DB HEALTH</span>
          <span className="mbo-chip">ROLE CONTROL</span>
        </div>
        {authError ? <p className="mt-2 text-sm text-rose-600">{authError}</p> : null}
      </section>

      <AdminPanel
        authToken={authToken}
        onRequireAuth={() => {
          router.push("/auth/login?next=/admin");
        }}
      />
    </main>
  );
}
