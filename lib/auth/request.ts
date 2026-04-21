import type { AuthTokenPayload } from "@/lib/auth/types";
import { verifyAuthToken } from "@/lib/auth/token";

export function parseBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }
  return token.trim();
}

export function readAuthPayload(request: Request): AuthTokenPayload | null {
  const token = parseBearerToken(request);
  if (!token) {
    return null;
  }
  return verifyAuthToken(token);
}

export function requireAuthPayload(request: Request): AuthTokenPayload {
  const payload = readAuthPayload(request);
  if (!payload) {
    throw new Error("unauthorized");
  }
  return payload;
}

export function readClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp || null;
}

export function readUserAgent(request: Request): string | null {
  const userAgent = request.headers.get("user-agent")?.trim();
  return userAgent || null;
}
