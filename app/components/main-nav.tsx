"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/app/components/auth-provider";

export default function MainNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { authToken, currentUser, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const links = useMemo(() => {
    const base: Array<{ href: string; label: string }> = [{ href: "/planner", label: "规划" }];
    if (currentUser?.role === "user") {
      base.push({ href: "/user", label: "用户中心" });
    }
    if (currentUser?.role === "admin") {
      base.push({ href: "/admin", label: "管理台" });
    }
    return base;
  }, [currentUser?.role]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      const target = event.target;
      if (!menuRef.current || !(target instanceof Node)) {
        return;
      }
      if (!menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocClick);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
    };
  }, []);

  if (pathname === "/") {
    return null;
  }

  return (
    <header className="mbo-nav-shell sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/planner" className="mbo-kicker">
            M.B.O.
          </Link>
          <div className="hidden md:block">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">Mobility Bureau Operation</p>
            <p className="mbo-nav-status mt-0.5">route control node online</p>
          </div>
          {links.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`mbo-nav-link rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  active ? "mbo-nav-link-active bg-sky-600 text-white" : "border border-slate-300 text-slate-700"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {!authToken || !currentUser ? (
          <button
            type="button"
            onClick={() => {
              router.push(`/auth/login?next=${encodeURIComponent(pathname || "/planner")}`);
            }}
            className="mbo-btn-cta rounded-lg border border-sky-300 bg-sky-600 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-white"
          >
            登录
          </button>
        ) : (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="mbo-avatar-btn flex h-9 w-9 items-center justify-center rounded-lg border border-sky-300 bg-sky-600 text-sm font-semibold text-white"
              title={`${currentUser.username} (${currentUser.role})`}
              aria-label="user-menu"
            >
              {currentUser.username.slice(0, 1).toUpperCase()}
            </button>

            {menuOpen ? (
              <div className="mbo-dropdown mbo-panel absolute right-0 mt-2 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                {currentUser.role === "user" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      router.push("/user");
                    }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    用户中心
                  </button>
                ) : null}

                {currentUser.role === "admin" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      router.push("/admin");
                    }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    管理台
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                    router.push("/auth/login");
                  }}
                  className="w-full rounded-md px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50"
                >
                  登出
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </header>
  );
}
