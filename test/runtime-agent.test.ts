import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { beforeEach, describe, expect, it } from "vitest";

import { buildMemoryContext } from "@/lib/agent/memory/context";
import { writeUserFeedback } from "@/lib/agent/memory";
import { toOutcomeEvalRecord, toProcessEvalRecord } from "@/lib/agent/eval/records";
import { poiSearchTool } from "@/lib/agent/tools/poi-search-tool";
import { poiValidateTool } from "@/lib/agent/tools/poi-validate-tool";
import { weatherTool } from "@/lib/agent/tools/weather-tool";
import { runFallbackAgent } from "@/lib/agent/runtime/run-fallback-agent";
import { runAgent } from "@/lib/agent/runtime/run-agent";

describe("runtime behavior", () => {
  beforeEach(async () => {
    process.env.AGENT_OFFLINE_ONLY = "true";
    process.env.SILICONFLOW_API_KEY = "";
    process.env.SILICONFLOW_MODEL = "";

    const dir = await mkdtemp(join(tmpdir(), "mbo-agent-runtime-"));
    process.env.USER_MEMORY_PATH = join(dir, "memory.json");
  });

  it("exposes standardized tools with offline fallback", async () => {
    const weather = await weatherTool.execute({
      intent: {
        rawInput: "上海轻松下午",
        city: "上海",
        timeframe: "today afternoon",
        vibes: ["art"],
        mobility: "low",
        budget: "unknown",
        constraints: [],
        missing: ["budget"],
      },
    });
    const search = await poiSearchTool.execute({
      city: "上海",
      query: "西岸美术馆",
    });
    const check = await poiValidateTool.execute({
      step: {
        id: "step-1",
        time: "14:00",
        place: "外滩历史建筑群",
        action: "步行观察城市界面",
        vibe: "architecture",
        mode: "walk",
        durationMinutes: 60,
        reason: "test",
        indoor: false,
      },
      weather: {
        ...weather,
        condition: "rainy",
      },
      search,
    });

    expect(weather.ok).toBe(true);
    expect(search.provider).toBe("mock");
    expect(check.reason).toBe("weather_risky_for_outdoor");
  });

  it("applies memory and exports evaluation records", async () => {
    await writeUserFeedback("memory-user", {
      likedVibes: ["art"],
      dislikedPlaces: ["武康路街区"],
      preferredMobility: "low",
    });

    const context = await buildMemoryContext("memory-user", {
      rawInput: "我想在上海过一个下午",
      city: "上海",
      timeframe: "today afternoon",
      vibes: ["city-walk"],
      mobility: "medium",
      budget: "unknown",
      constraints: [],
      missing: ["budget"],
    });

    expect(context.snapshot.dislikedPlaces).toContain("武康路街区");
    expect(context.effectiveIntent.mobility).toBe("low");
    expect(context.effectiveIntent.vibes).toContain("art");

    const run = await runAgent("我想在上海过一个轻松下午", { userId: "memory-user", maxReplans: 1 });
    expect(run.toolCalls.length).toBeGreaterThan(0);
    expect(run.evaluationArtifacts.judgeReadyTranscript).toContain("finalPlan");
    expect(toProcessEvalRecord(run).expectedTaskType).toBe("city-itinerary");
    expect(toOutcomeEvalRecord(run).completionStatus).toBeTruthy();
  });

  it("returns a stable fallback result", async () => {
    const run = await runFallbackAgent("我想在上海过一个轻松下午", {
      runId: "fallback-test",
      userId: "fallback-user",
    });

    expect(run.status).toBe("completed");
    expect(run.finalPlan.length).toBeGreaterThanOrEqual(3);
    expect(run.finalAnswer).toContain("确定性恢复引擎");
    expect(run.evaluationArtifacts.completionStatus).toBe("degraded");
  });
});
