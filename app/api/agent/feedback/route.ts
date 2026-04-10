import { writeUserFeedback } from "@/lib/agent/memory";
import type { MobilityLevel } from "@/lib/agent/types";

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
    const body = (await request.json()) as FeedbackRequestBody;
    const userId = body.userId?.trim() || "demo-user";

    const updated = await writeUserFeedback(userId, {
      likedVibes: normalizeArray(body.likedVibes),
      dislikedVibes: normalizeArray(body.dislikedVibes),
      dislikedPlaces: normalizeArray(body.dislikedPlaces),
      preferredMobility: body.preferredMobility,
    });

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
