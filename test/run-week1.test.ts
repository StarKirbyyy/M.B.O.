import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { beforeEach, describe, expect, it } from "vitest";

import { runWeek1Agent } from "@/lib/agent/run-week1";

describe("runWeek1Agent offline", () => {
  beforeEach(async () => {
    process.env.AGENT_OFFLINE_ONLY = "true";
    process.env.SILICONFLOW_API_KEY = "";
    process.env.SILICONFLOW_MODEL = "";

    const dir = await mkdtemp(join(tmpdir(), "mbo-agent-test-"));
    process.env.USER_MEMORY_PATH = join(dir, "memory.json");
  });

  it("returns a complete plan without network", async () => {
    const result = await runWeek1Agent("我想在上海过一个轻松下午", { userId: "t1" });

    expect(result.userId).toBe("t1");
    expect(result.plan.length).toBeGreaterThanOrEqual(3);
    expect(result.timeline.some((item) => item.stage === "MEMORY_READ")).toBe(true);
  });
});
