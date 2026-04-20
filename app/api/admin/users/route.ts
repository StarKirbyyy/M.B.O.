import { createUser, listUsers, toSafeUser } from "@/lib/auth/repository";
import { hashPassword } from "@/lib/auth/password";
import { readAuthPayload } from "@/lib/auth/request";

interface CreateUserBody {
  username?: string;
  email?: string;
  password?: string;
  role?: "admin" | "user";
}

function isAdmin(request: Request): boolean {
  const payload = readAuthPayload(request);
  return payload?.role === "admin";
}

export async function GET(request: Request) {
  if (!isAdmin(request)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const users = await listUsers();
  return Response.json({ users });
}

export async function POST(request: Request) {
  if (!isAdmin(request)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as CreateUserBody;
    const username = body.username?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password?.trim() ?? "";
    const role = body.role === "admin" ? "admin" : "user";

    if (!username || !email || password.length < 8) {
      return Response.json({ error: "invalid payload" }, { status: 400 });
    }

    const created = await createUser({
      username,
      email,
      role,
      passwordHash: hashPassword(password),
    });
    return Response.json({ user: toSafeUser(created) }, { status: 201 });
  } catch {
    return Response.json({ error: "invalid request" }, { status: 400 });
  }
}
