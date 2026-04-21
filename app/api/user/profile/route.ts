import { readAuthPayload } from "@/lib/auth/request";
import type { BudgetLevel, MobilityLevel } from "@/lib/agent/types";
import { getUserProfile, updateUserProfile } from "@/lib/user/repository";

interface UpdateProfileBody {
  nickname?: string | null;
  language?: string;
  defaultCity?: string | null;
  budgetPreference?: BudgetLevel;
  preferredMobility?: MobilityLevel | null;
}

function isBudgetLevel(input: unknown): input is BudgetLevel {
  return input === "low" || input === "medium" || input === "high" || input === "unknown";
}

function isMobility(input: unknown): input is MobilityLevel {
  return input === "low" || input === "medium" || input === "high";
}

export async function GET(request: Request) {
  const payload = readAuthPayload(request);
  if (!payload) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const profile = await getUserProfile(payload.sub);
  return Response.json({ profile });
}

export async function PATCH(request: Request) {
  const payload = readAuthPayload(request);
  if (!payload) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as UpdateProfileBody;
    const patch: Parameters<typeof updateUserProfile>[1] = {};

    if ("nickname" in body) {
      patch.nickname = typeof body.nickname === "string" ? body.nickname.trim() || null : null;
    }
    if ("language" in body && typeof body.language === "string") {
      patch.language = body.language.trim() || "zh-CN";
    }
    if ("defaultCity" in body) {
      patch.defaultCity = typeof body.defaultCity === "string" ? body.defaultCity.trim() || null : null;
    }
    if ("budgetPreference" in body) {
      if (!isBudgetLevel(body.budgetPreference)) {
        return Response.json({ error: "invalid budgetPreference" }, { status: 400 });
      }
      patch.budgetPreference = body.budgetPreference;
    }
    if ("preferredMobility" in body) {
      if (body.preferredMobility !== null && !isMobility(body.preferredMobility)) {
        return Response.json({ error: "invalid preferredMobility" }, { status: 400 });
      }
      patch.preferredMobility = body.preferredMobility ?? null;
    }

    const updated = await updateUserProfile(payload.sub, patch);
    return Response.json({ profile: updated });
  } catch {
    return Response.json({ error: "invalid request" }, { status: 400 });
  }
}
