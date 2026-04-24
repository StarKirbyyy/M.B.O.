import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { beforeEach, describe, expect, it } from "vitest";

import { runAgent } from "@/lib/agent/runtime/run-agent";
import { runCompatAgent } from "@/lib/agent/runtime/run-compat-agent";

describe("city agent runtime offline", () => {
  beforeEach(async () => {
    process.env.AGENT_OFFLINE_ONLY = "true";
    process.env.SILICONFLOW_API_KEY = "";
    process.env.SILICONFLOW_MODEL = "";

    const dir = await mkdtemp(join(tmpdir(), "mbo-agent-test-"));
    process.env.USER_MEMORY_PATH = join(dir, "memory.json");
  });

  it("returns a complete run result without network", async () => {
    const result = await runAgent("我想在上海过一个轻松下午", { userId: "t1" });

    expect(result.userId).toBe("t1");
    expect(result.finalPlan.length).toBeGreaterThanOrEqual(3);
    expect(result.events.some((item) => item.type === "stage_started" && item.stage === "understand")).toBe(true);
    expect(result.events.some((item) => item.type === "stage_started" && item.stage === "finalize")).toBe(true);
    expect(result.evaluationArtifacts.expectedTaskType).toBe("city-itinerary");
  });

  it("keeps the timeline compatibility adapter working", async () => {
    const result = await runCompatAgent("我想在上海过一个轻松下午", { userId: "t2" });

    expect(result.userId).toBe("t2");
    expect(result.plan.length).toBeGreaterThanOrEqual(3);
    expect(result.timeline.some((item) => item.stage === "MEMORY_READ")).toBe(true);
  });
});
