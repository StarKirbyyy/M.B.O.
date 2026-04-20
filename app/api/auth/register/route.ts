import { createUser, findUserByIdentifier, toSafeUser } from "@/lib/auth/repository";
import { hashPassword } from "@/lib/auth/password";
import { issueAuthToken } from "@/lib/auth/token";

interface RegisterBody {
  username?: string;
  email?: string;
  password?: string;
}

function validateUsername(input: string): boolean {
  return /^[a-zA-Z0-9_]{3,32}$/.test(input);
}

function validateEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("register_timeout")), timeoutMs);
    }),
  ]);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterBody;
    const username = body.username?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password?.trim() ?? "";

    if (!validateUsername(username)) {
      return Response.json({ error: "invalid username", hint: "用户名需为 3~32 位字母数字下划线。" }, { status: 400 });
    }
    if (!validateEmail(email)) {
      return Response.json({ error: "invalid email" }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json({ error: "weak password", hint: "密码长度至少 8 位。" }, { status: 400 });
    }

    const [emailConflict, usernameConflict] = await Promise.all([
      findUserByIdentifier(email),
      findUserByIdentifier(username),
    ]);
    if (emailConflict) return Response.json({ error: "email already exists" }, { status: 409 });
    if (usernameConflict) return Response.json({ error: "username already exists" }, { status: 409 });

    const created = await withTimeout(
      createUser({
        username,
        email,
        passwordHash: hashPassword(password),
        role: "user",
      }),
      8000,
    );
    const token = issueAuthToken({
      sub: created.id,
      username: created.username,
      role: created.role,
      email: created.email,
    });

    return Response.json(
      {
        user: toSafeUser(created),
        token,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "register_timeout") {
      return Response.json({ error: "register timeout", hint: "注册超时，请稍后重试。" }, { status: 504 });
    }

    if (typeof error === "object" && error && "code" in error) {
      const code = String((error as { code: unknown }).code);
      if (code === "23505") {
        return Response.json({ error: "user already exists" }, { status: 409 });
      }
    }

    return Response.json({ error: "invalid request" }, { status: 400 });
  }
}
