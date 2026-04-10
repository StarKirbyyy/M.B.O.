# GitLab CI/CD 接入指南（Week 4）

## 1. 目标与范围

本指南用于将当前项目接入 GitLab CI/CD，实现：

1. 合并请求与主干代码自动质量门禁（`lint`、`test`、`build`）。
2. 主干或 Tag 的可控发布（支持 GitLab Runner + Vercel 部署）。
3. 与现有 Week 4 交付标准保持一致（见 `documents/week4_release_checklist.md`）。

当前仓库已提供可直接使用的流水线文件：`.gitlab-ci.yml`。

## 2. 推荐方案

### 2.1 Runner 选择建议

1. 课程/团队初期：优先用 GitLab Shared Runner（零运维成本）。
2. 需要内网访问、固定网络出口、或更可控资源时：使用自建 GitLab Runner（Docker executor）。

### 2.2 分支与触发建议

1. `merge_request`：强制运行 `lint + test + build`。
2. `main`：自动运行 CI，部署 job 设为手动触发（降低误发布风险）。
3. `tag`：自动触发生产部署（可用于正式版本发布）。

## 3. 一次性配置步骤

### 3.1 在 GitLab 项目启用 Runner

1. 打开 GitLab 项目。
2. 进入 `Settings -> CI/CD -> Runners`。
3. 如果使用共享 Runner，确认 Shared Runners 已启用。
4. 如果使用自建 Runner，按 GitLab 页面提示注册 Runner，并为 Runner 打上标签（例如 `docker`）。

### 3.2 配置 CI/CD Variables（必做）

进入 `Settings -> CI/CD -> Variables`，添加以下变量：

1. `VERCEL_TOKEN`（Protected + Masked）
2. `VERCEL_ORG_ID`（Protected）
3. `VERCEL_PROJECT_ID`（Protected）

说明：

1. 若不配置以上 3 个变量，部署 job 会自动跳过，但 CI 质量门禁仍然正常运行。
2. 应用运行时变量（如 `SILICONFLOW_API_KEY`、`AMAP_WEB_KEY`）按部署平台需求配置在目标环境中，不建议明文写入仓库。

### 3.3 推送并验证

1. 将 `.gitlab-ci.yml` 推送到仓库。
2. 提交一个 MR，确认 `lint/test/build` 全绿。
3. 合并到 `main` 后，在 `deploy_vercel` job 手动点击执行，验证生产部署链路。

## 4. 当前流水线说明（`.gitlab-ci.yml`）

### 4.1 阶段设计

1. `quality`
2. `build`
3. `deploy`

### 4.2 Job 说明

1. `lint`：执行 `npm run lint`。
2. `test`：执行 `npm run test`（设置 `NODE_ENV=test`）。
3. `build`：执行 `npm run build`，并产出构建工件。
4. `deploy_vercel`：在 `main`（手动）或 `tag`（自动）触发，执行 Vercel CLI 部署。

### 4.3 性能与稳定性设置

1. 使用 Node 20 容器（`node:20-alpine`），与仓库当前脚本兼容。
2. 启用 npm 缓存目录（`.npm/`）降低重复安装耗时。
3. 设置 `NEXT_TELEMETRY_DISABLED=1` 使 CI 日志更干净。

## 5. 可选增强（建议迭代）

1. 增加 `preview` 环境：MR 自动部署临时预览 URL。
2. 引入 `environment` 审批策略：生产部署需 Maintainer 审批。
3. 增加 E2E smoke test（部署后探活接口）：
   - `POST /api/agent/plan`
   - `POST /api/agent/plan/stream`
   - `POST /api/agent/feedback`
   - `GET /api/map/static`
4. 基于 `changes` 规则做增量流水线，减少无关改动的 CI 时长。

## 6. 常见问题排查

### 6.1 Job 一直 Pending

1. Runner 未启用，或没有匹配当前 job 的执行器/标签。
2. 共享 Runner 配额不足，需等待或切换自建 Runner。

### 6.2 部署被跳过

1. 未配置 `VERCEL_TOKEN`/`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID`。
2. 这是预期保护行为，不影响 CI 质量门禁。

### 6.3 本地通过，CI 失败

1. Node 版本不一致（本地建议同样使用 Node 20）。
2. 锁文件未更新（确保 `package-lock.json` 与 `package.json` 一致）。
3. 环境变量依赖与本地不同（检查是否在构建阶段读取了必需变量）。

## 7. 最小上线清单

1. GitLab Runner 可执行 pipeline。
2. MR 必须通过 `lint/test/build` 才可合并。
3. `main` 分支部署具备人工确认或审批。
4. 密钥均在 GitLab Variables 中管理，仓库不存放真实密钥。
