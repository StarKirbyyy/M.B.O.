import { findUserById, toSafeUser } from "@/lib/auth/repository";
import { readAuthPayload } from "@/lib/auth/request";

export async function GET(request: Request) {
  const payload = readAuthPayload(request);
  if (!payload) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await findUserById(payload.sub);
  if (!user) {
    return Response.json({ error: "user not found" }, { status: 404 });
  }

  return Response.json({
    user: toSafeUser(user),
  });
}
