# lib 模块函数文档

> 本文档覆盖 `lib/` 下所有模块的导出函数，按路径分类。

---

## lib/agent/clarifier.ts

### `clarifyGoal`

| 项 | 说明 |
|---|---|
| 功能 | 用正则和关键词规则将用户自然语言输入解析为结构化目标对象 |
| 参数 | `input: string` — 用户原始输入 |
| 返回 | `ClarifiedGoal` — 包含 city、vibes、mobility、budget、constraints、missing 等字段 |
| 调用方式 | `import { clarifyGoal } from "@/lib/agent/clarifier"` |

```ts
const goal = clarifyGoal("我想在上海度过一个艺术感的下午，不想太累");
```

---

## lib/agent/ai-clarifier.ts

### `parseAiClarifierText`

| 项 | 说明 |
|---|---|
| 功能 | 将 LLM 返回的原始文本解析为 `AiClarifierPayload` 结构体 |
| 参数 | `text: string` — LLM 原始输出文本 |
| 返回 | `AiClarifierPayload \| null` — 解析失败返回 null |
| 调用方式 | `import { parseAiClarifierText } from "@/lib/agent/ai-clarifier"` |

```ts
const payload = parseAiClarifierText(rawLlmOutput);
```

### `clarifyGoalWithAi`

| 项 | 说明 |
|---|---|
| 功能 | 调用 SiliconFlow LLM 对用户输入做结构化解析，置信度不足或离线时返回 null |
| 参数 | `{ userInput: string, fallback: ClarifiedGoal }` |
| 返回 | `{ clarified: ClarifiedGoal, confidence: number } \| null` |
| 调用方式 | `import { clarifyGoalWithAi } from "@/lib/agent/ai-clarifier"` |

```ts
const result = await clarifyGoalWithAi({ userInput, fallback: ruleResult });
if (result) use(result.clarified);
```

---

## lib/agent/llm-plan.ts

### `isSiliconFlowConfigured`

| 项 | 说明 |
|---|---|
| 功能 | 检查 SiliconFlow API Key 和模型是否已配置且未开启离线模式 |
| 参数 | 无 |
| 返回 | `boolean` |
| 调用方式 | `import { isSiliconFlowConfigured } from "@/lib/agent/llm-plan"` |

```ts
if (isSiliconFlowConfigured()) { /* 调用 LLM */ }
```

### `generatePlanWithSiliconFlow`

| 项 | 说明 |
|---|---|
| 功能 | 非流式调用 SiliconFlow 生成 3 步城市行程 |
| 参数 | `{ goal: ClarifiedGoal, weather: WeatherSnapshot }` |
| 返回 | `PlanStep[] \| null` — 失败返回 null |
| 调用方式 | `import { generatePlanWithSiliconFlow } from "@/lib/agent/llm-plan"` |

```ts
const steps = await generatePlanWithSiliconFlow({ goal, weather });
```

### `generatePlanWithSiliconFlowStreaming`

| 项 | 说明 |
|---|---|
| 功能 | 流式调用 SiliconFlow 生成行程，每个 delta 触发 onChunk 回调 |
| 参数 | `{ goal: ClarifiedGoal, weather: WeatherSnapshot, onChunk?: (chunk: string) => void }` |
| 返回 | `PlanStep[] \| null` |
| 调用方式 | `import { generatePlanWithSiliconFlowStreaming } from "@/lib/agent/llm-plan"` |

```ts
const steps = await generatePlanWithSiliconFlowStreaming({
  goal, weather,
  onChunk: (chunk) => push("model_chunk", { chunk }),
});
```

---

## lib/agent/memory.ts

### `readUserMemory`

| 项 | 说明 |
|---|---|
| 功能 | 从 JSON 文件存储中读取用户偏好画像 |
| 参数 | `userId: string` |
| 返回 | `UserMemoryProfile` — 包含 vibeScores、dislikedPlaces、preferredMobility |
| 调用方式 | `import { readUserMemory } from "@/lib/agent/memory"` |

