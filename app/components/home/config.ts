import type { NavItem } from "@/app/components/home/types";

export const MENU_ITEMS: NavItem[] = [
  { key: "home", label: "任务总览", icon: "home", href: "/", group: "home" },
  { key: "planner", label: "路径方案", icon: "route", href: "/planner", group: "planner" },
  { key: "memory", label: "历史归档", icon: "memory", href: "/history", group: "history" },
  { key: "user", label: "用户工作台", icon: "user", href: "/user", group: "user", role: "user" },
  { key: "admin", label: "管理控制台", icon: "admin", href: "/admin", group: "admin", role: "admin" },
  { key: "notice", label: "公告中心", icon: "notice", href: "/notice", group: "notice" },
];
