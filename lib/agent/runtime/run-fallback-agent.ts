import { clarifyGoal } from "@/lib/agent/clarifier";
import { summarizeCityPlan, buildCityPlan, buildReplacementCityStep } from "@/lib/agent/domain/city/plan-policy";
import { toProcessEvalRecord } from "@/lib/agent/eval/records";
import { buildMemoryContext } from "@/lib/agent/memory/context";
import { getWeather } from "@/lib/agent/tools/weather";
import { checkPoiAvailability } from "@/lib/agent/tools/poi";
import { resolveReplan } from "@/lib/agent/runtime/replan-policy";
import type { AgentRunEvent, AgentRunResult } from "@/lib/agent/types";

interface RunFallbackOptions {
  runId: string;
  userId: string;
  maxReplans?: number;
  onEvent?: (event: AgentRunEvent) => void;
}

function nowIso(): string {
  return new Date().toISOString();
}

function pushTimeline(
  timeline: AgentRunResult["timeline"],
  stage: AgentRunResult["timeline"][number]["stage"],
  detail: string,
  payload?: Record<string, unknown>,
) {
  timeline.push({ stage, detail, payload });
}

export async function runFallbackAgent(input: string, options: RunFallbackOptions): Promise<AgentRunResult> {
  const { runId, userId, onEvent } = options;
  const maxReplans = options.maxReplans ?? 2;
  const startedAt = Date.now();
  const events: AgentRunEvent[] = [];
  const toolCalls: AgentRunResult["toolCalls"] = [];
  const replans: AgentRunResult["replans"] = [];
  const poiChecks: AgentRunResult["poiChecks"] = [];
  const mapPoints: AgentRunResult["mapPoints"] = [];
  const timeline: AgentRunResult["timeline"] = [];
  const corrections: AgentRunResult["corrections"] = [];

  const emit = (event: AgentRunEvent) => {
    events.push(event);
    onEvent?.(event);
  };

  const clarified = clarifyGoal(input);

  emit({
    type: "stage_started",
    runId,
    stage: "understand",
    detail: "主 runtime 不可用，切换到确定性恢复引擎。",
    timestamp: nowIso(),
  });
  pushTimeline(timeline, "INPUT", "收到用户输入，进入确定性恢复引擎。", { input });
  pushTimeline(timeline, "MODEL_CLARIFY", "恢复引擎完成规则意图澄清。", {
    city: clarified.city,
    source: "rule",
  });
  pushTimeline(timeline, "CLARIFY", "完成目标澄清。", {
    city: clarified.city,
    vibes: clarified.vibes,
    mobility: clarified.mobility,
    missing: clarified.missing,
  });

  const memoryContext = await buildMemoryContext(userId, clarified);
  pushTimeline(timeline, "MEMORY_READ", "已读取长期记忆并合并到恢复上下文。", {
    topVibes: memoryContext.snapshot.topVibes,
    dislikedPlacesCount: memoryContext.snapshot.dislikedPlaces.length,
  });

  const weather = await getWeather(memoryContext.effectiveIntent);
  toolCalls.push({
    toolCallId: `${runId}-fallback-weather`,
    toolName: "weather",
    args: {
      city: memoryContext.effectiveIntent.city,
    },
    result: weather as unknown as Record<string, unknown>,
    durationMs: 0,
    success: true,
  });
  pushTimeline(timeline, "TOOL_WEATHER", "调用天气工具完成环境感知。", {
    condition: weather.condition,
    source: weather.source ?? "unknown",
  });

  let plannerSource: AgentRunResult["plannerSource"] = "rule";
  const cityPlan = await buildCityPlan({
    intent: memoryContext.effectiveIntent,
    weather,
  });
  const initialPlan = cityPlan.steps;
  plannerSource = cityPlan.source;

  pushTimeline(timeline, "MODEL_PLAN", "恢复引擎已生成初始计划。", {
    source: plannerSource,
    stepCount: initialPlan.length,
  });
  pushTimeline(timeline, "PLAN", "完成初始计划生成。", {
    source: plannerSource,
    stepCount: initialPlan.length,
  });

  const finalPlan = [...initialPlan];
  const usedPlaces = new Set(finalPlan.map((step) => step.place));
  let remainingReplans = maxReplans;

  for (let index = 0; index < finalPlan.length; index += 1) {
    const step = finalPlan[index];
    const poiCheck = memoryContext.snapshot.dislikedPlaces.includes(step.place)
      ? {
          stepId: step.id,
          place: step.place,
          available: false,
          reason: "memory_disliked_place",
          source: "memory" as const,
        }
      : await checkPoiAvailability({
          goal: memoryContext.effectiveIntent,
          step,
          weather,
        });

    poiChecks.push(poiCheck);
    toolCalls.push({
      toolCallId: `${runId}-fallback-poi-${index + 1}`,
      toolName: "poi_validate",
      args: {
        stepId: step.id,
        place: step.place,
      },
      result: poiCheck as unknown as Record<string, unknown>,
      durationMs: 0,
      success: true,
    });
    pushTimeline(timeline, "TOOL_POI", `检查点位可用性：${step.place}`, {
      available: poiCheck.available,
      reason: poiCheck.reason,
      provider: poiCheck.provider ?? "unknown",
    });

    if (typeof poiCheck.latitude === "number" && typeof poiCheck.longitude === "number") {
      mapPoints.push({
        stepId: step.id,
        order: index + 1,
        place: step.place,
        latitude: poiCheck.latitude,
        longitude: poiCheck.longitude,
        provider: poiCheck.provider,
      });
    }

    if (!poiCheck.available && remainingReplans > 0) {
      emit({
        type: "replan_requested",
        runId,
        stepId: step.id,
        reason: poiCheck.reason,
        strategyId: "fallback-rule-policy",
        timestamp: nowIso(),
      });

      const replacement = buildReplacementCityStep({
        intent: memoryContext.effectiveIntent,
        weather,
        originalStep: step,
        usedPlaces,
        forceIndoor: poiCheck.reason === "weather_risky_for_outdoor",
      });
      const resolved = resolveReplan({
        issue: poiCheck,
        currentStep: step,
        replacement,
      });

      finalPlan[index] = resolved.nextStep;
      replans.push(resolved.record);
      corrections.push({
        stepId: step.id,
        strategyId: resolved.record.strategyId,
        action: replacement ? "replace-and-duration-adjust" : "duration-adjust",
        oldPlace: resolved.record.oldPlace,
        newPlace: resolved.record.newPlace,
        oldDurationMinutes: resolved.record.oldDurationMinutes,
        newDurationMinutes: resolved.record.newDurationMinutes,
        reason: resolved.record.reason,
      });
      pushTimeline(timeline, "REPLAN", `恢复引擎触发重规划：${step.place}`, {
        strategyId: resolved.record.strategyId,
        reason: resolved.record.reason,
      });
      emit({
        type: "replan_applied",
        runId,
        stepId: step.id,
        reason: poiCheck.reason,
        strategyId: resolved.record.strategyId,
        oldPlace: resolved.record.oldPlace,
        newPlace: resolved.record.newPlace,
        timestamp: nowIso(),
      });
      remainingReplans -= 1;
      usedPlaces.add(finalPlan[index].place);
    }
  }

  const traceSummary =
    replans.length > 0
      ? `${summarizeCityPlan(memoryContext.effectiveIntent, weather)} 已通过确定性恢复引擎触发 ${replans.length} 次修正。`
      : `${summarizeCityPlan(memoryContext.effectiveIntent, weather)} 当前由确定性恢复引擎稳定返回。`;

  const finalAnswer = [
    `已为你整理一条 ${memoryContext.effectiveIntent.city} 的城市深度游路线。`,
    finalPlan.map((step, index) => `${index + 1}. ${step.time} ${step.place}`).join(" "),
    "当前结果由确定性恢复引擎输出。",
  ].join(" ");

  const result: AgentRunResult = {
    runId,
    userId,
    input,
    status: "completed",
    clarifiedIntent: memoryContext.effectiveIntent,
    finalPlan,
    finalAnswer,
    traceSummary,
    toolCalls,
    replans,
    memoryApplied: memoryContext.snapshot,
    weather,
    mapPoints,
    evaluationArtifacts: {
      input,
      expectedTaskType: "city-itinerary",
      steps: timeline.map((item, index) => ({
        id: `fallback-${index + 1}`,
        stage:
          item.stage === "REPLAN"
            ? "reflect"
            : item.stage === "TOOL_POI"
              ? "observe"
              : item.stage === "TOOL_WEATHER"
                ? "plan"
                : item.stage === "PLAN" || item.stage === "MODEL_PLAN"
                  ? "plan"
                  : "understand",
        type: item.stage,
        summary: item.detail,
      })),
      toolSuccessRate: toolCalls.length > 0 ? 1 : 0,
      latencyMs: Date.now() - startedAt,
      completionStatus: "degraded",
      judgeReadyTranscript: [
        `input=${input}`,
        "engine=recovery",
        `intent=${JSON.stringify(memoryContext.effectiveIntent)}`,
        `plan=${JSON.stringify(finalPlan)}`,
        `replans=${JSON.stringify(replans)}`,
      ].join("\n"),
      replanCount: replans.length,
      failureReasons: poiChecks.filter((item) => !item.available).map((item) => item.reason),
    },
    events,
    plannerSource,
    clarified: memoryContext.effectiveIntent,
    memory: memoryContext.snapshot,
    initialPlan,
    plan: finalPlan,
    poiChecks,
    corrections,
    summary: traceSummary,
    timeline,
  };

  return {
    ...result,
    evaluationArtifacts: toProcessEvalRecord(result),
  };
}
