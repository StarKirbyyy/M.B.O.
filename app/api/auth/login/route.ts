import { findUserByIdentifier, toSafeUser, updateLastLogin } from "@/lib/auth/repository";
import { readClientIp, readUserAgent } from "@/lib/auth/request";
import { verifyPassword } from "@/lib/auth/password";
import { issueAuthToken, verifyAuthToken } from "@/lib/auth/token";
import { createUserSession } from "@/lib/user/repository";

interface LoginBody {
  identifier?: string;
  password?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;
    const identifier = body.identifier?.trim() ?? "";
    const password = body.password?.trim() ?? "";

    if (!identifier || !password) {
      return Response.json({ error: "identifier and password are required" }, { status: 400 });
    }

    const user = await findUserByIdentifier(identifier);
    if (!user) {
      return Response.json({ error: "invalid credentials" }, { status: 401 });
    }

    if (user.status !== "active") {
      return Response.json({ error: "user disabled" }, { status: 403 });
    }

    const ok = verifyPassword(password, user.passwordHash);
    if (!ok) {
      return Response.json({ error: "invalid credentials" }, { status: 401 });
    }

    await updateLastLogin(user.id);
    const token = issueAuthToken({
      sub: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
    });
    const payload = verifyAuthToken(token);
    if (payload) {
      await createUserSession({
        userId: user.id,
        token,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
        userAgent: readUserAgent(request),
        ipAddress: readClientIp(request),
      });
    }

    return Response.json({
      user: toSafeUser(user),
      token,
    });
  } catch {
    return Response.json({ error: "invalid request" }, { status: 400 });
  }
}
