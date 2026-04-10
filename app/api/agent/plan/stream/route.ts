import { runWeek1Agent, type AgentProgressEvent } from "@/lib/agent/run-week1";

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
    const body = (await request.json()) as PlanRequestBody;
    const input = body.input?.trim();
    const userId = body.userId?.trim() || "demo-user";

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

    let writeQueue = Promise.resolve();
    const push = (event: string, data: unknown) => {
      writeQueue = writeQueue.then(() => writer.write(encoder.encode(formatSse(event, data))));
      return writeQueue;
    };

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

        await runWeek1Agent(input, {
          userId,
          onProgress: (event: AgentProgressEvent) => {
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
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown error";
        await push("error", { message });
      } finally {
        clearInterval(heartbeat);
        await writeQueue;
        await writer.close();
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