```ts
const profile = await readUserMemory("user-123");
```

### `getTopVibes`

| 项 | 说明 |
|---|---|
| 功能 | 从用户画像中取评分最高的前 N 个 vibe 标签 |
| 参数 | `profile: UserMemoryProfile, n: number` |
| 返回 | `string[]` |
| 调用方式 | `import { getTopVibes } from "@/lib/agent/memory"` |

```ts
const vibes = getTopVibes(profile, 2); // ["艺术", "文艺"]
```

### `writeUserFeedback`

| 项 | 说明 |
|---|---|
| 功能 | 将用户反馈合并写入记忆文件，更新 vibe 评分和黑名单 |
| 参数 | `userId: string, feedback: { likedVibes?, dislikedVibes?, dislikedPlaces?, preferredMobility? }` |
| 返回 | `UserMemoryProfile` — 更新后的画像 |
| 调用方式 | `import { writeUserFeedback } from "@/lib/agent/memory"` |

```ts
const updated = await writeUserFeedback("user-123", {
  likedVibes: ["艺术"],
  dislikedPlaces: ["某商场"],
});
```

### `clearUserMemory`

| 项 | 说明 |
|---|---|
| 功能 | 删除某用户的记忆条目 |
| 参数 | `userId: string` |
| 返回 | `boolean` — 不存在时返回 false |
| 调用方式 | `import { clearUserMemory } from "@/lib/agent/memory"` |

```ts
const removed = await clearUserMemory("user-123");
```

---

## lib/agent/planner.ts

### `getCandidates`

| 项 | 说明 |
|---|---|
| 功能 | 返回指定城市的 POI 候选列表，无匹配时回退到默认列表 |
| 参数 | `city: string` |
| 返回 | `PoiCandidate[]` |
| 调用方式 | `import { getCandidates } from "@/lib/agent/planner"` |

```ts
const candidates = getCandidates("上海");
```

### `buildInitialPlan`

| 项 | 说明 |
|---|---|
| 功能 | 基于规则生成 3 步初始行程（不调用 LLM） |
| 参数 | `clarified: ClarifiedGoal, weather: WeatherSnapshot` |
| 返回 | `PlanStep[]` |
| 调用方式 | `import { buildInitialPlan } from "@/lib/agent/planner"` |

```ts
const steps = buildInitialPlan(clarified, weather);
```

### `summarizeInitialPlan`

| 项 | 说明 |
|---|---|
| 功能 | 返回初始行程的人类可读摘要字符串 |
| 参数 | `clarified: ClarifiedGoal, weather: WeatherSnapshot` |
| 返回 | `string` |
| 调用方式 | `import { summarizeInitialPlan } from "@/lib/agent/planner"` |

```ts
const summary = summarizeInitialPlan(clarified, weather);
```

### `buildReplacementStep`

| 项 | 说明 |
|---|---|
| 功能 | 当某步骤 POI 不可用时，从候选列表中找替代地点 |
| 参数 | `{ goal, weather, originalStep, usedPlaces: Set<string>, forceIndoor?: boolean }` |
| 返回 | `PlanStep \| null` — 找不到替代时返回 null |
| 调用方式 | `import { buildReplacementStep } from "@/lib/agent/planner"` |

```ts
const replacement = buildReplacementStep({ goal, weather, originalStep, usedPlaces });
```

---

## lib/agent/replan-strategy.ts

### `getReplanStrategy`

| 项 | 说明 |
|---|---|
| 功能 | 根据 POI 不可用原因返回对应的重规划策略 |
| 参数 | `reason: string` — 如 `"weather"`、`"closed"`、`"memory_disliked_place"` |
| 返回 | `ReplanStrategy` — 包含 id、label、shouldReplace、forceIndoor、durationDeltaMinutes |
| 调用方式 | `import { getReplanStrategy } from "@/lib/agent/replan-strategy"` |

