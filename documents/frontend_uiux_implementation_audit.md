# 前端/UIUX 实现盘点与待办清单（基于 requirements.md）

## 1. 盘点范围

- 需求来源：`documents/requirements.md`
- 代码范围：`app/`、`lib/`、`test/`
- 盘点时间：2026-04-23
- 角色视角：成员 C（前端与体验），主责 M6，协作 M2/M9

## 2. 当前已实现情况（按模块）

| 模块 | 需求状态 | 当前实现证据 | 结论 |
|---|---|---|---|
| M1 输入与目标建模（P0） | 已实现 | Agent 流程中包含 `CLARIFY` 阶段并输出结构化结果；前端展示“目标澄清结果” | 核心链路已可展示 |
| M2 规划与推理（P0/P1） | P0 已实现，P1 未完成 | 已有单方案生成与展示；无“策略切换 UI”和“双方案对比 UI” | 你需要补齐 M2 的前端协作部分 |
| M3 工具编排（P0） | 已实现 | 前端可展示天气、POI 检查、动态/静态地图 | 前端展示层已具备 |
| M4 记忆与反馈（P0/P1） | P0 已实现，P1 部分实现 | 前端支持反馈写回；可展示记忆快照 | 已有可演示闭环，仍可加强交互体验 |
| M5 自我修正（P0） | 已实现 | 前端展示初始计划、修正记录、最终计划、状态流转 | 可演示完整 Replan 链路 |
| M6 可视化与交互（P0/P2） | P0 基本实现，P2 未实现 | 时间线与修正记录已展示；导出/多语言未见实现 | 你的主责模块尚有 P2 缺口 |
| M7 约束与评分（P1） | 未完成 | 暂无约束评分 UI 与可视化评分结果 | 依赖后端能力后补前端 |
| M8 工程质量与交付（P0） | 基本实现 | 当前 `npm run test`、`npm run build` 可通过 | 前端自动化测试仍偏少 |
| M9 用户系统与数据存储（P0/P1） | 后端接口已基本实现，前端 UI 未完成 | 已有 auth/profile/plans/data 等 API；前端仍是匿名 Demo 页面 | 你需要完成登录与用户中心前端 |

## 3. 已实现能力标注（与你职责最相关）

## 3.1 M6（可视化与交互）已实现

1. 单页 Demo 入口与主界面已实现：
- `app/page.tsx`
- `app/components/week1-demo.tsx`

2. 实时状态流与可解释展示已实现：
- SSE 事件处理（`stage/model_chunk/final/error/heartbeat`）
- “实时推理过程（结构化）”日志面板
- “状态流转（含 Replan）”时间线

3. 重规划前后信息可读展示已实现（基础版）：
- 初始计划快照
- 自我修正记录（替换/时长调整/原因）
- 最终计划卡片

4. 地图可视化已实现：
- 动态高德地图组件 `app/components/amap-dynamic-map.tsx`
- 静态地图图片渲染（`/api/map/static`）

5. 记忆反馈交互已实现（匿名/半匿名模式）：
- 反馈表单（liked/disliked/preferredMobility）
- 前端写入 `POST /api/agent/feedback`

## 3.2 M9（登录与用户中心）后端已就绪但前端未落地

1. 已有认证与用户接口：
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET/PATCH /api/user/profile`
- `GET /api/user/plans`、`DELETE /api/user/plans/[id]`
- `GET /api/user/feedback`
- `GET /api/user/sessions`
- `DELETE /api/user/data`

2. 已有数据表与持久化能力：
- `auth_users`、`user_profiles`、`user_sessions`、`plan_histories`、`user_feedback`

3. 当前前端仍使用手动 `userId` 输入，未接入登录态管理。

## 4. 你还需要完成的工作（前端工程 + UIUX）

## P0（必须优先完成）

1. 登录注册与用户态切换 UI（M9 协作）
- 新增登录/注册页面或弹窗流程。
- 登录后保存 token，并在请求中自动附带 `Authorization: Bearer <token>`。
- 页面头部显示当前用户信息与退出登录。

2. 用户中心基础信息页（M9 协作）
- 资料查看/编辑：昵称、语言、默认城市、预算偏好、体力偏好。
- 调用 `GET/PATCH /api/user/profile`。

3. 历史计划页（M9 协作）
- 列表展示历史行程，支持分页加载。
- 支持删除单条历史（`DELETE /api/user/plans/[id]`）。

4. “清空个人数据”前端入口（M9 协作）
- 在用户中心提供二次确认操作。
- 调用 `DELETE /api/user/data` 并给出完成反馈。

5. 匿名态/登录态体验分流（M9 协作）
- 匿名用户保留 Demo 能力。
- 登录用户默认走 `me` 身份，并读取个人历史与偏好。

## P1（建议本周内完成）

1. 双方案对比 UI（M2 协作）
- 设计“舒适优先/效率优先”双栏对比组件。
- 显示差异点：时长、步行强度、风险提示、理由。

2. 策略可视化与切换入口（M2 协作）
- 明确当前策略标签。
- 允许用户切换策略并重新生成。

3. M6 的“前后计划 diff”升级
- 从“文本记录”升级为结构化差异视图（新增/替换/时长变化高亮）。

4. 前端容错体验完善
- 401 自动引导登录。
- 接口失败重试按钮。
- 长耗时场景 skeleton/loading 优化。

## P2（产品化与体验提升）

1. 导出功能 UI（M6 P2）
- 导出文本摘要或卡片（至少一种）。

2. 多语言切换 UI（M6 P2）
- 中/英切换控件。
- 页面文案与关键状态文案国际化。

3. UIUX 系统化
- 建立基础设计令牌（颜色、间距、圆角、阴影、字体层级）。
- 拆分过大的页面组件（当前 `week1-demo.tsx` 过于集中）。

4. 前端测试补齐
- 至少补 3 类测试：登录流程、历史记录操作、关键可视化组件渲染。

## 5. 风险与注意事项

1. 当前鉴权为 Bearer Token 解析，前端不接入 token 管理则用户中心不可用。
2. 需求中提到“关键接口基础限流”，当前代码未见限流实现，需与后端同学确认。
3. `requirements.md` 中 M9 标注了 `(done)`，但结合现状应理解为“后端能力基本完成，前端用户体验仍未完成”。

## 6. 建议执行顺序（可直接拆任务）

1. 先做“认证 + 用户态基础设施”（token 注入、me、登出）。
2. 再做“用户中心最小闭环”（profile + plans + delete + clear data）。
3. 然后做“双方案与策略 UI”。
4. 最后做“导出 + 多语言 + 测试补齐”。

## 7. 代码证据索引（关键）

- 需求职责与模块：`documents/requirements.md`
- 主页面入口：`app/page.tsx`
- 当前前端 Demo：`app/components/week1-demo.tsx`
- 地图组件：`app/components/amap-dynamic-map.tsx`
- 认证接口：`app/api/auth/login/route.ts`、`app/api/auth/register/route.ts`、`app/api/auth/me/route.ts`
- 用户中心接口：`app/api/user/profile/route.ts`、`app/api/user/plans/route.ts`、`app/api/user/plans/[id]/route.ts`、`app/api/user/feedback/route.ts`、`app/api/user/sessions/route.ts`、`app/api/user/data/route.ts`
- 鉴权读取方式：`lib/auth/request.ts`
- 数据表与持久化：`lib/auth/repository.ts`、`lib/user/repository.ts`
- Agent 输出结构（当前为单方案结构）：`lib/agent/types.ts`、`lib/agent/run-week1.ts`
