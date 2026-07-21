// Research-endpoint: create path (Research Tracking PRD, Phase 3 — seed &
// track). POSTing a note runs the Phase 2 extraction, persists the note, and
// seeds + follows its thread synchronously (modules/research's createResearch)
// so the storyline exists immediately, before any pipeline run. Auth:
// profile-cookie (login-loos), same pattern as app/api/holdings/route.ts.
//
// GET (list)/DELETE/PATCH (archive) are Phase 4 (MijnOnderzoek + its API) —
// out of scope here.

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createResearch } from "@/modules/research";

async function profileIdUitCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("mr_profile")?.value ?? null;
}

export async function POST(request: NextRequest) {
  const profileId = await profileIdUitCookie();
  if (!profileId) {
    return NextResponse.json({ error: "geen profiel gekozen" }, { status: 401 });
  }

  const body = (await request.json()) as { title?: string; body?: string };
  const title = body.title?.trim();
  const text = body.body?.trim();
  if (!title || !text) {
    return NextResponse.json({ error: "titel en onderzoekstekst zijn verplicht" }, { status: 400 });
  }

  try {
    const research = await createResearch({ profileId, title, body: text });
    return NextResponse.json({ research });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "onbekende fout" },
      { status: 500 },
    );
  }
}
