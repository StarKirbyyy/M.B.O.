import type { UserRole } from "@/lib/auth/types";

export type NavItemKey = "home" | "planner" | "memory" | "user" | "admin" | "notice";

export type NavItem = {
  key: NavItemKey;
  label: string;
  icon: "home" | "route" | "memory" | "user" | "admin" | "notice";
  href: string;
  group: "home" | "planner" | "history" | "user" | "admin" | "notice";
  role?: UserRole;
};

export type LoadingPhase = "progress" | "expand" | "reveal" | "done";