```ts
const strategy = getReplanStrategy("weather");
```

### `applyDurationDelta`

| 项 | 说明 |
|---|---|
| 功能 | 对步骤时长做加减，结果最低不低于 40 分钟 |
| 参数 | `duration: number, delta: number` |
| 返回 | `number` |
| 调用方式 | `import { applyDurationDelta } from "@/lib/agent/replan-strategy"` |

```ts
const newDuration = applyDurationDelta(90, -30); // 60
```

---

## lib/agent/run-week1.ts

### `runWeek1Agent`

| 项 | 说明 |
|---|---|
| 功能 | agent 主流程编排：解析输入 → 读记忆 → 取天气 → 生成计划 → POI 检查 → 重规划 → 返回结果 |
| 参数 | `userInput: string, options?: { userId?: string, onProgress?: (event: AgentProgressEvent) => void }` |
| 返回 | `Promise<PlanResult>` |
| 调用方式 | `import { runWeek1Agent } from "@/lib/agent/run-week1"` |

```ts
const result = await runWeek1Agent("我想在上海度过艺术感下午", {
  userId: "user-123",
  onProgress: (event) => console.log(event),
});
```

**`AgentProgressEvent` 类型：**

| type | 说明 |
|---|---|
| `stage` | 流程阶段推进，含 stage 名称和 detail 描述 |
| `model_chunk` | LLM 流式输出的文本片段 |
| `final` | 流程完成，含完整 PlanResult |

---

## lib/agent/tools/weather.ts

### `getMockWeather`

| 项 | 说明 |
|---|---|
| 功能 | 根据目标参数哈希生成确定性模拟天气（离线/测试用） |
| 参数 | `goal: ClarifiedGoal` |
| 返回 | `WeatherSnapshot` |
| 调用方式 | `import { getMockWeather } from "@/lib/agent/tools/weather"` |

```ts
const weather = getMockWeather(clarified);
```

### `getWeather`

| 项 | 说明 |
|---|---|
| 功能 | 调用 Open-Meteo API 获取真实天气，失败或离线时回退到 mock |
| 参数 | `goal: ClarifiedGoal` |
| 返回 | `Promise<WeatherSnapshot>` |
| 调用方式 | `import { getWeather } from "@/lib/agent/tools/weather"` |

```ts
const weather = await getWeather(clarified);
```

---

## lib/agent/tools/poi.ts

### `checkPoiAvailability`

| 项 | 说明 |
|---|---|
| 功能 | 检查行程步骤的地点是否可用，依次尝试高德 API、OSM API，全部失败回退 mock |
| 参数 | `{ goal: ClarifiedGoal, step: PlanStep, weather: WeatherSnapshot }` |
| 返回 | `Promise<PoiCheckResult>` — 含 available、reason、latitude、longitude、source、provider |
| 调用方式 | `import { checkPoiAvailability } from "@/lib/agent/tools/poi"` |

```ts
const check = await checkPoiAvailability({ goal, step, weather });
if (!check.available) replan(check.reason);
```

---

## lib/auth/password.ts

### `hashPassword`

| 项 | 说明 |
|---|---|
| 功能 | 用 scrypt + 随机 salt 对密码哈希 |
| 参数 | `plain: string` |
| 返回 | `Promise<string>` — 格式 `scrypt$salt$hash` |
| 调用方式 | `import { hashPassword } from "@/lib/auth/password"` |

```ts
const hash = await hashPassword("mypassword");
```

### `verifyPassword`

| 项 | 说明 |
|---|---|
| 功能 | 时序安全地验证明文密码与存储哈希是否匹配 |
| 参数 | `plain: string, stored: string` |
| 返回 | `Promise<boolean>` |
| 调用方式 | `import { verifyPassword } from "@/lib/auth/password"` |

```ts
const ok = await verifyPassword("mypassword", storedHash);
```

---

## lib/auth/token.ts

