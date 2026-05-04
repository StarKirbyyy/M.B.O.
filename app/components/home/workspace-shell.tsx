"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode } from "react";

import { useAuth } from "@/app/components/auth-provider";
import { MENU_ITEMS } from "@/app/components/home/config";
import HomeSidebar from "@/app/components/home/sidebar";
import type { LoadingPhase, NavItem, NavItemKey } from "@/app/components/home/types";

const LoadingScreen = dynamic(() => import("@/app/components/home/loading-screen"), { ssr: false });

const LOADING_DURATION_MS = 2400;
const EXPAND_DELAY_MS = 680;
const REVEAL_DELAY_MS = 1240;

interface HomeWorkspaceShellProps {
  children: ReactNode;
}

type TransitionStep = {
  key: NavItemKey;
  href: string;
  durationMs: number;
};

const NAV_ORDER: NavItemKey[] = ["home", "planner", "memory", "user", "admin", "notice"];
const ROUTE_SWITCH_TOTAL_DURATION_MS = 520;
const ROUTE_SWITCH_MIN_STEP_DURATION_MS = 120;

export default function HomeWorkspaceShell({ children }: HomeWorkspaceShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { authToken, currentUser } = useAuth();
  const sidebarRef = useRef<HTMLElement | null>(null);
  const routedContentRef = useRef<HTMLDivElement | null>(null);
  const transitionQueueRef = useRef<TransitionStep[]>([]);
  const latestActiveKeyRef = useRef<NavItemKey | null>(null);
  const transitionCurrentKeyRef = useRef<NavItemKey | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const [contentEnterClass, setContentEnterClass] = useState("");
  const [isRouteSwitching, setIsRouteSwitching] = useState(false);
  const [isSwitchAnimating, setIsSwitchAnimating] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<"up" | "down" | null>(null);
  const [transitionDurationMs, setTransitionDurationMs] = useState(ROUTE_SWITCH_TOTAL_DURATION_MS);
  const [activeKeyOverride, setActiveKeyOverride] = useState<NavItemKey | null>(null);
  const [snapshotHtml, setSnapshotHtml] = useState<string | null>(null);
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>("progress");
  const [loadingProgress, setLoadingProgress] = useState(1);

  const menuHrefByKey = useMemo(() => {
    const hrefMap = new Map<NavItemKey, string>();
    for (const item of MENU_ITEMS) {
      if (item.role && (!authToken || currentUser?.role !== item.role)) {
        hrefMap.set(item.key, `/auth/login?next=${encodeURIComponent(item.href)}`);
        continue;
      }
      hrefMap.set(item.key, item.href);
    }
    return hrefMap;
  }, [authToken, currentUser?.role]);

  const activeKey = useMemo<NavItemKey | null>(() => {
    const mapPathToNavKey = (path: string): NavItemKey | null => {
      if (path === "/") {
        return "home";
      }
      if (path.startsWith("/planner")) {
        return "planner";
      }
      if (path.startsWith("/history")) {
        return "memory";
      }
      if (path.startsWith("/user")) {
        return "user";
      }
      if (path.startsWith("/admin")) {
        return "admin";
      }
      if (path.startsWith("/notice")) {
        return "notice";
      }
      return null;
    };

    if (pathname.startsWith("/auth")) {
      const nextPath = searchParams.get("next");
      if (nextPath && nextPath.startsWith("/")) {
        return activeKeyOverride ?? mapPathToNavKey(nextPath);
      }
      return activeKeyOverride ?? null;
    }
    return activeKeyOverride ?? mapPathToNavKey(pathname) ?? "home";
  }, [pathname, searchParams, activeKeyOverride]);

  function resolveMenuHref(item: NavItem): string {
    return menuHrefByKey.get(item.key) ?? item.href;
  }

  function getDirectionByKeys(current: NavItemKey | null, target: NavItemKey): "up" | "down" {
    if (!current) {
      return "up";
    }
    const currentIndex = NAV_ORDER.indexOf(current);
    const targetIndex = NAV_ORDER.indexOf(target);
    if (currentIndex < 0 || targetIndex < 0) {
      return "up";
    }
    return targetIndex > currentIndex ? "up" : "down";
  }

  const runTransitionTo = useCallback(
    (targetKey: NavItemKey, href: string, durationMs: number) => {
      const currentKey = transitionCurrentKeyRef.current ?? latestActiveKeyRef.current;
      const direction = getDirectionByKeys(currentKey, targetKey);
      const html = routedContentRef.current?.innerHTML ?? null;
      if (html) {
        setSnapshotHtml(html);
      } else {
        setSnapshotHtml(null);
      }
      setContentEnterClass("");
      setIsSwitchAnimating(false);
      setTransitionDirection(direction);
      setTransitionDurationMs(durationMs);
      setIsRouteSwitching(true);
      transitionCurrentKeyRef.current = targetKey;
      router.push(href, { scroll: false });
    },
    [router],
  );

  function buildTransitionSteps(targetItem: NavItem): TransitionStep[] {
    const targetHref = resolveMenuHref(targetItem);
    if (targetHref.startsWith("/auth")) {
      return [{ key: targetItem.key, href: targetHref, durationMs: ROUTE_SWITCH_TOTAL_DURATION_MS }];
    }

    const currentKey = transitionCurrentKeyRef.current ?? latestActiveKeyRef.current;
    const currentIndex = currentKey ? NAV_ORDER.indexOf(currentKey) : -1;
    const targetIndex = NAV_ORDER.indexOf(targetItem.key);

    if (currentIndex < 0 || targetIndex < 0 || currentIndex === targetIndex) {
      return [{ key: targetItem.key, href: targetHref, durationMs: ROUTE_SWITCH_TOTAL_DURATION_MS }];
    }

    const direction = targetIndex > currentIndex ? 1 : -1;
    const steps: TransitionStep[] = [];
    for (
      let index = currentIndex + direction;
      direction > 0 ? index <= targetIndex : index >= targetIndex;
      index += direction
    ) {
      const key = NAV_ORDER[index];
      const menuItem = MENU_ITEMS.find((item) => item.key === key);
      if (!menuItem) {
        continue;
      }
      const href = resolveMenuHref(menuItem);
      if (href.startsWith("/auth")) {
        return [{ key: targetItem.key, href: targetHref, durationMs: ROUTE_SWITCH_TOTAL_DURATION_MS }];
      }
      steps.push({ key, href, durationMs: ROUTE_SWITCH_TOTAL_DURATION_MS });
    }
    if (steps.length === 0) {
      return [{ key: targetItem.key, href: targetHref, durationMs: ROUTE_SWITCH_TOTAL_DURATION_MS }];
    }
    if (steps.length > 1) {
      const equalizedStepMs = Math.max(
        ROUTE_SWITCH_MIN_STEP_DURATION_MS,
        Math.floor(ROUTE_SWITCH_TOTAL_DURATION_MS / steps.length),
      );
      for (let i = 0; i < steps.length; i += 1) {
        steps[i].durationMs = equalizedStepMs;
      }
    }
    return steps;
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const timer = window.setTimeout(() => {
      const pinned = window.sessionStorage.getItem("mbo_sidebar_pinned_open") === "1";
      setIsPinnedOpen(pinned);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    latestActiveKeyRef.current = activeKey;
    if (activeKey) {
      window.sessionStorage.setItem("mbo_last_nav_key", activeKey);
    }

    if (!isRouteSwitching || !transitionDirection) {
      return;
    }

    const enterClass = transitionDirection === "up" ? "mbo-route-enter-up" : "mbo-route-enter-down";
    const applyFrame = window.requestAnimationFrame(() => {
      setIsSwitchAnimating(true);
      setContentEnterClass(enterClass);
    });
    const completeTimer = window.setTimeout(() => {
      setContentEnterClass("");
      setIsSwitchAnimating(false);

      const nextStep = transitionQueueRef.current.shift();
      if (nextStep) {
        window.requestAnimationFrame(() => {
          runTransitionTo(nextStep.key, nextStep.href, nextStep.durationMs);
        });
        return;
      }

      setIsRouteSwitching(false);
      setTransitionDirection(null);
      setSnapshotHtml(null);
      setActiveKeyOverride(null);
      transitionCurrentKeyRef.current = null;
    }, transitionDurationMs);

    return () => {
      window.cancelAnimationFrame(applyFrame);
      window.clearTimeout(completeTimer);
    };
  }, [activeKey, isRouteSwitching, transitionDirection, transitionDurationMs, runTransitionTo]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    document.body.classList.add("mbo-shell-lock-scroll");
    return () => {
      document.body.classList.remove("mbo-shell-lock-scroll");
    };
  }, []);

  function handleMenuNavigate(
    event: ReactMouseEvent<HTMLAnchorElement>,
    item: NavItem,
    href: string,
  ) {
    if (isRouteSwitching) {
      event.preventDefault();
      return;
    }

    const currentQuery = searchParams.toString();
    const currentFullPath = currentQuery ? `${pathname}?${currentQuery}` : pathname;
    if (href === currentFullPath) {
      return;
    }

    event.preventDefault();
    const steps = buildTransitionSteps(item);
    if (steps.length <= 0) {
      router.push(href, { scroll: false });
      return;
    }

    transitionCurrentKeyRef.current = latestActiveKeyRef.current;
    setActiveKeyOverride(item.key);
    const [firstStep, ...restSteps] = steps;
    transitionQueueRef.current = restSteps;
    runTransitionTo(firstStep.key, firstStep.href, firstStep.durationMs);
  }

  useEffect(() => {
    for (const item of MENU_ITEMS) {
      router.prefetch(menuHrefByKey.get(item.key) ?? item.href);
    }
  }, [router, menuHrefByKey]);

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
        setLoadingProgress(value);
        if (raw < 1) {
          rafId = window.requestAnimationFrame(tick);
          return;
        }
        done();
      };

      rafId = window.requestAnimationFrame(tick);
    };

    const bootstrapId = schedule(() => {
      runSmoothProgress(LOADING_DURATION_MS, () => {
        setLoadingProgress(100);
        setLoadingPhase("expand");
        schedule(() => setLoadingPhase("reveal"), EXPAND_DELAY_MS);
        schedule(() => setLoadingPhase("done"), REVEAL_DELAY_MS);
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

  const showLoadingOverlay = loadingPhase !== "done";
  const routeStackStyle = useMemo(
    () =>
      ({
        ["--mbo-route-duration" as string]: `${transitionDurationMs}ms`,
      }) as CSSProperties,
    [transitionDurationMs],
  );
  const routeRenderKey = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  return (
    <main className={`mbo-home-shell is-visible mbo-home-shell-routed ${isPinnedOpen ? "is-pinned-open" : ""}`}>
      <HomeSidebar
        sidebarRef={sidebarRef}
        menuItems={MENU_ITEMS}
        activeKey={activeKey}
        currentUser={currentUser}
        soundOn={soundOn}
        onToggleSound={() => setSoundOn((prev) => !prev)}
        onSidebarMouseLeave={() => {
          if (typeof window !== "undefined") {
            window.sessionStorage.removeItem("mbo_sidebar_pinned_open");
          }
          setIsPinnedOpen(false);
        }}
        onMenuItemActivate={() => {
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem("mbo_sidebar_pinned_open", "1");
          }
          setIsPinnedOpen(true);
        }}
        resolveMenuHref={resolveMenuHref}
        onMenuNavigate={handleMenuNavigate}
        onPersonalNav={() => {
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem("mbo_sidebar_pinned_open", "1");
          }
          setIsPinnedOpen(true);
          if (authToken) {
            router.push(currentUser?.role === "admin" ? "/admin" : "/user", { scroll: false });
            return;
          }
          router.push("/auth/login?next=/planner", { scroll: false });
        }}
        onServiceNav={() => {
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem("mbo_sidebar_pinned_open", "1");
          }
          setIsPinnedOpen(true);
          router.push(currentUser?.role === "admin" ? "/admin" : "/planner", { scroll: false });
        }}
      />

      <section className="mbo-home-main mbo-home-main-routed">
        <div className="mbo-home-hero-bg" />
        <div className="mbo-home-hero-glow" />
        <div
          className={`mbo-home-route-stack ${isRouteSwitching ? "is-route-switching" : ""}`}
          style={routeStackStyle}
        >
          {isRouteSwitching && snapshotHtml ? (
            <div
              className={`mbo-home-routed-content mbo-route-snapshot ${
                isSwitchAnimating
                  ? transitionDirection === "down"
                    ? "mbo-route-leave-down"
                    : "mbo-route-leave-up"
                  : ""
              }`}
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: snapshotHtml }}
            />
          ) : null}
          <div
            key={routeRenderKey}
            ref={routedContentRef}
            className={`mbo-home-routed-content mbo-route-current ${contentEnterClass} ${isRouteSwitching ? "is-layered" : ""}`}
          >
            {children}
          </div>
        </div>
      </section>
      {showLoadingOverlay ? <LoadingScreen progress={loadingProgress} phase={loadingPhase} /> : null}
    </main>
  );
}
