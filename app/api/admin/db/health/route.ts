import { getPgPool } from "@/lib/db/postgres";

export async function GET() {
  try {
    const pool = getPgPool();
    const result = await pool.query("SELECT NOW() AS now");
    return Response.json({
      ok: true,
      now: result.rows[0]?.now,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 },
    );
  }
}
