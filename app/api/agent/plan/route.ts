import { runWeek1Agent } from "@/lib/agent/run-week1";

interface PlanRequestBody {
  input?: string;
  userId?: string;
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

    const result = await runWeek1Agent(input, { userId });
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
