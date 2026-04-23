import { getStoredRun, subscribeStoredRun } from "@/lib/agent/runtime/run-store";

export const dynamic = "force-dynamic";

function formatSse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = getStoredRun(id);

  if (!run) {
    return Response.json({ error: "run not found" }, { status: 404 });
  }

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  let closed = false;
  const push = async (event: string, data: unknown) => {
    if (closed) {
      return;
    }

    await writer.write(encoder.encode(formatSse(event, data)));
  };

  void (async () => {
    try {
      for (const event of run.events) {
        await push(event.type, event);
      }

      if (run.status === "completed" || run.status === "failed") {
        await writer.close();
        closed = true;
        return;
      }

      const unsubscribe = subscribeStoredRun(id, (event) => {
        void push(event.type, event).then(async () => {
          if (event.type === "run_completed" || event.type === "run_failed") {
            unsubscribe?.();
            if (!closed) {
              closed = true;
              try {
                await writer.close();
              } catch {
                // ignore close errors
              }
            }
          }
        });
      });

      if (!unsubscribe) {
        if (!closed) {
          closed = true;
          await writer.close();
        }
      }
    } catch {
      if (!closed) {
        closed = true;
        try {
          await writer.close();
        } catch {
          // ignore close errors
        }
      }
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
