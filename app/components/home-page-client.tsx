"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/app/components/auth-provider";

type NavItem = {
  key: string;
  label: string;
  icon: "home" | "route" | "memory" | "user" | "admin" | "notice";
  href: string;
  group: "home" | "planner" | "user" | "admin";
  role?: "user" | "admin";
};

type LoadingPhase = "progress" | "expand" | "reveal" | "done";

const MENU_ITEMS: NavItem[] = [
  { key: "home", label: "任务总览", icon: "home", href: "/", group: "home" },
  { key: "planner", label: "路径方案", icon: "route", href: "/planner", group: "planner" },
  { key: "memory", label: "历史归档", icon: "memory", href: "/planner", group: "planner" },
  { key: "user", label: "用户工作台", icon: "user", href: "/user", group: "user", role: "user" },
  { key: "admin", label: "管理控制台", icon: "admin", href: "/admin", group: "admin", role: "admin" },
  { key: "notice", label: "公告中心", icon: "notice", href: "/planner", group: "planner" },
];

function NavIconGlyph({ icon }: { icon: NavItem["icon"] }) {
  if (icon === "home") {
    return (
      <svg viewBox="0 0 24 24" className="mbo-home-menu-glyph" aria-hidden="true">
        <path d="M5.5 5.5l5 5m8-5-5 5m-8 8 5-5m8 5-5-5" />
        <rect x="10.4" y="10.4" width="3.2" height="3.2" rx="0.5" />
      </svg>
    );
  }
  if (icon === "route") {
    return (
      <svg viewBox="0 0 24 24" className="mbo-home-menu-glyph" aria-hidden="true">
        <circle cx="6.3" cy="7" r="2.15" />
        <circle cx="17.7" cy="7" r="2.15" />
        <circle cx="12" cy="17" r="2.15" />
        <path d="M8.2 8.4l2.8 5.8M15.8 8.4l-2.8 5.8M8.5 7h7" />
      </svg>
    );
  }
  if (icon === "memory") {
    return (
      <svg viewBox="0 0 24 24" className="mbo-home-menu-glyph" aria-hidden="true">
        <rect x="5.4" y="5.4" width="13.2" height="13.2" rx="1.4" />
        <path d="M9.8 5.4v13.2M14.2 5.4v13.2M5.4 9.8h13.2M5.4 14.2h13.2" />
      </svg>
    );
  }
  if (icon === "user") {
    return (
      <svg viewBox="0 0 24 24" className="mbo-home-menu-glyph" aria-hidden="true">
        <rect x="5.2" y="4.7" width="13.6" height="14.6" rx="1.8" />
        <circle cx="12" cy="9.1" r="2.45" />
        <path d="M8.3 16.1c1-1.5 2.2-2.2 3.7-2.2 1.5 0 2.7.7 3.7 2.2" />
      </svg>
    );
  }
  if (icon === "admin") {
    return (
      <svg viewBox="0 0 24 24" className="mbo-home-menu-glyph" aria-hidden="true">
        <path d="M12 4.4l7.2 3.2v4.9c0 3.7-2.3 6.2-7.2 9-4.9-2.8-7.2-5.3-7.2-9V7.6z" />
        <path d="M9 12h6M12 9v6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="mbo-home-menu-glyph" aria-hidden="true">
      <path d="M6 7h8.7l3.3 3.3v7h-3l-2.5 2.1H6z" />
      <path d="M9.2 11h5.6M9.2 14h3.8" />
    </svg>
  );
}

function ActionIcon({ kind, muted = false }: { kind: "user" | "payment" | "sound"; muted?: boolean }) {
  if (kind === "user") {
    return (
      <svg viewBox="0 0 24 24" className="mbo-home-action-glyph" aria-hidden="true">
        <circle cx="12" cy="8.4" r="3" />
        <path d="M6 18.1c1.4-2.7 3.5-4 6-4 2.5 0 4.6 1.3 6 4" />
      </svg>
    );
  }
  if (kind === "payment") {
    return (
      <svg viewBox="0 0 24 24" className="mbo-home-action-glyph" aria-hidden="true">
        <path d="M5.2 8.3L12 4.2l6.8 4.1v7.4L12 19.8l-6.8-4.1z" />
        <path d="M8.2 12h7.6M10.1 10.1l-1.9 1.9 1.9 1.9M13.9 10.1l1.9 1.9-1.9 1.9" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="mbo-home-action-glyph" aria-hidden="true">
      <path d="M6 10.7h3.2l4-3.2v9l-4-3.2H6z" />
      {muted ? <path d="M4.7 5.2l14.6 13.6" /> : <path d="M16 9.2c1.1.8 1.8 1.8 1.8 2.8s-.7 2-1.8 2.8" />}
    </svg>
  );
}

function LoadingScreen({ progress, phase }: { progress: number; phase: LoadingPhase }) {
  const displayProgress = Math.max(0, Math.min(100, Math.floor(progress)));
  const markerTop = `clamp(1.2rem, calc(${displayProgress}% - 1.5rem), calc(100% - 3rem))`;

  return (
    <div
      className={`mbo-loading-screen ${phase === "expand" || phase === "reveal" ? "is-expand" : ""} ${
        phase === "reveal" ? "is-reveal" : ""
      }`}
      aria-live="polite"
      aria-busy="true"
    >
      <div className="mbo-loading-grid" />
      <div className="mbo-loading-linework" />
      {phase === "progress" ? (
        <div className="mbo-loading-core">
          <p className="mbo-loading-brand">M.B.O.</p>
          <h1 className="mbo-loading-title">MOBILITY BUREAU OPERATION</h1>
          <p className="mbo-loading-slogan">OVER THE FRONTIER / INTO THE FRONT</p>
        </div>
      ) : null}
      <div className="mbo-loading-rail">
        <span className="mbo-loading-rail-fill" style={{ height: `${displayProgress}%` }} />
        <p className="mbo-loading-rail-value" style={{ top: markerTop }}>
          {displayProgress}%
        </p>
        <p className="mbo-loading-rail-caption" style={{ top: `calc(${markerTop} + 2.3rem)` }}>
          Updating...
        </p>
      </div>
    </div>
  );
}

export default function HomePageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const { authToken, currentUser } = useAuth();
  const [soundOn, setSoundOn] = useState(true);

  const [phase, setPhase] = useState<LoadingPhase>("progress");
  const [progress, setProgress] = useState(1);

  const activeKey = useMemo(() => {
    if (pathname === "/") {
      return "home";
    }
    if (pathname.startsWith("/planner")) {
      return "planner";
    }
    if (pathname.startsWith("/user")) {
      return "user";
    }
    if (pathname.startsWith("/admin")) {
      return "admin";
    }
    return "home";
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let rafId: number | undefined;
    const timeoutIds: number[] = [];

    const schedule = (fn: () => void, delayMs: number) => {
      const id = window.setTimeout(fn, delayMs);
      timeoutIds.push(id);
      return id;
    };

    const easeInOutCubic = (input: number) => {
      if (input < 0.5) {
        return 4 * input * input * input;
      }
      return 1 - Math.pow(-2 * input + 2, 3) / 2;
    };

    const runSmoothProgress = (durationMs: number, done: () => void) => {
      const start = window.performance.now();
      const from = 1;
      const to = 100;

      const tick = (now: number) => {
        const raw = Math.min((now - start) / durationMs, 1);
        const eased = easeInOutCubic(raw);
        const value = from + (to - from) * eased;
        setProgress(value);
        if (raw < 1) {
          rafId = window.requestAnimationFrame(tick);
          return;
        }
        done();
      };

      rafId = window.requestAnimationFrame(tick);
    };

    const bootstrapId = schedule(() => {
      runSmoothProgress(2400, () => {
        setProgress(100);
        setPhase("expand");
        schedule(() => setPhase("reveal"), 680);
        schedule(() => setPhase("done"), 1240);
      });
    }, 0);

    return () => {
      window.clearTimeout(bootstrapId);
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      for (const id of timeoutIds) {
        window.clearTimeout(id);
      }
    };
  }, []);

  function handleNav(item: NavItem) {
    if (item.role && (!authToken || currentUser?.role !== item.role)) {
      router.push(`/auth/login?next=${encodeURIComponent(item.href)}`);
      return;
    }
    router.push(item.href);
  }

  const showLoadingOverlay = phase !== "done";
  const homeVisible = phase === "reveal" || phase === "done";

  return (
    <>
      <main className={`mbo-home-shell ${homeVisible ? "is-visible" : ""}`}>
        <aside className="mbo-home-sidebar">
          <div className="mbo-home-logo-block">
            <p className="mbo-home-logo-mark">M.B.O.</p>
            <p className="mbo-home-logo-sub">MOBILITY BUREAU OPERATION</p>
          </div>

          <nav className="mbo-home-menu" aria-label="Home Side Navigation">
            {MENU_ITEMS.map((item) => {
              const disabledByRole = Boolean(item.role && currentUser?.role !== item.role);
              const isActive = activeKey === item.group;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleNav(item)}
                  className={`mbo-home-menu-item ${isActive ? "is-active" : ""}`}
                  title={disabledByRole ? "登录对应角色后可访问" : item.label}
                >
                  <span className={`mbo-home-menu-icon mbo-home-menu-icon-${item.key}`}>
                    <NavIconGlyph icon={item.icon} />
                  </span>
                  <span className="mbo-home-menu-label">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mbo-home-userbox">
            <button
              type="button"
              className="mbo-home-user-btn mbo-home-user-row is-user"
              onClick={() => {
                if (authToken) {
                  router.push(currentUser?.role === "admin" ? "/admin" : "/user");
                } else {
                  router.push("/auth/login?next=/planner");
                }
              }}
            >
              <span className="mbo-home-user-row-icon">
                <ActionIcon kind="user" />
              </span>
              <span className="mbo-home-user-row-label">个人工作台</span>
            </button>
            <button
              type="button"
              className="mbo-home-user-btn mbo-home-user-row is-payment"
              onClick={() => {
                router.push(currentUser?.role === "admin" ? "/admin" : "/planner");
              }}
            >
              <span className="mbo-home-user-row-icon">
                <ActionIcon kind="payment" />
              </span>
              <span className="mbo-home-user-row-label">调度服务中心</span>
            </button>
            <button
              type="button"
              className="mbo-home-user-btn mbo-home-user-row is-sound"
              onClick={() => setSoundOn((prev) => !prev)}
              aria-pressed={!soundOn}
            >
              <span className="mbo-home-user-row-icon">
                <ActionIcon kind="sound" muted={!soundOn} />
              </span>
              <span className="mbo-home-user-row-label">界面音效: {soundOn ? "开启" : "关闭"}</span>
            </button>
          </div>

          <div className="mbo-home-social-row" aria-label="Community Links">
            <span>◎</span>
            <span>◈</span>
            <span>◉</span>
            <span>⦿</span>
            <span>◌</span>
            <span>⌁</span>
          </div>

          <div className="mbo-home-footer-mark">
            <p>M.B.O.</p>
            <span>MOBILITY OPS LAB</span>
          </div>
        </aside>

        <section className="mbo-home-main">
          <div className="mbo-home-hero-bg" />
          <div className="mbo-home-hero-glow" />

          <article className="mbo-home-hero-content">
            <p className="mbo-home-tag">Frontier Interface</p>
            <h1>M.B.O. 城市智能规划系统</h1>
            <p>
              通过统一任务流整合规划、反馈、记忆与地图展示。保持当前业务功能不变，同时升级为工业风可视化入口。
            </p>
            <div className="mbo-home-hero-actions">
              <button type="button" onClick={() => router.push("/planner")}>进入规划台</button>
              <button type="button" onClick={() => router.push("/auth/login?next=/planner")}>账号接入</button>
            </div>
          </article>

          <div className="mbo-home-bottom-panel">
            <div className="mbo-home-bottom-card">
              <p>01</p>
              <h3>加载页风格</h3>
              <span>已接入黑底网格与进度动画</span>
            </div>
            <div className="mbo-home-bottom-card">
              <p>02</p>
              <h3>主页视觉</h3>
              <span>工业层叠背景 + 主视觉信息区</span>
            </div>
            <div className="mbo-home-bottom-card">
              <p>03</p>
              <h3>侧边导航</h3>
              <span>角色敏感跳转，首页入口优先</span>
            </div>
          </div>
        </section>
      </main>
      {showLoadingOverlay ? <LoadingScreen progress={progress} phase={phase} /> : null}
    </>
  );
}
