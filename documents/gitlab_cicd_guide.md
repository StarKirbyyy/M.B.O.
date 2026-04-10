# GitLab CI/CD 接入指南（Week 4）

## 1. 目标与范围

本指南用于将当前项目接入 GitLab CI/CD，实现：

1. 合并请求与主干代码自动质量门禁（`lint`、`test`、`build`）。
2. 通过 GitLab Runner 调用 Vercel CLI 完成 Preview/Production 部署。
3. 与现有 Week 4 交付标准保持一致（见 `documents/week4_release_checklist.md`）。

当前仓库已提供可直接使用的流水线文件：`.gitlab-ci.yml`。

## 2. 推荐方案（私服 GitLab）

### 2.1 Runner 选择建议

1. 课程/团队初期：优先用 GitLab Shared Runner（零运维成本）。
2. 需要内网访问、固定网络出口、或更可控资源时：使用自建 GitLab Runner（Docker executor）。

### 2.2 分支与触发建议

1. `merge_request`：强制运行 `lint + test + build`。
2. 非 `main/master` 分支：`lint + test + build` 后自动执行 Preview 部署。
3. `main` 或 `master` 分支：`lint + test + build` 后手动触发生产部署（降低误发布风险）。

## 3. 一次性配置步骤

### 3.1 在 GitLab 项目启用 Runner

1. 打开 GitLab 项目。
2. 进入 `Settings -> CI/CD -> Runners`。
3. 如果使用共享 Runner，确认 Shared Runners 已启用。
4. 如果使用自建 Runner，按 GitLab 页面提示注册 Runner，并为 Runner 打上标签（例如 `docker`）。

### 3.2 配置 GitLab CI/CD Variables（必做）

进入 `Settings -> CI/CD -> Variables`，添加以下变量：

1. `VERCEL_TOKEN`（Masked，建议 Protected）
2. `VERCEL_ORG_ID`（建议 Protected）
3. `VERCEL_PROJECT_ID`（建议 Protected）

说明：

1. 私服 GitLab 无法使用原生 Git 集成时，此方案最稳定。
2. 若变量缺失，部署 job 会直接失败并给出明确错误，避免“假成功”。

### 3.3 推送并验证

1. 将 `.gitlab-ci.yml` 推送到仓库。
2. 提交一个 MR，确认 `lint/test/build` 全绿。
3. 在任意非 `main/master` 分支推送一次，确认 `deploy_preview` 成功。
4. 合并到 `main` 或 `master` 后手动触发 `deploy_production`，确认生产部署成功。

## 4. 当前流水线说明（`.gitlab-ci.yml`）

### 4.1 阶段设计

1. `quality`
2. `build`
3. `deploy`

### 4.2 Job 说明

1. `lint`：执行 `npm run lint`。
2. `test`：执行 `npm run test`（设置 `NODE_ENV=test`）。
3. `build`：执行 `npm run build`，并产出构建工件。
4. `deploy_preview`：非 `main/master` 分支自动部署 Preview。
5. `deploy_production`：`main/master` 分支手动触发生产部署，Tag 自动部署。

### 4.3 性能与稳定性设置

1. 使用 Node 20 容器（`node:20-alpine`），与仓库当前脚本兼容。
2. 启用 npm 缓存目录（`.npm/`）降低重复安装耗时。
3. 设置 `NEXT_TELEMETRY_DISABLED=1` 使 CI 日志更干净。

## 5. 可选增强（建议迭代）

1. 在 Vercel 中启用 Deployment Protection（生产环境审批保护）。
2. 在 GitLab 中为 `main/master` 分支启用保护规则并限制手动部署权限。
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

### 6.2 部署被跳过或失败

1. `VERCEL_TOKEN`/`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` 未配置或作用域不匹配。
2. Runner 所在网络无法访问 `https://api.vercel.com`。
3. `VERCEL_TOKEN` 的 scope 未覆盖目标 Team 或项目。

### 6.3 本地通过，CI 失败

1. Node 版本不一致（本地建议同样使用 Node 20）。
2. 锁文件未更新（确保 `package-lock.json` 与 `package.json` 一致）。
3. 环境变量依赖与本地不同（检查是否在构建阶段读取了必需变量）。

## 7. 最小上线清单

1. GitLab Runner 可执行 pipeline。
2. MR 必须通过 `lint/test/build` 才可合并。
3. Preview 与 Production 部署都能从 GitLab Pipeline 成功触发。
4. 部署密钥仅存放在 GitLab Variables（或外部密钥管理）中，仓库不存放真实密钥。
