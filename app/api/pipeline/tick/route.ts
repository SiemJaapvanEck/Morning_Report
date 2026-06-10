// Scheduler-endpoint: elke aanroep voert één brok pipeline-werk uit (<10s).
// De externe scheduler (cron-job.org) roept dit elke ~2 min aan tussen
// 06:30 en 08:15 — zie docs/setup.md.

import { NextRequest, NextResponse } from "next/server";
import { tick } from "@/modules/pipeline";

export const maxDuration = 10;

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "niet geautoriseerd" }, { status: 401 });
  }

  try {
    const result = await tick();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
