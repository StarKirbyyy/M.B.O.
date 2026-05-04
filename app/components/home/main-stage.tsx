interface HomeMainStageProps {
  onOpenPlanner: () => void;
  onOpenLogin: () => void;
  embedded?: boolean;
}

export default function HomeMainStage({ onOpenPlanner, onOpenLogin, embedded = false }: HomeMainStageProps) {
  return (
    <section className={embedded ? "mbo-home-main-stage-embedded" : "mbo-home-main"}>
      {embedded ? null : <div className="mbo-home-hero-bg" />}
      {embedded ? null : <div className="mbo-home-hero-glow" />}

      <article className="mbo-home-hero-content">
        <p className="mbo-home-tag">Frontier Interface</p>
        <h1>M.B.O. 城市智能规划系统</h1>
        <p>通过统一任务流整合规划、反馈、记忆与地图展示。保持当前业务功能不变，同时升级为工业风可视化入口。</p>
        <div className="mbo-home-hero-actions">
          <button type="button" onClick={onOpenPlanner}>
            进入规划台
          </button>
          <button type="button" onClick={onOpenLogin}>
            账号接入
          </button>
        </div>
      </article>

      <div className={`mbo-home-bottom-panel ${embedded ? "is-embedded" : ""}`}>
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
  );
}
