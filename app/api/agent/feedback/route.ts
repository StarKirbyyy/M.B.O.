import { writeUserFeedback } from "@/lib/agent/memory";
import type { MobilityLevel } from "@/lib/agent/types";
import { readAuthPayload } from "@/lib/auth/request";
import { createUserFeedbackRecord, updateUserProfile } from "@/lib/user/repository";

interface FeedbackRequestBody {
  userId?: string;
  likedVibes?: string[];
  dislikedVibes?: string[];
  dislikedPlaces?: string[];
  preferredMobility?: MobilityLevel;
}

function normalizeArray(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.map((item) => String(item).trim()).filter(Boolean);
}

export async function POST(request: Request) {
  try {
    const payload = readAuthPayload(request);
    const body = (await request.json()) as FeedbackRequestBody;
    const userId = payload?.sub ?? body.userId?.trim() ?? "local-user";
    const likedVibes = normalizeArray(body.likedVibes);
    const dislikedVibes = normalizeArray(body.dislikedVibes);
    const dislikedPlaces = normalizeArray(body.dislikedPlaces);

    const updated = await writeUserFeedback(userId, {
      likedVibes,
      dislikedVibes,
      dislikedPlaces,
      preferredMobility: body.preferredMobility,
    });
    if (payload) {
      try {
        await createUserFeedbackRecord({
          userId: payload.sub,
          likedVibes,
          dislikedVibes,
          dislikedPlaces,
          preferredMobility: body.preferredMobility,
          rawJson: {
            likedVibes,
            dislikedVibes,
            dislikedPlaces,
            preferredMobility: body.preferredMobility ?? null,
          },
        });
        if (body.preferredMobility) {
          await updateUserProfile(payload.sub, {
            preferredMobility: body.preferredMobility,
          });
        }
      } catch {
        // Keep core feedback endpoint available even if DB persistence fails.
      }
    }

    return Response.json({
      ok: true,
      memory: updated,
    });
  } catch {
    return Response.json(
      {
        error: "invalid request",
      },
      { status: 400 },
    );
  }
}
