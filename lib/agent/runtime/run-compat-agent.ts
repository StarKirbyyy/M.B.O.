import { runAgent } from "@/lib/agent/runtime/run-agent";
import type { AgentRunEvent, PlanResult } from "@/lib/agent/types";

export type AgentProgressEvent =
  | {
      type: "stage";
      stage: PlanResult["timeline"][number]["stage"];
      detail: string;
      payload?: Record<string, unknown>;
    }
  | {
      type: "final";
      result: PlanResult;
    };

interface RunCompatOptions {
  onProgress?: (event: AgentProgressEvent) => void;
  userId?: string;
}

function toTimelineProgressEvent(event: AgentRunEvent): AgentProgressEvent | null {
  if (event.type !== "stage_started" && event.type !== "thought_generated" && event.type !== "run_completed") {
    return null;
  }

  if (event.type === "run_completed") {
    return {
      type: "final",
      result: event.result,
    };
  }

  const stageMap = {
    understand: "CLARIFY",
    plan: "PLAN",
    act: "TOOL_POI",
    observe: "TOOL_POI",
    reflect: "REPLAN",
    finalize: "PLAN",
  } satisfies Record<string, PlanResult["timeline"][number]["stage"]>;

  return {
    type: "stage",
    stage: stageMap[event.stage],
    detail: event.type === "stage_started" ? event.detail : event.summary,
  };
}

export async function runCompatAgent(userInput: string, options?: RunCompatOptions): Promise<PlanResult> {
  const result = await runAgent(userInput, {
    userId: options?.userId,
    onEvent(event) {
      const mapped = toTimelineProgressEvent(event);
      if (mapped) {
        options?.onProgress?.(mapped);
      }
    },
  });

  options?.onProgress?.({
    type: "final",
    result,
  });

  return result;
}
