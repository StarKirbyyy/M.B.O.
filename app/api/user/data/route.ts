import { clearUserMemory } from "@/lib/agent/memory";
import { readAuthPayload } from "@/lib/auth/request";
import { clearUserData } from "@/lib/user/repository";

export async function DELETE(request: Request) {
  const payload = readAuthPayload(request);
  if (!payload) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  await clearUserData(payload.sub);
  await clearUserMemory(payload.sub);
  return Response.json({ ok: true });
}
