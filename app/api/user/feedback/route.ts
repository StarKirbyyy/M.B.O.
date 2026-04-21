import { readAuthPayload } from "@/lib/auth/request";
import { listUserFeedbackRecords } from "@/lib/user/repository";

export async function GET(request: Request) {
  const payload = readAuthPayload(request);
  if (!payload) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 20);
  const offset = Number(url.searchParams.get("offset") ?? 0);
  const normalizedLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 20;
  const normalizedOffset = Number.isFinite(offset) ? Math.max(offset, 0) : 0;
  const feedback = await listUserFeedbackRecords(payload.sub, normalizedLimit, normalizedOffset);

  return Response.json({ feedback });
}
