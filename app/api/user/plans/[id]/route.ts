import { readAuthPayload } from "@/lib/auth/request";
import { deletePlanHistory } from "@/lib/user/repository";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = readAuthPayload(request);
  if (!payload) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const ok = await deletePlanHistory(payload.sub, id);
  if (!ok) {
    return Response.json({ error: "plan not found" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
