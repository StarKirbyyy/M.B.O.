import type { NavItem } from "@/app/components/home/types";

export function NavIconGlyph({ icon }: { icon: NavItem["icon"] }) {
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

export function ActionIcon({ kind, muted = false }: { kind: "user" | "payment" | "sound"; muted?: boolean }) {
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
