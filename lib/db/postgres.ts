import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL?.trim();

declare global {
  var __mboPgPool: Pool | undefined;
}

function createPool(): Pool {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const sslEnabled = process.env.PGSSL === "true";
  return new Pool({
    connectionString: DATABASE_URL,
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
  });
}

export function getPgPool(): Pool {
  if (!globalThis.__mboPgPool) {
    globalThis.__mboPgPool = createPool();
  }

  return globalThis.__mboPgPool;
}
