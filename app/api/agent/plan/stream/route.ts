import { runWeek1Agent, type AgentProgressEvent } from "@/lib/agent/run-week1";
import { readAuthPayload } from "@/lib/auth/request";
import { createPlanHistory } from "@/lib/user/repository";

interface PlanRequestBody {
  input?: string;
  userId?: string;
}

export const dynamic = "force-dynamic";

function formatSse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  try {
    const payload = readAuthPayload(request);
    const body = (await request.json()) as PlanRequestBody;
    const input = body.input?.trim();
    const userId = payload?.sub ?? body.userId?.trim() ?? "demo-user";

    if (!input) {
      return Response.json(
        {
          error: "input is required",
          hint: "请在请求体中传入 input 字段。",
        },
        { status: 400 },
      );
    }

    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();
    let completed = false;
    let streamClosed = false;

    let writeQueue: Promise<void> = Promise.resolve();
    const push = (event: string, data: unknown) => {
      if (streamClosed) {
        return writeQueue;
      }

      writeQueue = writeQueue
        .then(async () => {
          if (streamClosed) {
            return;
          }

          await writer.write(encoder.encode(formatSse(event, data)));
        })
        .catch(() => {
          // Client disconnect / aborted response should stop the stream silently.
          streamClosed = true;
        });
      return writeQueue;
    };

    request.signal.addEventListener("abort", () => {
      streamClosed = true;
    });

    void (async () => {
      const heartbeat = setInterval(() => {
        if (!completed) {
          void push("heartbeat", {
            detail: "模型处理中，请稍候...",
          });
        }
      }, 2000);

      try {
        await push("stage", {
          stage: "INPUT",
          detail: "开始流式生成。",
        });

        const result = await runWeek1Agent(input, {
          userId,
          onProgress: (event: AgentProgressEvent) => {
            if (streamClosed) {
              return;
            }

            if (event.type === "stage") {
              void push("stage", event);
            }

            if (event.type === "model_chunk") {
              void push("model_chunk", event);
            }

            if (event.type === "final") {
              completed = true;
              void push("final", event);
            }
          },
        });
        if (payload && !streamClosed) {
          try {
            await createPlanHistory({
              userId: payload.sub,
              prompt: input,
              plannerSource: result.plannerSource,
              summary: result.summary,
              result,
            });
          } catch {
            // Ignore persistence failures for streaming UX.
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown error";
        if (!streamClosed) {
          await push("error", { message });
        }
      } finally {
        clearInterval(heartbeat);
        await writeQueue;

        if (!streamClosed) {
          try {
            await writer.close();
          } catch {
            // Ignore close errors when stream has already been aborted by client.
          }
        }
      }
    })();

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch {
    return Response.json(
      {
        error: "invalid request",
        hint: "请求体需为 JSON，格式例如：{ \"input\": \"我想在上海度过艺术感下午，不想太累\" }",
      },
      { status: 400 },
    );
  }
}
