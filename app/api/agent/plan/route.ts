import { readAuthPayload } from "@/lib/auth/request";
import { runAgent } from "@/lib/agent/runtime/run-agent";
import { createPlanHistory } from "@/lib/user/repository";

interface PlanRequestBody {
  input?: string;
  userId?: string;
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

    const result = await runAgent(input, { userId });
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
        // Keep planning response available even if persistence fails.
      }
    }
    return Response.json(result);
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
