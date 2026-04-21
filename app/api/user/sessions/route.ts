import { readAuthPayload } from "@/lib/auth/request";
import { listUserSessions } from "@/lib/user/repository";

export async function GET(request: Request) {
  const payload = readAuthPayload(request);
  if (!payload) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const sessions = await listUserSessions(payload.sub);
  return Response.json({ sessions });
}
