import { getStoredRun } from "@/lib/agent/runtime/run-store";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = getStoredRun(id);

  if (!run) {
    return Response.json({ error: "run not found" }, { status: 404 });
  }

  return Response.json({
    runId: run.runId,
    status: run.status,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    result: run.result ?? null,
  });
}
