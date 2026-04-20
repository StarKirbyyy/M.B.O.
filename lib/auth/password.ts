import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [scheme, salt, expected] = storedHash.split("$");
  if (scheme !== "scrypt" || !salt || !expected) {
    return false;
  }

  const actual = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  const actualBuffer = Buffer.from(actual, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}
