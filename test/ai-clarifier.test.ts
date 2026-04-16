import { describe, expect, it } from "vitest";

import { parseAiClarifierText } from "@/lib/agent/ai-clarifier";

describe("ai clarifier parser", () => {
  it("parses valid strict json", () => {
    const payload = parseAiClarifierText(
      JSON.stringify({
        city: "上海",
        timeframe: "today afternoon",
        vibes: ["art", "architecture"],
        mobility: "low",
        budget: "unknown",
        constraints: ["limit-walking"],
        missing: ["budget"],
        confidence: 0.88,
      }),
    );

    expect(payload).not.toBeNull();
    expect(payload?.city).toBe("上海");
    expect(payload?.mobility).toBe("low");
    expect(payload?.vibes.length).toBeGreaterThan(0);
  });

  it("rejects invalid enum values", () => {
    const payload = parseAiClarifierText(
      JSON.stringify({
        city: "上海",
        timeframe: "afternoon",
        vibes: ["art"],
        mobility: "easy",
        budget: "unknown",
        constraints: ["anything"],
        missing: [],
        confidence: 0.88,
      }),
    );

    expect(payload).toBeNull();
  });
});
