// Research-endpoint (Research Tracking PRD): POST is the Phase 3 create path
// — runs the Phase 2 extraction, persists the note, and seeds + follows its
// thread synchronously (modules/research's createResearch) so the storyline
// exists immediately, before any pipeline run. GET (list)/DELETE/PATCH
// (archive) are Phase 4 — the MijnOnderzoek management component's API.
// Auth: profile-cookie (login-loos), same pattern as app/api/holdings/route.ts.

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createResearch, archiveResearch } from "@/modules/research";
import { getResearch } from "@/app/lib/queries";

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

/** List every research note for the signed-in profile, newest first — MijnOnderzoek's data source. */
export async function GET() {
  const profileId = await profileIdUitCookie();
  if (!profileId) {
    return NextResponse.json({ error: "geen profiel gekozen" }, { status: 401 });
  }

  try {
    const research = await getResearch(profileId);
    return NextResponse.json({ research });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "onbekende fout" },
      { status: 500 },
    );
  }
}

/**
 * Archive one research note (soft delete — keeps storyline history). DELETE
 * and PATCH are aliases for the same action here (locked decision: no hard
 * delete, no other patchable field yet), both taking the note id via
 * `?id=`. Scoped to the caller's own profile by archiveResearch.
 */
async function archiveHandler(request: NextRequest) {
  const profileId = await profileIdUitCookie();
  if (!profileId) {
    return NextResponse.json({ error: "geen profiel gekozen" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id verplicht" }, { status: 400 });
  }

  try {
    await archiveResearch(profileId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "onbekende fout" },
      { status: 500 },
    );
  }
}

export const DELETE = archiveHandler;
export const PATCH = archiveHandler;
