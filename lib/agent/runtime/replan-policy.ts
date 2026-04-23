import { applyDurationDelta, getReplanStrategy } from "@/lib/agent/replan-strategy";
import type { PlanStep, PoiCheck, ReplanRecord } from "@/lib/agent/types";

export interface ResolvedReplanPolicy {
  nextStep: PlanStep;
  record: ReplanRecord;
  requested: {
    reason: string;
    strategyId: string;
  };
}

export function resolveReplan(params: {
  issue: PoiCheck;
  currentStep: PlanStep;
  replacement: PlanStep | null;
}): ResolvedReplanPolicy {
  const { issue, currentStep, replacement } = params;
  const strategy = getReplanStrategy(issue.reason);
  const updatedDuration = applyDurationDelta(currentStep.durationMinutes, strategy.durationDeltaMinutes);

  if (replacement) {
    return {
      nextStep: {
        ...replacement,
        durationMinutes: updatedDuration,
      },
      requested: {
        reason: issue.reason,
        strategyId: strategy.id,
      },
      record: {
        stepId: currentStep.id,
        reason: issue.reason,
        strategyId: strategy.id,
        oldPlace: currentStep.place,
        newPlace: replacement.place,
        oldDurationMinutes: currentStep.durationMinutes,
        newDurationMinutes: updatedDuration,
        note: strategy.label,
      },
    };
  }

  return {
    nextStep: {
      ...currentStep,
      durationMinutes: updatedDuration,
      reason: `${currentStep.reason} 已触发保守降级，未找到更优替代点位。`,
    },
    requested: {
      reason: issue.reason,
      strategyId: strategy.id,
    },
    record: {
      stepId: currentStep.id,
      reason: issue.reason,
      strategyId: strategy.id,
      oldPlace: currentStep.place,
      oldDurationMinutes: currentStep.durationMinutes,
      newDurationMinutes: updatedDuration,
      note: `${strategy.label}（降级保守执行）`,
    },
  };
}
