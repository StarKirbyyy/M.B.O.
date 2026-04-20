import type { QueryResult } from "pg";

import type { AuthUser, AuthUserWithPassword, UserRole, UserStatus } from "@/lib/auth/types";
import { hashPassword } from "@/lib/auth/password";
import { getPgPool } from "@/lib/db/postgres";

interface UserRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: UserRole;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
}

interface CreateUserInput {
  username: string;
  email: string;
  passwordHash: string;
  role?: UserRole;
}

interface UpdateUserInput {
  username?: string;
  email?: string;
  role?: UserRole;
  status?: UserStatus;
  passwordHash?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __mboAuthSchemaInitPromise: Promise<void> | undefined;
}

function mapRow(row: UserRow): AuthUserWithPassword {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    lastLoginAt: row.last_login_at ? row.last_login_at.toISOString() : null,
  };
}

function toPublicUser(user: AuthUserWithPassword): AuthUser {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
}

async function bootstrapAdminIfNeeded(): Promise<void> {
  const username = process.env.AUTH_BOOTSTRAP_ADMIN_USERNAME?.trim();
  const email = process.env.AUTH_BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.AUTH_BOOTSTRAP_ADMIN_PASSWORD?.trim();
  if (!username || !email || !password) {
    return;
  }

  const pool = getPgPool();
  await pool.query(
    `
      INSERT INTO auth_users (username, email, password_hash, role, status)
      VALUES ($1, $2, $3, 'admin', 'active')
      ON CONFLICT (username) DO NOTHING
    `,
    [username, email, hashPassword(password)],
  );
}

export async function ensureAuthSchema(): Promise<void> {
  if (globalThis.__mboAuthSchemaInitPromise) {
    return globalThis.__mboAuthSchemaInitPromise;
  }

  globalThis.__mboAuthSchemaInitPromise = (async () => {
    const pool = getPgPool();
    await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auth_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(32) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role VARCHAR(16) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_login_at TIMESTAMPTZ
      )
    `);
    await bootstrapAdminIfNeeded();
  })();

  return globalThis.__mboAuthSchemaInitPromise;
}

export async function createUser(input: CreateUserInput): Promise<AuthUserWithPassword> {
  await ensureAuthSchema();
  const pool = getPgPool();
  const result: QueryResult<UserRow> = await pool.query(
    `
      INSERT INTO auth_users (username, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [input.username, input.email, input.passwordHash, input.role ?? "user"],
  );
  return mapRow(result.rows[0]);
}

export async function findUserByIdentifier(identifier: string): Promise<AuthUserWithPassword | null> {
  await ensureAuthSchema();
  const normalized = identifier.trim().toLowerCase();
  const pool = getPgPool();
  const result: QueryResult<UserRow> = await pool.query(
    `
      SELECT *
      FROM auth_users
      WHERE LOWER(email) = $1 OR LOWER(username) = $1
      LIMIT 1
    `,
    [normalized],
  );
  const row = result.rows[0];
  return row ? mapRow(row) : null;
}

export async function findUserById(userId: string): Promise<AuthUserWithPassword | null> {
  await ensureAuthSchema();
  const pool = getPgPool();
  const result: QueryResult<UserRow> = await pool.query("SELECT * FROM auth_users WHERE id = $1 LIMIT 1", [userId]);
  const row = result.rows[0];
  return row ? mapRow(row) : null;
}

export async function listUsers(limit = 50, offset = 0): Promise<AuthUser[]> {
  await ensureAuthSchema();
  const pool = getPgPool();
  const result: QueryResult<UserRow> = await pool.query(
    `
      SELECT *
      FROM auth_users
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `,
    [limit, offset],
  );
  return result.rows.map((row) => toPublicUser(mapRow(row)));
}

export async function updateUser(userId: string, input: UpdateUserInput): Promise<AuthUser | null> {
  await ensureAuthSchema();
  const patch: string[] = [];
  const values: string[] = [];

  if (typeof input.username === "string") {
    patch.push(`username = $${patch.length + 2}`);
    values.push(input.username);
  }
  if (typeof input.email === "string") {
    patch.push(`email = $${patch.length + 2}`);
    values.push(input.email);
  }
  if (typeof input.role === "string") {
    patch.push(`role = $${patch.length + 2}`);
    values.push(input.role);
  }
  if (typeof input.status === "string") {
    patch.push(`status = $${patch.length + 2}`);
    values.push(input.status);
  }
  if (typeof input.passwordHash === "string") {
    patch.push(`password_hash = $${patch.length + 2}`);
    values.push(input.passwordHash);
  }

  if (patch.length === 0) {
    const current = await findUserById(userId);
    return current ? toPublicUser(current) : null;
  }

  patch.push("updated_at = NOW()");

  const pool = getPgPool();
  const result: QueryResult<UserRow> = await pool.query(
    `
      UPDATE auth_users
      SET ${patch.join(", ")}
      WHERE id = $1
      RETURNING *
    `,
    [userId, ...values],
  );
  const row = result.rows[0];
  return row ? toPublicUser(mapRow(row)) : null;
}

export async function updateLastLogin(userId: string): Promise<void> {
  await ensureAuthSchema();
  const pool = getPgPool();
  await pool.query("UPDATE auth_users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1", [userId]);
}

export async function deleteUser(userId: string): Promise<boolean> {
  await ensureAuthSchema();
  const pool = getPgPool();
  const result = await pool.query("DELETE FROM auth_users WHERE id = $1", [userId]);
  return (result.rowCount ?? 0) > 0;
}

export function toSafeUser(user: AuthUserWithPassword): AuthUser {
  return toPublicUser(user);
}