### `issueAuthToken`

| 项 | 说明 |
|---|---|
| 功能 | 签发 HS256 JWT，payload 含用户 ID、角色等 |
| 参数 | `user: AuthUser, ttl?: number`（秒，默认读环境变量） |
| 返回 | `string` — JWT token |
| 调用方式 | `import { issueAuthToken } from "@/lib/auth/token"` |

```ts
const token = issueAuthToken(user);
```

### `verifyAuthToken`

| 项 | 说明 |
|---|---|
| 功能 | 验证 JWT 签名和过期时间 |
| 参数 | `token: string` |
| 返回 | `AuthTokenPayload \| null` |
| 调用方式 | `import { verifyAuthToken } from "@/lib/auth/token"` |

```ts
const payload = verifyAuthToken(token);
```

---

## lib/auth/request.ts

### `parseBearerToken`

| 项 | 说明 |
|---|---|
| 功能 | 从 Authorization 头提取 Bearer token 字符串 |
| 参数 | `request: Request` |
| 返回 | `string \| null` |

### `readAuthPayload`

| 项 | 说明 |
|---|---|
| 功能 | 解析并验证请求中的 Bearer token，不抛错 |
| 参数 | `request: Request` |
| 返回 | `AuthTokenPayload \| null` |

### `requireAuthPayload`

| 项 | 说明 |
|---|---|
| 功能 | 同 readAuthPayload，但无有效 token 时抛出 `"unauthorized"` |
| 参数 | `request: Request` |
| 返回 | `AuthTokenPayload` |

### `readClientIp`

| 项 | 说明 |
|---|---|
| 功能 | 从 x-forwarded-for 或 x-real-ip 头读取客户端 IP |
| 参数 | `request: Request` |
| 返回 | `string \| null` |

### `readUserAgent`

| 项 | 说明 |
|---|---|
| 功能 | 读取请求的 user-agent 头 |
| 参数 | `request: Request` |
| 返回 | `string \| null` |

```ts
import { readAuthPayload, requireAuthPayload, readClientIp } from "@/lib/auth/request";
```

---

## lib/auth/repository.ts

### `ensureAuthSchema`

| 项 | 说明 |
|---|---|
| 功能 | 幂等建表 auth_users，并按环境变量初始化 admin 账号 |
| 参数 | 无 |
| 返回 | `Promise<void>` |

### `createUser`

| 项 | 说明 |
|---|---|
| 功能 | 插入新用户行，返回含密码哈希的完整记录 |
| 参数 | `data: CreateUserInput` |
| 返回 | `Promise<AuthUserWithPassword>` |

### `findUserByIdentifier`

| 项 | 说明 |
|---|---|
| 功能 | 按邮箱或用户名（大小写不敏感）查找用户 |
| 参数 | `identifier: string` |
| 返回 | `Promise<AuthUserWithPassword \| null>` |

### `findUserById`

| 项 | 说明 |
|---|---|
| 功能 | 按 UUID 查找用户 |
| 参数 | `id: string` |
| 返回 | `Promise<AuthUserWithPassword \| null>` |

### `listUsers`

| 项 | 说明 |
|---|---|
| 功能 | 分页返回用户列表，不含密码哈希 |
| 参数 | `{ limit?: number, offset?: number }` |
| 返回 | `Promise<AuthUser[]>` |

### `updateUser`

| 项 | 说明 |
|---|---|
| 功能 | 部分更新用户字段（用户名、邮箱、角色、状态、密码哈希） |
| 参数 | `id: string, fields: Partial<UpdateUserInput>` |
| 返回 | `Promise<AuthUser \| null>` |

### `updateLastLogin`

| 项 | 说明 |
|---|---|
| 功能 | 将指定用户的 last_login_at 更新为当前时间 |
| 参数 | `id: string` |
| 返回 | `Promise<void>` |

### `deleteUser`

