import { createHash } from "node:crypto";

import type { QueryResult } from "pg";

import { ensureAuthSchema } from "@/lib/auth/repository";
import type { BudgetLevel, MobilityLevel, PlanResult } from "@/lib/agent/types";
import { getPgPool } from "@/lib/db/postgres";

export interface UserProfile {
  userId: string;
  nickname: string | null;
  language: string;
  defaultCity: string | null;
  budgetPreference: BudgetLevel;
  preferredMobility: MobilityLevel | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserSession {
  id: string;
  userId: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
  userAgent: string | null;
  ipAddress: string | null;
}

export interface PlanHistory {
  id: string;
  userId: string;
  inputText: string;
  plannerSource: "siliconflow" | "rule";
  summary: string;
  result: PlanResult;
  createdAt: string;
}

export interface UserFeedbackRecord {
  id: string;
  userId: string;
  likedVibes: string[];
  dislikedVibes: string[];
  dislikedPlaces: string[];
  preferredMobility: MobilityLevel | null;
  createdAt: string;
}

interface UserProfileRow {
  user_id: string;
  nickname: string | null;
  language: string;
  default_city: string | null;
  budget_preference: BudgetLevel;
  preferred_mobility: MobilityLevel | null;
  created_at: Date;
  updated_at: Date;
}

interface UserSessionRow {
  id: string;
  user_id: string;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
  user_agent: string | null;
  ip_address: string | null;
}

interface PlanHistoryRow {
  id: string;
  user_id: string;
  input_text: string;
  planner_source: "siliconflow" | "rule";
  summary: string;
  result_json: PlanResult;
  created_at: Date;
}

interface UserFeedbackRow {
  id: string;
  user_id: string;
  liked_vibes: string[] | null;
  disliked_vibes: string[] | null;
  disliked_places: string[] | null;
  preferred_mobility: MobilityLevel | null;
  created_at: Date;
}

declare global {
  var __mboUserDataSchemaInitPromise: Promise<void> | undefined;
}

function toIso(input: Date | string): string {
  return typeof input === "string" ? input : input.toISOString();
}

function mapProfile(row: UserProfileRow): UserProfile {
  return {
    userId: row.user_id,
    nickname: row.nickname,
    language: row.language,
    defaultCity: row.default_city,
    budgetPreference: row.budget_preference,
    preferredMobility: row.preferred_mobility,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapSession(row: UserSessionRow): UserSession {
  return {
    id: row.id,
    userId: row.user_id,
    expiresAt: toIso(row.expires_at),
    revokedAt: row.revoked_at ? toIso(row.revoked_at) : null,
    createdAt: toIso(row.created_at),
    userAgent: row.user_agent,
    ipAddress: row.ip_address,
  };
}

function mapPlan(row: PlanHistoryRow): PlanHistory {
  return {
    id: row.id,
    userId: row.user_id,
    inputText: row.input_text,
    plannerSource: row.planner_source,
    summary: row.summary,
    result: row.result_json,
    createdAt: toIso(row.created_at),
  };
}

function mapFeedback(row: UserFeedbackRow): UserFeedbackRecord {
  return {
    id: row.id,
    userId: row.user_id,
    likedVibes: row.liked_vibes ?? [],
    dislikedVibes: row.disliked_vibes ?? [],
    dislikedPlaces: row.disliked_places ?? [],
    preferredMobility: row.preferred_mobility,
    createdAt: toIso(row.created_at),
  };
}

export async function ensureUserDataSchema(): Promise<void> {
  if (globalThis.__mboUserDataSchemaInitPromise) {
    return globalThis.__mboUserDataSchemaInitPromise;
  }

  globalThis.__mboUserDataSchemaInitPromise = (async () => {
    await ensureAuthSchema();
    const pool = getPgPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id UUID PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
        nickname VARCHAR(64),
        language VARCHAR(16) NOT NULL DEFAULT 'zh-CN',
        default_city VARCHAR(64),
        budget_preference VARCHAR(16) NOT NULL DEFAULT 'unknown' CHECK (budget_preference IN ('low', 'medium', 'high', 'unknown')),
        preferred_mobility VARCHAR(16) CHECK (preferred_mobility IN ('low', 'medium', 'high')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL,
        user_agent TEXT,
        ip_address INET,
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id_created_at
      ON user_sessions(user_id, created_at DESC)
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS plan_histories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
        input_text TEXT NOT NULL,
        planner_source VARCHAR(32) NOT NULL CHECK (planner_source IN ('siliconflow', 'rule')),
        summary TEXT NOT NULL,
        result_json JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_plan_histories_user_id_created_at
      ON plan_histories(user_id, created_at DESC)
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_feedback (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
        liked_vibes TEXT[] NOT NULL DEFAULT '{}',
        disliked_vibes TEXT[] NOT NULL DEFAULT '{}',
        disliked_places TEXT[] NOT NULL DEFAULT '{}',
        preferred_mobility VARCHAR(16) CHECK (preferred_mobility IN ('low', 'medium', 'high')),
        raw_json JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id_created_at
      ON user_feedback(user_id, created_at DESC)
    `);
    await pool.query(`
      INSERT INTO user_profiles(user_id)
      SELECT id
      FROM auth_users u
      WHERE NOT EXISTS (
        SELECT 1
        FROM user_profiles p
        WHERE p.user_id = u.id
      )
    `);
  })();

  return globalThis.__mboUserDataSchemaInitPromise;
}

async function ensureUserProfileRow(userId: string): Promise<void> {
  await ensureUserDataSchema();
  const pool = getPgPool();
  await pool.query(
    `
      INSERT INTO user_profiles (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
    `,
    [userId],
  );
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  await ensureUserProfileRow(userId);
  const pool = getPgPool();
  const result: QueryResult<UserProfileRow> = await pool.query(
    `
      SELECT *
      FROM user_profiles
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId],
  );
  const row = result.rows[0];
  return row ? mapProfile(row) : null;
}

interface UpdateProfileInput {
  nickname?: string | null;
  language?: string;
  defaultCity?: string | null;
  budgetPreference?: BudgetLevel;
  preferredMobility?: MobilityLevel | null;
}

export async function updateUserProfile(userId: string, input: UpdateProfileInput): Promise<UserProfile> {
  await ensureUserProfileRow(userId);
  const patch: string[] = [];
  const values: (string | null)[] = [];

  if (input.nickname !== undefined) {
    patch.push(`nickname = $${patch.length + 2}`);
    values.push(input.nickname);
  }
  if (input.language !== undefined) {
    patch.push(`language = $${patch.length + 2}`);
    values.push(input.language);
  }
  if (input.defaultCity !== undefined) {
    patch.push(`default_city = $${patch.length + 2}`);
    values.push(input.defaultCity);
  }
  if (input.budgetPreference !== undefined) {
    patch.push(`budget_preference = $${patch.length + 2}`);
    values.push(input.budgetPreference);
  }
  if (input.preferredMobility !== undefined) {
    patch.push(`preferred_mobility = $${patch.length + 2}`);
    values.push(input.preferredMobility);
  }

  if (patch.length === 0) {
    const current = await getUserProfile(userId);
    if (!current) {
      throw new Error("profile_not_found");
    }
    return current;
  }

  patch.push("updated_at = NOW()");
  const pool = getPgPool();
  const result: QueryResult<UserProfileRow> = await pool.query(
    `
      UPDATE user_profiles
      SET ${patch.join(", ")}
      WHERE user_id = $1
      RETURNING *
    `,
    [userId, ...values],
  );
  return mapProfile(result.rows[0]);
}

export async function createUserSession(input: {
  userId: string;
  token: string;
  expiresAt: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}): Promise<UserSession> {
  await ensureUserDataSchema();
  const pool = getPgPool();
  const tokenHash = createHash("sha256").update(input.token).digest("hex");
  const result: QueryResult<UserSessionRow> = await pool.query(
    `
      INSERT INTO user_sessions (user_id, token_hash, user_agent, ip_address, expires_at)
      VALUES ($1, $2, $3, $4::inet, $5)
      RETURNING *
    `,
    [input.userId, tokenHash, input.userAgent ?? null, input.ipAddress ?? null, input.expiresAt],
  );
  return mapSession(result.rows[0]);
}

export async function listUserSessions(userId: string, limit = 20): Promise<UserSession[]> {
  await ensureUserDataSchema();
  const pool = getPgPool();
  const result: QueryResult<UserSessionRow> = await pool.query(
    `
      SELECT *
      FROM user_sessions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `,
    [userId, limit],
  );
  return result.rows.map((row) => mapSession(row));
}

export async function createPlanHistory(input: {
  userId: string;
  prompt: string;
  plannerSource: "siliconflow" | "rule";
  summary: string;
  result: PlanResult;
}): Promise<PlanHistory> {
  await ensureUserDataSchema();
  const pool = getPgPool();
  const result: QueryResult<PlanHistoryRow> = await pool.query(
    `
      INSERT INTO plan_histories (user_id, input_text, planner_source, summary, result_json)
      VALUES ($1, $2, $3, $4, $5::jsonb)
      RETURNING *
    `,
    [input.userId, input.prompt, input.plannerSource, input.summary, JSON.stringify(input.result)],
  );
  return mapPlan(result.rows[0]);
}

export async function listPlanHistories(userId: string, limit = 20, offset = 0): Promise<PlanHistory[]> {
  await ensureUserDataSchema();
  const pool = getPgPool();
  const result: QueryResult<PlanHistoryRow> = await pool.query(
    `
      SELECT *
      FROM plan_histories
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `,
    [userId, limit, offset],
  );
  return result.rows.map((row) => mapPlan(row));
}

export async function deletePlanHistory(userId: string, historyId: string): Promise<boolean> {
  await ensureUserDataSchema();
  const pool = getPgPool();
  const result = await pool.query(
    `
      DELETE FROM plan_histories
      WHERE id = $1 AND user_id = $2
    `,
    [historyId, userId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function createUserFeedbackRecord(input: {
  userId: string;
  likedVibes: string[];
  dislikedVibes: string[];
  dislikedPlaces: string[];
  preferredMobility?: MobilityLevel;
  rawJson?: Record<string, unknown>;
}): Promise<UserFeedbackRecord> {
  await ensureUserDataSchema();
  const pool = getPgPool();
  const result: QueryResult<UserFeedbackRow> = await pool.query(
    `
      INSERT INTO user_feedback (user_id, liked_vibes, disliked_vibes, disliked_places, preferred_mobility, raw_json)
      VALUES ($1, $2::text[], $3::text[], $4::text[], $5, $6::jsonb)
      RETURNING *
    `,
    [
      input.userId,
      input.likedVibes,
      input.dislikedVibes,
      input.dislikedPlaces,
      input.preferredMobility ?? null,
      JSON.stringify(input.rawJson ?? {}),
    ],
  );
  return mapFeedback(result.rows[0]);
}

export async function listUserFeedbackRecords(userId: string, limit = 20, offset = 0): Promise<UserFeedbackRecord[]> {
  await ensureUserDataSchema();
  const pool = getPgPool();
  const result: QueryResult<UserFeedbackRow> = await pool.query(
    `
      SELECT *
      FROM user_feedback
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `,
    [userId, limit, offset],
  );
  return result.rows.map((row) => mapFeedback(row));
}

export async function clearUserData(userId: string): Promise<void> {
  await ensureUserDataSchema();
  const pool = getPgPool();
  await pool.query("DELETE FROM user_feedback WHERE user_id = $1", [userId]);
  await pool.query("DELETE FROM plan_histories WHERE user_id = $1", [userId]);
  await pool.query("DELETE FROM user_sessions WHERE user_id = $1", [userId]);
}
