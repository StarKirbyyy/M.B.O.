import Link from "next/link";
import type { MouseEvent, RefObject } from "react";
import type { AuthUser } from "@/lib/auth/types";

import { ActionIcon, NavIconGlyph } from "@/app/components/home/icons";
import type { NavItem } from "@/app/components/home/types";

interface HomeSidebarProps {
  sidebarRef: RefObject<HTMLElement | null>;
  menuItems: NavItem[];
  activeKey: NavItem["key"] | null;
  currentUser: AuthUser | null;
  soundOn: boolean;
  onToggleSound: () => void;
  onSidebarMouseEnter?: () => void;
  onSidebarMouseLeave?: () => void;
  onMenuItemActivate?: (item: NavItem) => void;
  resolveMenuHref: (item: NavItem) => string;
  onMenuNavigate: (event: MouseEvent<HTMLAnchorElement>, item: NavItem, href: string) => void;
  onPersonalNav: () => void;
  onServiceNav: () => void;
}

export default function HomeSidebar({
  sidebarRef,
  menuItems,
  activeKey,
  currentUser,
  soundOn,
  onToggleSound,
  onSidebarMouseEnter,
  onSidebarMouseLeave,
  onMenuItemActivate,
  resolveMenuHref,
  onMenuNavigate,
  onPersonalNav,
  onServiceNav,
}: HomeSidebarProps) {
  return (
    <aside
      ref={sidebarRef}
      className="mbo-home-sidebar"
      onMouseEnter={onSidebarMouseEnter}
      onMouseLeave={onSidebarMouseLeave}
    >
      <div className="mbo-home-logo-block">
        <p className="mbo-home-logo-mark">M.B.O.</p>
        <p className="mbo-home-logo-sub">MOBILITY BUREAU OPERATION</p>
      </div>

      <nav className="mbo-home-menu" aria-label="Home Side Navigation">
        {menuItems.map((item) => {
          const disabledByRole = Boolean(item.role && currentUser?.role !== item.role);
          const isActive = activeKey === item.key;
          const href = resolveMenuHref(item);
          return (
            <Link
              key={item.key}
              href={href}
              scroll={false}
              prefetch
              onClick={(event) => {
                onMenuItemActivate?.(item);
                onMenuNavigate(event, item, href);
              }}
              className={`mbo-home-menu-item ${isActive ? "is-active" : ""}`}
              title={disabledByRole ? "登录对应角色后可访问" : item.label}
            >
              <span className={`mbo-home-menu-icon mbo-home-menu-icon-${item.key}`}>
                <NavIconGlyph icon={item.icon} />
              </span>
              <span className="mbo-home-menu-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mbo-home-userbox">
        <button type="button" className="mbo-home-user-btn mbo-home-user-row is-user" onClick={onPersonalNav}>
          <span className="mbo-home-user-row-icon">
            <ActionIcon kind="user" />
          </span>
          <span className="mbo-home-user-row-label">个人工作台</span>
        </button>
        <button type="button" className="mbo-home-user-btn mbo-home-user-row is-payment" onClick={onServiceNav}>
          <span className="mbo-home-user-row-icon">
            <ActionIcon kind="payment" />
          </span>
          <span className="mbo-home-user-row-label">调度服务中心</span>
        </button>
        <button
          type="button"
          className="mbo-home-user-btn mbo-home-user-row is-sound"
          onClick={onToggleSound}
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
  );
}