| 项 | 说明 |
|---|---|
| 功能 | 按 ID 删除用户 |
| 参数 | `id: string` |
| 返回 | `Promise<boolean>` — 实际删除了行则为 true |

### `toSafeUser`

| 项 | 说明 |
|---|---|
| 功能 | 从 AuthUserWithPassword 中剥离密码哈希，返回公开安全的 AuthUser |
| 参数 | `user: AuthUserWithPassword` |
| 返回 | `AuthUser` |

```ts
import { createUser, findUserByIdentifier, toSafeUser } from "@/lib/auth/repository";
```

---

## lib/db/postgres.ts

### `getPgPool`

| 项 | 说明 |
|---|---|
| 功能 | 返回 pg.Pool 单例，首次调用时从 DATABASE_URL 创建连接池 |
| 参数 | 无 |
| 返回 | `pg.Pool` |
| 调用方式 | `import { getPgPool } from "@/lib/db/postgres"` |

```ts
const pool = getPgPool();
const result = await pool.query("SELECT 1");
```

---

## lib/user/repository.ts

### `ensureUserDataSchema`

| 项 | 说明 |
|---|---|
| 功能 | 幂等建表：user_profiles、user_sessions、plan_histories、user_feedback |
| 参数 | 无 |
| 返回 | `Promise<void>` |

### `getUserProfile`

| 项 | 说明 |
|---|---|
| 功能 | 获取用户画像行，不存在时自动创建 |
| 参数 | `userId: string` |
| 返回 | `Promise<UserProfile>` |

### `updateUserProfile`

| 项 | 说明 |
|---|---|
| 功能 | 部分更新用户画像字段 |
| 参数 | `userId: string, fields: Partial<UserProfileUpdate>` |
| 返回 | `Promise<UserProfile>` |

### `createUserSession`

| 项 | 说明 |
|---|---|
| 功能 | 插入新 session，token 以 SHA-256 哈希存储 |
| 参数 | `data: CreateSessionInput` |
| 返回 | `Promise<UserSession>` |

### `listUserSessions`

| 项 | 说明 |
|---|---|
| 功能 | 返回该用户最近的 session 列表，按创建时间倒序 |
| 参数 | `userId: string` |
| 返回 | `Promise<UserSession[]>` |

### `createPlanHistory`

| 项 | 说明 |
|---|---|
| 功能 | 将一次完整的 agent 规划结果存入 plan_histories |
| 参数 | `data: { userId, prompt, plannerSource, summary, result }` |
| 返回 | `Promise<PlanHistoryRecord>` |

### `listPlanHistories`

| 项 | 说明 |
|---|---|
| 功能 | 分页返回用户的历史规划记录 |
| 参数 | `userId: string, { limit?: number, offset?: number }` |
| 返回 | `Promise<PlanHistoryRecord[]>` |

### `deletePlanHistory`

| 项 | 说明 |
|---|---|
| 功能 | 删除指定用户的某条历史规划（校验归属） |
| 参数 | `userId: string, id: string` |
| 返回 | `Promise<boolean>` |

### `createUserFeedbackRecord`

| 项 | 说明 |
|---|---|
| 功能 | 插入一条 feedback 记录（喜好风格、地点黑名单、出行偏好） |
| 参数 | `data: CreateFeedbackInput` |
| 返回 | `Promise<UserFeedbackRecord>` |

### `listUserFeedbackRecords`

| 项 | 说明 |
|---|---|
| 功能 | 分页返回用户的 feedback 历史 |
| 参数 | `userId: string, { limit?: number, offset?: number }` |
| 返回 | `Promise<UserFeedbackRecord[]>` |

### `clearUserData`

| 项 | 说明 |
|---|---|
| 功能 | 删除该用户的所有 feedback、历史规划和 session 数据 |
| 参数 | `userId: string` |
| 返回 | `Promise<void>` |

```ts
import { getUserProfile, createPlanHistory, clearUserData } from "@/lib/user/repository";
```