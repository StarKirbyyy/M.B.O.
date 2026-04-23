import { randomUUID } from "node:crypto";

import { summarizeCityPlan, buildCityPlan, buildReplacementCityStep } from "@/lib/agent/domain/city/plan-policy";
import { parseCityIntent } from "@/lib/agent/domain/city/intent-parser";
import { buildMemoryContext } from "@/lib/agent/memory/context";
import { generateTextSummary } from "@/lib/agent/model/provider";
import { toProcessEvalRecord } from "@/lib/agent/eval/records";
import { runFallbackAgent } from "@/lib/agent/runtime/run-fallback-agent";
import { weatherTool } from "@/lib/agent/tools/weather-tool";
import { poiSearchTool } from "@/lib/agent/tools/poi-search-tool";
import { poiValidateTool } from "@/lib/agent/tools/poi-validate-tool";
import { resolveReplan } from "@/lib/agent/runtime/replan-policy";
import type {
  AgentRunEvent,
  AgentRunResult,
  AgentStage,
  EvaluationArtifacts,
  PoiCheck,
  ToolCallRecord,
} from "@/lib/agent/types";

interface RunAgentOptions {
  runId?: string;
  userId?: string;
  maxSteps?: number;
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

async function executeTool<TArgs extends object, TResult extends object>(params: {
  runId: string;
  stage: AgentStage;
  toolName: ToolCallRecord["toolName"];
  args: TArgs;
  execute: (args: TArgs) => Promise<TResult>;
  emit: (event: AgentRunEvent) => void;
  toolCalls: ToolCallRecord[];
}): Promise<TResult> {
  const toolCallId = randomUUID();
  const startedAt = Date.now();

  params.emit({
    type: "tool_called",
    runId: params.runId,
      stage: params.stage,
      toolCallId,
      toolName: params.toolName,
      args: params.args as Record<string, unknown>,
      timestamp: nowIso(),
    });

  try {
    const result = await params.execute(params.args);
    const durationMs = Date.now() - startedAt;
    const record: ToolCallRecord = {
      toolCallId,
      toolName: params.toolName,
      args: params.args as Record<string, unknown>,
      result: result as Record<string, unknown>,
      durationMs,
      success: true,
    };
    params.toolCalls.push(record);
    params.emit({
      type: "tool_result",
      runId: params.runId,
      stage: params.stage,
      toolCallId,
      toolName: params.toolName,
      success: true,
      durationMs,
      result: result as Record<string, unknown>,
      timestamp: nowIso(),
    });
    return result;
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const errorType = error instanceof Error ? error.name : "ToolExecutionError";
    const result = {
      ok: false,
      error: error instanceof Error ? error.message : "unknown error",
    } as unknown as TResult;
    params.toolCalls.push({
      toolCallId,
      toolName: params.toolName,
      args: params.args as Record<string, unknown>,
      result: result as Record<string, unknown>,
      durationMs,
      success: false,
      errorType,
    });
    params.emit({
      type: "tool_result",
      runId: params.runId,
      stage: params.stage,
      toolCallId,
      toolName: params.toolName,
      success: false,
      durationMs,
      result: result as Record<string, unknown>,
      errorType,
      timestamp: nowIso(),
    });
    return result;
  }
}

export async function runAgent(input: string, options: RunAgentOptions = {}): Promise<AgentRunResult> {
  const runId = options.runId ?? randomUUID();
  const userId = options.userId?.trim() || "local-user";
  const maxSteps = options.maxSteps ?? 6;
  const maxReplans = options.maxReplans ?? 2;
  const createdAt = nowIso();
  const startedAt = Date.now();
  const toolCalls: ToolCallRecord[] = [];
  const replans: AgentRunResult["replans"] = [];
  const poiChecks: AgentRunResult["poiChecks"] = [];
  const mapPoints: AgentRunResult["mapPoints"] = [];
  const timeline: AgentRunResult["timeline"] = [];
  const correctionRecords: AgentRunResult["corrections"] = [];
  const events: AgentRunEvent[] = [];

  const emit = (event: AgentRunEvent) => {
    events.push(event);
    options.onEvent?.(event);
  };

  emit({
    type: "run_started",
    runId,
    status: "running",
    input,
    userId,
    createdAt,
  });
  pushTimeline(timeline, "INPUT", "收到用户输入，开始建立运行上下文。", { input });

  try {
    emit({
      type: "stage_started",
      runId,
      stage: "understand",
      detail: "解析用户意图并加载长期记忆。",
      timestamp: nowIso(),
    });
    const parsed = await parseCityIntent(input);
    emit({
      type: "thought_generated",
      runId,
      stage: "understand",
      summary: `已识别城市 ${parsed.intent.city}，偏好 ${parsed.intent.vibes.join("/")}`,
      confidence: parsed.intent.confidence,
      timestamp: nowIso(),
    });
    pushTimeline(
      timeline,
      "MODEL_CLARIFY",
      parsed.source === "model" ? "模型完成结构化意图抽取。" : "未启用模型或抽取失败，回退规则解析。",
      { source: parsed.source },
    );
    pushTimeline(timeline, "CLARIFY", "完成目标澄清。", {
      city: parsed.intent.city,
      vibes: parsed.intent.vibes,
      mobility: parsed.intent.mobility,
      missing: parsed.intent.missing,
    });

    const memoryContext = await buildMemoryContext(userId, parsed.intent);
    pushTimeline(timeline, "MEMORY_READ", "已读取用户长期偏好记忆。", {
      userId,
      topVibes: memoryContext.snapshot.topVibes,
      dislikedPlacesCount: memoryContext.snapshot.dislikedPlaces.length,
      preferredMobility: memoryContext.snapshot.preferredMobility ?? "none",
    });

    emit({
      type: "thought_generated",
      runId,
      stage: "understand",
      summary: `已加载记忆，负反馈地点 ${memoryContext.snapshot.dislikedPlaces.length} 个。`,
      timestamp: nowIso(),
    });

    emit({
      type: "stage_started",
      runId,
      stage: "plan",
      detail: "获取天气并生成高层计划。",
      timestamp: nowIso(),
    });

    const weather = await executeTool({
      runId,
      stage: "plan",
      toolName: "weather",
      args: {
        intent: memoryContext.effectiveIntent,
      },
      execute: weatherTool.execute,
      emit,
      toolCalls,
    });
    pushTimeline(timeline, "TOOL_WEATHER", "调用天气工具完成环境感知。", {
      condition: weather.condition,
      temperatureC: weather.temperatureC,
      source: weather.source ?? "unknown",
    });

    const planBuild = await buildCityPlan({
      intent: memoryContext.effectiveIntent,
      weather,
    });
    const initialPlan = planBuild.steps.slice(0, 3);
    emit({
      type: "thought_generated",
      runId,
      stage: "plan",
      summary: `已生成 ${initialPlan.length} 步高层计划。`,
      confidence: planBuild.confidence,
      timestamp: nowIso(),
    });
    pushTimeline(
      timeline,
      "MODEL_PLAN",
      planBuild.source === "siliconflow" ? "模型已生成计划草案。" : "未启用模型或计划生成失败，回退规则规划。",
      { source: planBuild.source },
    );
    pushTimeline(timeline, "PLAN", "高层计划已经就绪。", {
      stepCount: initialPlan.length,
      source: planBuild.source,
    });

    emit({
      type: "stage_started",
      runId,
      stage: "act",
      detail: "执行工具调用，收集点位观测。",
      timestamp: nowIso(),
    });

    const finalPlan = [...initialPlan];
    const usedPlaces = new Set<string>(finalPlan.map((step) => step.place));
    let stepsExecuted = 0;
    let replanBudget = maxReplans;

    emit({
      type: "stage_started",
      runId,
      stage: "observe",
      detail: "验证点位可用性并汇总观测。",
      timestamp: nowIso(),
    });

    for (let index = 0; index < finalPlan.length; index += 1) {
      if (stepsExecuted >= maxSteps) {
        break;
      }

      const step = finalPlan[index];
      const disliked = memoryContext.snapshot.dislikedPlaces.includes(step.place);
      const search = await executeTool({
        runId,
        stage: "act",
        toolName: "poi_search",
        args: {
          city: memoryContext.effectiveIntent.city,
          query: step.place,
        },
        execute: poiSearchTool.execute,
        emit,
        toolCalls,
      });
      const check = disliked
        ? ({
            stepId: step.id,
            place: step.place,
            available: false,
            reason: "memory_disliked_place",
            source: "memory",
            displayName: search.displayName,
            latitude: search.latitude,
            longitude: search.longitude,
          } satisfies PoiCheck)
        : await executeTool({
            runId,
            stage: "observe",
            toolName: "poi_validate",
            args: {
              step,
              weather,
              search,
            },
            execute: poiValidateTool.execute,
            emit,
            toolCalls,
          });

      poiChecks.push(check);
      pushTimeline(timeline, "TOOL_POI", `完成点位检查：${step.place}`, {
        stepId: step.id,
        available: check.available,
        reason: check.reason,
        provider: check.provider ?? "unknown",
        source: check.source,
      });

      if (typeof check.latitude === "number" && typeof check.longitude === "number") {
        mapPoints.push({
          stepId: step.id,
          order: index + 1,
          place: step.place,
          latitude: check.latitude,
          longitude: check.longitude,
          provider: check.provider,
        });
      }

      stepsExecuted += 1;

      if (!check.available && replanBudget > 0) {
        emit({
          type: "stage_started",
          runId,
          stage: "reflect",
          detail: `步骤 ${step.id} 需要重规划。`,
          timestamp: nowIso(),
        });
        emit({
          type: "replan_requested",
          runId,
          stepId: step.id,
          reason: check.reason,
          strategyId: "rule-based",
          timestamp: nowIso(),
        });

        const replacement = buildReplacementCityStep({
          intent: memoryContext.effectiveIntent,
          weather,
          originalStep: step,
          usedPlaces,
          forceIndoor: check.reason === "weather_risky_for_outdoor",
        });
        const resolved = resolveReplan({
          issue: check,
          currentStep: step,
          replacement,
        });
        finalPlan[index] = resolved.nextStep;
        usedPlaces.add(resolved.nextStep.place);
        replans.push(resolved.record);
        correctionRecords.push({
          stepId: step.id,
          strategyId: resolved.record.strategyId,
          action: replacement ? "replace-and-duration-adjust" : "duration-adjust",
          oldPlace: resolved.record.oldPlace,
          newPlace: resolved.record.newPlace,
          oldDurationMinutes: resolved.record.oldDurationMinutes,
          newDurationMinutes: resolved.record.newDurationMinutes,
          reason: resolved.record.reason,
        });
        pushTimeline(
          timeline,
          "REPLAN",
          `步骤 ${step.id} 已触发重规划：${step.place}${resolved.record.newPlace ? ` -> ${resolved.record.newPlace}` : ""}`,
          {
            reason: check.reason,
            strategyId: resolved.record.strategyId,
          },
        );
        emit({
          type: "thought_generated",
          runId,
          stage: "reflect",
          summary: `检测到 ${check.reason}，已执行重规划。`,
          timestamp: nowIso(),
        });
        emit({
          type: "replan_applied",
          runId,
          stepId: step.id,
          reason: check.reason,
          strategyId: resolved.record.strategyId,
          oldPlace: resolved.record.oldPlace,
          newPlace: resolved.record.newPlace,
          timestamp: nowIso(),
        });
        replanBudget -= 1;
      }
    }

    emit({
      type: "stage_started",
      runId,
      stage: "finalize",
      detail: "生成最终答复与评测记录。",
      timestamp: nowIso(),
    });

    const summaryBase = summarizeCityPlan(memoryContext.effectiveIntent, weather);
    const traceSummary =
      replans.length > 0
        ? `${summaryBase} 已触发 ${replans.length} 次自我修正。`
        : `${summaryBase} 本次未触发重规划。`;

    const fallbackAnswer = [
      `已为你整理一条 ${memoryContext.effectiveIntent.city} 的城市深度游路线。`,
      `共 ${finalPlan.length} 步，当前天气为 ${weather.condition} ${weather.temperatureC}°C。`,
      finalPlan.map((step, index) => `${index + 1}. ${step.time} 在 ${step.place}，${step.action}`).join(" "),
    ].join(" ");
    const finalAnswer =
      (await generateTextSummary({
        system: "你是城市深度游 agent 的收束模块，请基于给定计划输出一段简洁、可执行、可解释的中文总结。",
        prompt: [
          `用户输入：${input}`,
          `城市：${memoryContext.effectiveIntent.city}`,
          `天气：${weather.condition} / ${weather.temperatureC}C`,
          `计划：${finalPlan.map((step) => `${step.time} ${step.place} ${step.action}`).join(" | ")}`,
          `trace summary: ${traceSummary}`,
        ].join("\n"),
      })) ?? fallbackAnswer;

    emit({
      type: "thought_generated",
      runId,
      stage: "finalize",
      summary: "最终答复已生成。",
      timestamp: nowIso(),
    });

    const evaluationArtifacts: EvaluationArtifacts = {
      input,
      expectedTaskType: "city-itinerary" as const,
      steps: events.map((event, index) => ({
        id: `evt-${index + 1}`,
        stage:
          event.type === "run_started"
            ? "understand"
            : event.type === "stage_started"
            ? event.stage
            : event.type === "thought_generated"
              ? event.stage
              : event.type === "tool_called" || event.type === "tool_result"
                ? event.stage
                : event.type === "replan_requested" || event.type === "replan_applied"
                  ? "reflect"
                  : "finalize",
        type: event.type,
        summary:
          event.type === "stage_started"
            ? event.detail
            : event.type === "thought_generated"
              ? event.summary
              : event.type === "tool_called"
                ? `调用工具 ${event.toolName}`
                : event.type === "tool_result"
                  ? `工具 ${event.toolName} ${event.success ? "成功" : "失败"}`
                  : event.type === "replan_requested"
                    ? `请求重规划：${event.reason}`
                    : event.type === "replan_applied"
                      ? `应用重规划：${event.reason}`
                      : event.type === "run_completed"
                        ? "运行完成"
                        : event.type === "run_failed"
                          ? event.message
                          : "运行开始",
      })),
      toolSuccessRate:
        toolCalls.length > 0 ? toolCalls.filter((item) => item.success).length / toolCalls.length : 1,
      latencyMs: Date.now() - startedAt,
      completionStatus: replans.length >= maxReplans ? "degraded" : "completed",
      judgeReadyTranscript: [
        `input=${input}`,
        `intent=${JSON.stringify(memoryContext.effectiveIntent)}`,
        `weather=${JSON.stringify(weather)}`,
        `toolCalls=${JSON.stringify(toolCalls)}`,
        `replans=${JSON.stringify(replans)}`,
        `finalPlan=${JSON.stringify(finalPlan)}`,
        `finalAnswer=${finalAnswer}`,
      ].join("\n"),
      replanCount: replans.length,
      failureReasons: poiChecks.filter((item) => !item.available).map((item) => item.reason),
    };

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
      evaluationArtifacts,
      events: [...events],
      plannerSource: planBuild.source,
      clarified: memoryContext.effectiveIntent,
      memory: memoryContext.snapshot,
      initialPlan,
      plan: finalPlan,
      poiChecks,
      corrections: correctionRecords,
      summary: traceSummary,
      timeline,
    };

    emit({
      type: "run_completed",
      runId,
      status: "completed",
      result: {
        ...result,
        evaluationArtifacts: toProcessEvalRecord(result),
      },
      timestamp: nowIso(),
    });

    return {
      ...result,
      evaluationArtifacts: toProcessEvalRecord(result),
      events: [...events],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    emit({
      type: "thought_generated",
      runId,
      stage: "reflect",
      summary: `主 runtime 失败，准备切换确定性恢复引擎：${message}`,
      timestamp: nowIso(),
    });
    try {
      const fallbackResult = await runFallbackAgent(input, {
        runId,
        userId,
        maxReplans,
        onEvent: options.onEvent,
      });
      return fallbackResult;
    } catch (fallbackError) {
      const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : "unknown fallback error";
      const failedIntent = {
        rawInput: input,
        city: "上海",
        timeframe: "today afternoon",
        vibes: ["city-walk"],
        mobility: "medium" as const,
        budget: "unknown" as const,
        constraints: [],
        missing: ["budget"] as Array<"budget">,
      };
      emit({
        type: "run_failed",
        runId,
        status: "failed",
        message: `${message}; fallback failed: ${fallbackMessage}`,
        timestamp: nowIso(),
      });
      return {
        runId,
        userId,
        input,
        status: "failed",
        clarifiedIntent: failedIntent,
        finalPlan: [],
        finalAnswer: "当前运行失败，请稍后重试。",
        traceSummary: `运行失败：${message}; fallback failed: ${fallbackMessage}`,
        toolCalls,
        replans,
        memoryApplied: {
          userId,
          topVibes: [],
          dislikedPlaces: [],
        },
        mapPoints: [],
        evaluationArtifacts: {
          input,
          expectedTaskType: "city-itinerary",
          steps: [],
          toolSuccessRate: 0,
          latencyMs: Date.now() - startedAt,
          completionStatus: "failed",
          judgeReadyTranscript: `input=${input}\nerror=${message}\nfallbackError=${fallbackMessage}`,
          replanCount: 0,
          failureReasons: [message, fallbackMessage],
        },
        events: [...events],
        plannerSource: "rule",
        clarified: failedIntent,
        memory: {
          userId,
          topVibes: [],
          dislikedPlaces: [],
        },
        initialPlan: [],
        plan: [],
        poiChecks: [],
        corrections: [],
        summary: `运行失败：${message}; fallback failed: ${fallbackMessage}`,
        timeline,
      };
    }
  }
}
