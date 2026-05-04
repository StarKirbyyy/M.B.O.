export const HOME_STYLE_RECOVERY = `
.mbo-home-shell {
  position: relative;
  min-height: 100dvh;
  background: #e5e7eb;
  color: #111;
  opacity: 1 !important;
}

.mbo-home-sidebar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 4;
  display: grid;
  grid-template-rows: 100px minmax(0, 1fr) 154px 38px 22px;
  gap: 6px;
  width: 86px;
  overflow: hidden;
  border-right: 1px solid #d5d8dd;
  background: linear-gradient(180deg, #f5f6f8, #eff1f4);
  padding: 8px 8px 8px 0;
  transition: width 360ms ease;
}

.mbo-home-sidebar:hover,
.mbo-home-sidebar:focus-within {
  width: 300px;
}

.mbo-home-logo-block {
  border: 1px solid #ccd2d9;
  background: #f4f5f7;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 8px 10px;
}

.mbo-home-menu {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 0;
}

.mbo-home-menu-item {
  position: relative;
  display: block;
  border: 0;
  width: 100%;
  min-height: 64px;
  text-align: left;
  color: #c7ccd2;
}

.mbo-home-menu-item.is-active {
  background: #d1d4d8;
  color: #111827;
}

.mbo-home-menu-item.is-active::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 9px;
  background: #111;
}

.mbo-home-menu-icon {
  position: absolute;
  left: 42px;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 2.9rem;
  height: 2.9rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.mbo-home-menu-glyph {
  width: 2.44rem;
  height: 2.44rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.65;
  stroke-linecap: square;
  stroke-linejoin: miter;
  vector-effect: non-scaling-stroke;
}

.mbo-home-menu-label {
  position: absolute;
  left: 108px;
  top: 50%;
  opacity: 0;
  transform: translate(-8px, -50%);
  transition: opacity 220ms ease, transform 220ms ease;
  color: #202734;
  font-weight: 600;
}

.mbo-home-sidebar:hover .mbo-home-menu-label,
.mbo-home-sidebar:focus-within .mbo-home-menu-label {
  opacity: 1;
  transform: translate(0, -50%);
}

.mbo-home-userbox {
  width: 48px;
  margin-left: 14px;
  border-radius: 999px;
  background: #dce0e5;
  padding: 4px;
}

.mbo-home-user-btn {
  position: relative;
  width: 100%;
  min-height: 48px;
  border: 0;
  background: transparent;
  text-align: left;
}

.mbo-home-user-row-icon {
  position: absolute;
  left: min(50%, 24px);
  top: 50%;
  transform: translate(-50%, -50%);
  width: 2.2rem;
  height: 2.2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #7a818c;
}

.mbo-home-action-glyph {
  width: 2.08rem;
  height: 2.08rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.55;
  stroke-linecap: square;
  stroke-linejoin: miter;
  vector-effect: non-scaling-stroke;
}

.mbo-home-user-row-label {
  position: absolute;
  left: 94px;
  top: 50%;
  opacity: 0;
  transform: translate(-8px, -50%);
  transition: opacity 220ms ease, transform 220ms ease;
  color: #3a414c;
}

.mbo-home-sidebar:hover .mbo-home-userbox,
.mbo-home-sidebar:focus-within .mbo-home-userbox {
  width: calc(100% - 26px);
  border-radius: 4px;
  background: #d6d9de;
}

.mbo-home-sidebar:hover .mbo-home-user-row-label,
.mbo-home-sidebar:focus-within .mbo-home-user-row-label {
  opacity: 1;
  transform: translate(0, -50%);
}

.mbo-home-social-row {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 3px;
  border: 1px solid #d5d9df;
  background: #eceef2;
  padding: 4px;
}

.mbo-home-main {
  position: relative;
  min-height: 100dvh;
  margin-left: 86px;
  background: #e5e7eb;
}

.mbo-loading-screen {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: #090d13;
  color: #e8edf1;
}

.mbo-loading-core {
  position: absolute;
  left: 56%;
  top: 50%;
  transform: translate(-50%, -50%);
}

.mbo-loading-rail {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 18px;
}
`;
