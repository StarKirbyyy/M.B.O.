import type { AgentRunEvent, AgentRunResult, AgentRunStatus } from "@/lib/agent/types";

interface StoredRun {
  runId: string;
  userId: string;
  input: string;
  status: AgentRunStatus;
  createdAt: string;
  updatedAt: string;
  events: AgentRunEvent[];
  result?: AgentRunResult;
  listeners: Set<(event: AgentRunEvent) => void>;
}

declare global {
  var __mboAgentRuns: Map<string, StoredRun> | undefined;
}

function getStore(): Map<string, StoredRun> {
  if (!globalThis.__mboAgentRuns) {
    globalThis.__mboAgentRuns = new Map();
  }

  return globalThis.__mboAgentRuns;
}

export function createStoredRun(params: { runId: string; userId: string; input: string }): StoredRun {
  const now = new Date().toISOString();
  const run: StoredRun = {
    runId: params.runId,
    userId: params.userId,
    input: params.input,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    events: [],
    listeners: new Set(),
  };

  getStore().set(params.runId, run);
  return run;
}

export function getStoredRun(runId: string): StoredRun | undefined {
  return getStore().get(runId);
}

export function pushStoredEvent(runId: string, event: AgentRunEvent) {
  const run = getStoredRun(runId);
  if (!run) {
    return;
  }

  run.events.push(event);
  run.updatedAt = new Date().toISOString();
  for (const listener of run.listeners) {
    listener(event);
  }
}

export function setStoredRunStatus(runId: string, status: AgentRunStatus) {
  const run = getStoredRun(runId);
  if (!run) {
    return;
  }

  run.status = status;
  run.updatedAt = new Date().toISOString();
}

export function setStoredRunResult(runId: string, result: AgentRunResult) {
  const run = getStoredRun(runId);
  if (!run) {
    return;
  }

  run.result = result;
  run.status = result.status;
  run.updatedAt = new Date().toISOString();
}

export function subscribeStoredRun(runId: string, listener: (event: AgentRunEvent) => void): (() => void) | null {
  const run = getStoredRun(runId);
  if (!run) {
    return null;
  }

  run.listeners.add(listener);
  return () => {
    run.listeners.delete(listener);
  };
}
