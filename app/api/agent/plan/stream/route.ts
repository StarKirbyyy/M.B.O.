import { runAgent } from "@/lib/agent/runtime/run-agent";
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

    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();
    let closed = false;

    const push = async (event: string, data: unknown) => {
      if (closed) {
        return;
      }

      await writer.write(encoder.encode(formatSse(event, data)));
    };

    void (async () => {
      try {
        const result = await runAgent(input, {
          userId,
          onEvent(event) {
            void push(event.type, event);
          },
        });

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
            // Ignore persistence failures for streaming UX.
          }
        }
      } catch (error) {
        await push("run_failed", {
          message: error instanceof Error ? error.message : "unknown error",
        });
      } finally {
        if (!closed) {
          closed = true;
          try {
            await writer.close();
          } catch {
            // ignore close errors
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
