import { createHmac } from "node:crypto";

import type { AuthTokenPayload, UserRole } from "@/lib/auth/types";

const JWT_SECRET = process.env.JWT_SECRET?.trim();
const AUTH_TOKEN_TTL_SEC = Number(process.env.AUTH_TOKEN_TTL_SEC ?? 60 * 60 * 24 * 7);

interface SignInput {
  sub: string;
  username: string;
  role: UserRole;
  email: string;
}

function encodeBase64Url(input: string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`;
  return Buffer.from(padded, "base64").toString("utf8");
}

function sign(data: string): string {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is required");
  }

  return createHmac("sha256", JWT_SECRET).update(data).digest("base64url");
}

export function issueAuthToken(input: SignInput): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: AuthTokenPayload = {
    sub: input.sub,
    username: input.username,
    role: input.role,
    email: input.email,
    iat: now,
    exp: now + AUTH_TOKEN_TTL_SEC,
  };

  const headerSegment = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadSegment = encodeBase64Url(JSON.stringify(payload));
  const signature = sign(`${headerSegment}.${payloadSegment}`);
  return `${headerSegment}.${payloadSegment}.${signature}`;
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  const segments = token.split(".");
  if (segments.length !== 3) {
    return null;
  }

  const [headerSegment, payloadSegment, signature] = segments;
  const expectedSignature = sign(`${headerSegment}.${payloadSegment}`);
  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(payloadSegment)) as AuthTokenPayload;
    if (!payload?.sub || !payload?.exp || !payload?.iat) {
      return null;
    }
    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
