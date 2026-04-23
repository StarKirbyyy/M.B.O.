import type { AgentRunResult, EvaluationArtifacts } from "@/lib/agent/types";

export function toProcessEvalRecord(run: AgentRunResult): EvaluationArtifacts {
  return run.evaluationArtifacts;
}

export function toOutcomeEvalRecord(run: AgentRunResult): Record<string, unknown> {
  return {
    runId: run.runId,
    userId: run.userId,
    expectedTaskType: run.evaluationArtifacts.expectedTaskType,
    completionStatus: run.evaluationArtifacts.completionStatus,
    toolSuccessRate: run.evaluationArtifacts.toolSuccessRate,
    latencyMs: run.evaluationArtifacts.latencyMs,
    replanCount: run.evaluationArtifacts.replanCount,
    finalAnswer: run.finalAnswer,
    finalPlanLength: run.finalPlan.length,
  };
}
