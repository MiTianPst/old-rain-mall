import { sql } from "drizzle-orm";

import { db } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ status: "ok", service: "old-rain-mall" });
  } catch (error) {
    console.error("健康检查失败", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return Response.json({ status: "error", service: "old-rain-mall" }, { status: 503 });
  }
}
