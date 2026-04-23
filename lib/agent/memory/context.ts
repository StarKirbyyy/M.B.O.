import { getTopVibes, readUserMemory } from "@/lib/agent/memory";
import type { ClarifiedIntent, MemorySnapshot } from "@/lib/agent/types";

export interface MemoryContext {
  snapshot: MemorySnapshot;
  effectiveIntent: ClarifiedIntent;
}

export async function buildMemoryContext(userId: string, intent: ClarifiedIntent): Promise<MemoryContext> {
  const profile = await readUserMemory(userId);
  const topVibes = getTopVibes(profile, 2);
  const dislikedPlaces = profile.dislikedPlaces ?? [];

  const effectiveIntent: ClarifiedIntent = {
    ...intent,
    vibes: [...intent.vibes],
  };

  for (const vibe of topVibes) {
    if (!effectiveIntent.vibes.includes(vibe)) {
      effectiveIntent.vibes.push(vibe);
    }
  }

  if (effectiveIntent.mobility === "medium" && profile.preferredMobility) {
    effectiveIntent.mobility = profile.preferredMobility;
  }

  return {
    snapshot: {
      userId,
      preferredMobility: profile.preferredMobility,
      topVibes,
      dislikedPlaces,
    },
    effectiveIntent,
  };
}
