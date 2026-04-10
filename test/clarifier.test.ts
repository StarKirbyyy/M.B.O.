import { describe, expect, it } from "vitest";

import { clarifyGoal } from "@/lib/agent/clarifier";

describe("clarifyGoal", () => {
  it("detects explicit city and avoids defaulting to Shanghai", () => {
    const goal = clarifyGoal("我想在南京体验古建筑，不想太累");

    expect(goal.city).toBe("南京");
    expect(goal.mobility).toBe("low");
    expect(goal.vibes).toContain("architecture");
  });

  it("keeps fallback city when no city is present", () => {
    const goal = clarifyGoal("想找个有艺术感的下午");

    expect(goal.city).toBe("上海");
  });
});
