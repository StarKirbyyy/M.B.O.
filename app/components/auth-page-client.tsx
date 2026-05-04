"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import AuthPanel from "@/app/components/auth-panel";
import { useAuth } from "@/app/components/auth-provider";

interface AuthPageClientProps {
  mode: "login" | "register";
  nextPath: string;
  layoutMode?: "standalone" | "embedded";
}

export default function AuthPageClient({ mode, nextPath, layoutMode = "standalone" }: AuthPageClientProps) {
  const router = useRouter();
  const { authToken, currentUser, booting, authError, applyAuth, logout, refreshMe } = useAuth();
  const isEmbedded = layoutMode === "embedded";
  const ContainerTag = isEmbedded ? "section" : "main";
  const containerClassName = isEmbedded
    ? "mx-auto w-full max-w-6xl px-0 py-0"
    : "mx-auto w-full max-w-6xl px-4 py-6 md:px-8";

  if (booting) {
    return <ContainerTag className={containerClassName}>初始化中...</ContainerTag>;
  }

  return (
    <ContainerTag className={containerClassName}>
      <section className="mbo-hero mbo-panel mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mbo-kicker">Authentication</p>
        <h1 className="text-2xl font-semibold text-slate-900">{mode === "login" ? "登录" : "注册"}</h1>
        <p className="mt-2 text-sm text-slate-600">登录成功后将跳转到：{nextPath}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="mbo-chip">
            <span className="mbo-chip-dot" />
            session gateway
          </span>
          <span className="mbo-chip">role projection</span>
          <span className="mbo-chip">secure route</span>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          {mode === "login" ? (
            <>
              没有账号？{" "}
              <Link className="mbo-link-inline" href={`/auth/register?next=${encodeURIComponent(nextPath)}`}>
                去注册
              </Link>
            </>
          ) : (
            <>
              已有账号？{" "}
              <Link className="mbo-link-inline" href={`/auth/login?next=${encodeURIComponent(nextPath)}`}>
                去登录
              </Link>
            </>
          )}
        </p>
        {authError ? <p className="mt-2 text-sm text-rose-600">{authError}</p> : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <AuthPanel
          authToken={authToken}
          currentUser={currentUser}
          mode={mode}
          onAuthSuccess={(token, user) => {
            applyAuth(token, user);
            router.push(nextPath);
          }}
          onLogout={logout}
          onRefreshMe={refreshMe}
        />

        <aside className="mbo-hero mbo-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mbo-kicker">System Link</p>
          <h2 className="mt-3 text-lg font-semibold text-slate-900">M.B.O. SECURE NODE</h2>
          <p className="mt-2 text-sm text-slate-600">
            访问受控接口前，请完成身份认证。系统将根据角色自动开放对应控制台。
          </p>
          <div className="mbo-divider mt-4" />
          <div className="mt-4 space-y-2 text-xs text-slate-500">
            <p>[AUTH] token scope mapping enabled</p>
            <p>[NAV] role-driven route projection enabled</p>
            <p>[TRACE] next redirect path: {nextPath}</p>
          </div>
        </aside>
      </section>
    </ContainerTag>
  );
}
