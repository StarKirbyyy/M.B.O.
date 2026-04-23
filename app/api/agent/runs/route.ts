import { randomUUID } from "node:crypto";

import { runAgent } from "@/lib/agent/runtime/run-agent";
import { createStoredRun, pushStoredEvent, setStoredRunResult, setStoredRunStatus } from "@/lib/agent/runtime/run-store";
import { readAuthPayload } from "@/lib/auth/request";
import { createPlanHistory } from "@/lib/user/repository";

interface RunRequestBody {
  input?: string;
  userId?: string;
}

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = readAuthPayload(request);
    const body = (await request.json()) as RunRequestBody;
    const input = body.input?.trim();
    const userId = payload?.sub ?? body.userId?.trim() ?? "local-user";

    if (!input) {
      return Response.json(
        {
          error: "input is required",
          hint: "请在请求体中传入 input 字段。",
        },
        { status: 400 },
      );
    }

    const runId = randomUUID();
    createStoredRun({ runId, userId, input });
    setStoredRunStatus(runId, "running");

    void runAgent(input, {
      runId,
      userId,
      onEvent(event) {
        pushStoredEvent(runId, event);
      },
    })
      .then(async (result) => {
        setStoredRunResult(runId, result);
        if (payload) {
          try {
            await createPlanHistory({
              userId: payload.sub,
              prompt: input,
              plannerSource: result.plannerSource,
              summary: result.summary,
              result,
            });
          } catch {
            // Keep run result available even if persistence fails.
          }
        }
      })
      .catch((error) => {
        pushStoredEvent(runId, {
          type: "run_failed",
          runId,
          status: "failed",
          message: error instanceof Error ? error.message : "unknown error",
          timestamp: new Date().toISOString(),
        });
        setStoredRunStatus(runId, "failed");
      });

    return Response.json({
      runId,
      status: "running",
    });
  } catch {
    return Response.json(
      {
        error: "invalid request",
      },
      { status: 400 },
    );
  }
}
