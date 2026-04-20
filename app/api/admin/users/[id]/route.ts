import { deleteUser, findUserById, toSafeUser, updateUser } from "@/lib/auth/repository";
import { hashPassword } from "@/lib/auth/password";
import { readAuthPayload } from "@/lib/auth/request";

interface UpdateBody {
  username?: string;
  email?: string;
  role?: "admin" | "user";
  status?: "active" | "disabled";
  password?: string;
}

function checkAdmin(request: Request): boolean {
  const payload = readAuthPayload(request);
  return payload?.role === "admin";
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdmin(request)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const user = await findUserById(id);
  if (!user) {
    return Response.json({ error: "user not found" }, { status: 404 });
  }
  return Response.json({ user: toSafeUser(user) });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdmin(request)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const body = (await request.json()) as UpdateBody;
    const updated = await updateUser(id, {
      username: body.username?.trim(),
      email: body.email?.trim().toLowerCase(),
      role: body.role,
      status: body.status,
      passwordHash: body.password ? hashPassword(body.password) : undefined,
    });
    if (!updated) {
      return Response.json({ error: "user not found" }, { status: 404 });
    }
    return Response.json({ user: updated });
  } catch {
    return Response.json({ error: "invalid request" }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdmin(request)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const ok = await deleteUser(id);
  if (!ok) {
    return Response.json({ error: "user not found" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
