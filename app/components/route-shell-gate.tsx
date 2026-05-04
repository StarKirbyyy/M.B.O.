"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import HomeWorkspaceShell from "@/app/components/home/workspace-shell";

interface RouteShellGateProps {
  children: ReactNode;
}

function shouldUseHomeShell(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/planner") ||
    pathname.startsWith("/history") ||
    pathname.startsWith("/notice") ||
    pathname.startsWith("/user") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth/login") ||
    pathname.startsWith("/auth/register")
  );
}

export default function RouteShellGate({ children }: RouteShellGateProps) {
  const pathname = usePathname();

  if (shouldUseHomeShell(pathname)) {
    return (
      <div className="mbo-shell">
        <HomeWorkspaceShell>{children}</HomeWorkspaceShell>
      </div>
    );
  }

  return <div className="mbo-shell">{children}</div>;
}
