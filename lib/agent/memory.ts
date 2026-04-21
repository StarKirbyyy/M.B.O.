import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { MobilityLevel } from "@/lib/agent/types";

export interface UserMemory {
  userId: string;
  vibeScores: Record<string, number>;
  dislikedPlaces: string[];
  preferredMobility?: MobilityLevel;
  updatedAt: string;
}

interface MemoryStore {
  users: Record<string, UserMemory>;
}

export interface MemoryFeedbackInput {
  likedVibes?: string[];
  dislikedVibes?: string[];
  dislikedPlaces?: string[];
  preferredMobility?: MobilityLevel;
}

const DEFAULT_MEMORY_PATH = join(/*turbopackIgnore: true*/ process.cwd(), "data", "user-memory.json");

function getMemoryPath(): string {
  if (process.env.NODE_ENV === "test" && process.env.USER_MEMORY_PATH?.trim()) {
    return process.env.USER_MEMORY_PATH.trim();
  }

  return DEFAULT_MEMORY_PATH;
}

function defaultMemory(userId: string): UserMemory {
  return {
    userId,
    vibeScores: {},
    dislikedPlaces: [],
    updatedAt: new Date(0).toISOString(),
  };
}

async function ensureMemoryFile(): Promise<void> {
  const memoryPath = getMemoryPath();
  await mkdir(dirname(memoryPath), { recursive: true });

  try {
    await readFile(memoryPath, "utf-8");
  } catch {
    const initial: MemoryStore = { users: {} };
    await writeFile(memoryPath, JSON.stringify(initial, null, 2), "utf-8");
  }
}

async function readStore(): Promise<MemoryStore> {
  await ensureMemoryFile();

  try {
    const raw = await readFile(getMemoryPath(), "utf-8");
    const parsed = JSON.parse(raw) as Partial<MemoryStore>;
    return {
      users: parsed.users ?? {},
    };
  } catch {
    return { users: {} };
  }
}

async function writeStore(store: MemoryStore): Promise<void> {
  await ensureMemoryFile();
  await writeFile(getMemoryPath(), JSON.stringify(store, null, 2), "utf-8");
}

export async function readUserMemory(userId: string): Promise<UserMemory> {
  const normalized = userId.trim() || "demo-user";
  const store = await readStore();
  return store.users[normalized] ?? defaultMemory(normalized);
}

export function getTopVibes(memory: UserMemory, limit = 2): string[] {
  return Object.entries(memory.vibeScores)
    .sort((a, b) => b[1] - a[1])
    .filter((entry) => entry[1] > 0)
    .slice(0, limit)
    .map((entry) => entry[0]);
}

export async function writeUserFeedback(userId: string, feedback: MemoryFeedbackInput): Promise<UserMemory> {
  const normalized = userId.trim() || "demo-user";
  const store = await readStore();
  const current = store.users[normalized] ?? defaultMemory(normalized);

  const next: UserMemory = {
    ...current,
    vibeScores: { ...current.vibeScores },
    dislikedPlaces: [...current.dislikedPlaces],
    updatedAt: new Date().toISOString(),
  };

  for (const vibe of feedback.likedVibes ?? []) {
    const key = vibe.trim();
    if (!key) continue;
    next.vibeScores[key] = (next.vibeScores[key] ?? 0) + 2;
  }

  for (const vibe of feedback.dislikedVibes ?? []) {
    const key = vibe.trim();
    if (!key) continue;
    next.vibeScores[key] = (next.vibeScores[key] ?? 0) - 2;
  }

  for (const place of feedback.dislikedPlaces ?? []) {
    const key = place.trim();
    if (!key) continue;
    if (!next.dislikedPlaces.includes(key)) {
      next.dislikedPlaces.push(key);
    }
  }

  if (feedback.preferredMobility) {
    next.preferredMobility = feedback.preferredMobility;
  }

  store.users[normalized] = next;
  await writeStore(store);
  return next;
}

export async function clearUserMemory(userId: string): Promise<boolean> {
  const normalized = userId.trim() || "demo-user";
  const store = await readStore();
  if (!store.users[normalized]) {
    return false;
  }

  delete store.users[normalized];
  await writeStore(store);
  return true;
}
