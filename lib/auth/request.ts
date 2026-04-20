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
