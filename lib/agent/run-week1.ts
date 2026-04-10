import { clarifyGoal } from "@/lib/agent/clarifier";
import { generatePlanWithSiliconFlowStreaming, isSiliconFlowConfigured } from "@/lib/agent/llm-plan";
import { getTopVibes, readUserMemory } from "@/lib/agent/memory";
import { buildInitialPlan, buildReplacementStep, summarizeInitialPlan } from "@/lib/agent/planner";
import { applyDurationDelta, getReplanStrategy } from "@/lib/agent/replan-strategy";
import { checkPoiAvailability } from "@/lib/agent/tools/poi";
import { getWeather } from "@/lib/agent/tools/weather";
import type { PlanResult } from "@/lib/agent/types";

export type AgentProgressEvent =
  | {
      type: "stage";
      stage: PlanResult["timeline"][number]["stage"];
      detail: string;
      payload?: Record<string, unknown>;
    }
  | {
      type: "model_chunk";
      chunk: string;
    }
  | {
      type: "final";
      result: PlanResult;
    };

interface RunOptions {
  onProgress?: (event: AgentProgressEvent) => void;
  userId?: string;
}

export async function runWeek1Agent(userInput: string, options?: RunOptions): Promise<PlanResult> {
  const userId = options?.userId?.trim() || "demo-user";
  const emit = (event: AgentProgressEvent) => {
    options?.onProgress?.(event);
  };

  const pushStage = (
    stage: PlanResult["timeline"][number]["stage"],
    detail: string,
    payload?: Record<string, unknown>,
  ) => {
    timeline.push({ stage, detail, payload });
    emit({ type: "stage", stage, detail, payload });
  };

  const timeline: PlanResult["timeline"] = [
    {
      stage: "INPUT",
      detail: "收到用户输入，开始建立任务上下文。",
      payload: { input: userInput },
    },
  ];
  emit({
    type: "stage",
    stage: "INPUT",
    detail: "收到用户输入，开始建立任务上下文。",
    payload: { input: userInput },
  });

  const clarified = clarifyGoal(userInput);
  pushStage(
    "CLARIFY",
    "完成目标澄清，提取城市、偏好、体力与缺失约束。",
    {
      city: clarified.city,
      vibes: clarified.vibes,
      mobility: clarified.mobility,
      missing: clarified.missing,
    },
  );

  const memoryProfile = await readUserMemory(userId);
  const topVibes = getTopVibes(memoryProfile, 2);
  const dislikedPlaces = memoryProfile.dislikedPlaces ?? [];
  const dislikedPlaceSet = new Set(dislikedPlaces);

  for (const vibe of topVibes) {
    if (!clarified.vibes.includes(vibe)) {
      clarified.vibes.push(vibe);
    }
  }

  if (clarified.mobility === "medium" && memoryProfile.preferredMobility) {
    clarified.mobility = memoryProfile.preferredMobility;
  }

  pushStage("MEMORY_READ", "已读取用户长期偏好记忆。", {
    userId,
    topVibes,
    preferredMobility: memoryProfile.preferredMobility ?? "none",
    dislikedPlacesCount: dislikedPlaces.length,
  });

  const weather = await getWeather(clarified);
  pushStage(
    "TOOL_WEATHER",
    "调用天气工具完成环境感知。",
    {
      condition: weather.condition,
      temperatureC: weather.temperatureC,
      source: weather.source ?? "unknown",
    },
  );

  let plannerSource: PlanResult["plannerSource"] = "rule";
  let initialPlan = buildInitialPlan(clarified, weather);

  if (isSiliconFlowConfigured()) {
    pushStage(
      "MODEL_PLAN",
      "已检测到硅基流动配置，开始调用模型生成初始计划（超时会自动回退）。",
    );

    const modelPlan = await generatePlanWithSiliconFlowStreaming({
      goal: clarified,
      weather,
      onChunk: (chunk) => {
        emit({
          type: "model_chunk",
          chunk,
        });
      },
    });

    if (modelPlan) {
      initialPlan = modelPlan;
      plannerSource = "siliconflow";
      pushStage(
        "MODEL_PLAN",
        "硅基流动模型规划成功，采用模型输出作为初始计划。",
        {
          stepCount: modelPlan.length,
        },
      );
    } else {
      pushStage(
        "MODEL_PLAN",
        "硅基流动模型规划失败或超时，已回退规则规划。",
      );
    }
  } else {
    pushStage(
      "MODEL_PLAN",
      "未检测到硅基流动模型配置，使用规则规划。",
    );
  }

  pushStage(
    "PLAN",
    "根据偏好与天气生成 3 步初始行程。",
    {
      stepCount: initialPlan.length,
      source: plannerSource,
    },
  );

  const plan = [...initialPlan];
  const poiChecks: PlanResult["poiChecks"] = [];
  const corrections: PlanResult["corrections"] = [];
  const usedPlaces = new Set(initialPlan.map((step) => step.place));

  for (let index = 0; index < plan.length; index += 1) {
    const current = plan[index];
    const poiCheck = dislikedPlaceSet.has(current.place)
      ? {
          stepId: current.id,
          place: current.place,
          available: false,
          reason: "memory_disliked_place",
          source: "live" as const,
          provider: "mock" as const,
        }
      : await checkPoiAvailability({
          goal: clarified,
          step: current,
          weather,
        });

    poiChecks.push(poiCheck);
    pushStage(
      "TOOL_POI",
      `检查点位可用性：${current.place}`,
      {
        stepId: current.id,
        available: poiCheck.available,
        reason: poiCheck.reason,
        source: poiCheck.source,
        provider: poiCheck.provider ?? "unknown",
      },
    );

    if (!poiCheck.available) {
      const strategy = getReplanStrategy(poiCheck.reason);
      const updatedDuration = applyDurationDelta(current.durationMinutes, strategy.durationDeltaMinutes);
      const candidateStep = {
        ...current,
        durationMinutes: updatedDuration,
      };

      const replacement = strategy.shouldReplace
        ? buildReplacementStep({
            goal: clarified,
            weather,
            originalStep: candidateStep,
            usedPlaces,
            forceIndoor: strategy.forceIndoor,
          })
        : null;

      const durationChanged = updatedDuration !== current.durationMinutes;

      if (replacement) {
        plan[index] = replacement;
        usedPlaces.add(replacement.place);
        corrections.push({
          stepId: current.id,
          strategyId: strategy.id,
          action: durationChanged ? "replace-and-duration-adjust" : "replace",
          oldPlace: current.place,
          newPlace: replacement.place,
          oldDurationMinutes: current.durationMinutes,
          newDurationMinutes: replacement.durationMinutes,
          reason: poiCheck.reason,
        });
        pushStage(
          "REPLAN",
          `步骤 ${current.id} 触发重规划：${current.place} -> ${replacement.place}（${strategy.label}）`,
          {
            reason: poiCheck.reason,
            strategyId: strategy.id,
          },
        );
      } else {
        if (durationChanged) {
          plan[index] = candidateStep;
          corrections.push({
            stepId: current.id,
            strategyId: strategy.id,
            action: "duration-adjust",
            oldDurationMinutes: current.durationMinutes,
            newDurationMinutes: candidateStep.durationMinutes,
            reason: poiCheck.reason,
          });
        } else {
          corrections.push({
            stepId: current.id,
            strategyId: strategy.id,
            action: "none",
            oldPlace: current.place,
            reason: poiCheck.reason,
          });
        }

        pushStage(
          "REPLAN",
          `步骤 ${current.id} 检测到异常，但未找到替代点位（${strategy.label}）。`,
          {
            reason: poiCheck.reason,
            strategyId: strategy.id,
            durationChanged,
          },
        );
      }
    }
  }

  const summaryBase = summarizeInitialPlan(clarified, weather);
  const replaceCount = corrections.filter(
    (item) => item.action === "replace" || item.action === "replace-and-duration-adjust",
  ).length;
  const durationAdjustCount = corrections.filter(
    (item) => item.action === "duration-adjust" || item.action === "replace-and-duration-adjust",
  ).length;
  const summary =
    corrections.length > 0
      ? `${summaryBase} 已触发 ${corrections.length} 次自我修正，其中替换 ${replaceCount} 次、时长调整 ${durationAdjustCount} 次。`
      : `${summaryBase} 当前未触发重规划。`;

  const mapPoints: PlanResult["mapPoints"] = [];
  for (let index = 0; index < plan.length; index += 1) {
    const step = plan[index];

    const matched = [...poiChecks]
      .reverse()
      .find(
        (item) =>
          item.stepId === step.id &&
          item.place === step.place &&
          typeof item.latitude === "number" &&
          typeof item.longitude === "number",
      );

    if (matched && typeof matched.latitude === "number" && typeof matched.longitude === "number") {
      mapPoints.push({
        stepId: step.id,
        order: index + 1,
        place: step.place,
        latitude: matched.latitude,
        longitude: matched.longitude,
        provider: matched.provider,
      });
      continue;
    }

    const resolved = await checkPoiAvailability({
      goal: clarified,
      step,
      weather,
    });

    if (typeof resolved.latitude === "number" && typeof resolved.longitude === "number") {
      mapPoints.push({
        stepId: step.id,
        order: index + 1,
        place: step.place,
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        provider: resolved.provider,
      });
    }
  }

  const result = {
    userId,
    clarified,
    memory: {
      userId,
      preferredMobility: memoryProfile.preferredMobility,
      topVibes,
      dislikedPlaces,
    },
    weather,
    plannerSource,
    initialPlan,
    plan,
    poiChecks,
    corrections,
    mapPoints,
    summary,
    timeline,
  };

  emit({
    type: "final",
    result,
  });

  return result;
}
