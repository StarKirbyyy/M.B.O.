import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { beforeEach, describe, expect, it } from "vitest";

import { getTopVibes, readUserMemory, writeUserFeedback } from "@/lib/agent/memory";

describe("user memory", () => {
  beforeEach(async () => {
    const dir = await mkdtemp(join(tmpdir(), "mbo-memory-test-"));
    process.env.USER_MEMORY_PATH = join(dir, "memory.json");
  });

  it("persists feedback and reads it back", async () => {
    await writeUserFeedback("u1", {
      likedVibes: ["art"],
      dislikedPlaces: ["X Place"],
      preferredMobility: "low",
    });

    const memory = await readUserMemory("u1");
    expect(memory.vibeScores.art).toBeGreaterThan(0);
    expect(memory.dislikedPlaces).toContain("X Place");
    expect(memory.preferredMobility).toBe("low");
    expect(getTopVibes(memory)).toContain("art");
  });
});
