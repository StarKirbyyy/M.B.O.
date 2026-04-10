import { describe, expect, it } from "vitest";

import { applyDurationDelta, getReplanStrategy } from "@/lib/agent/replan-strategy";

describe("replan strategy", () => {
  it("returns memory disliked strategy", () => {
    const strategy = getReplanStrategy("memory_disliked_place");

    expect(strategy.id).toBe("memory-disliked-replace");
    expect(strategy.shouldReplace).toBe(true);
  });

  it("applies duration floor", () => {
    expect(applyDurationDelta(50, -30)).toBe(40);
  });
});
