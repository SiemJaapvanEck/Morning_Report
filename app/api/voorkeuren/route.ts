// Voorkeuren-endpoint: welke onderwerpen het profiel volgt en hoe relevant.
// GET levert de kieslijst (categorieën + topics + huidige stand); POST slaat
// de set op en/of maakt eigen topics aan. Auth: profiel-cookie (login-loos).

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, unwrap } from "@/modules/shared/db";
import {
  applyPreferences,
  applyThreadTracking,
  createUserTopic,
  type NieuwTopic,
  type VoorkeurKeuze,
} from "@/modules/preferences";
import type { Profile } from "@/modules/shared/types";

async function profileIdUitCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("mr_profile")?.value ?? null;
}

export async function GET() {
  const profileId = await profileIdUitCookie();
  if (!profileId) {
    return NextResponse.json({ error: "geen profiel gekozen" }, { status: 401 });
  }

  const [categories, topics, scores, marks] = await Promise.all([
    unwrap(await db().from("categories").select("*").order("position")),
    unwrap(await db().from("topics").select("*").order("name")),
    unwrap(
      await db()
        .from("topic_scores")
        .select("target_type, target_id, score")
        .eq("profile_id", profileId),
    ),
    unwrap(
      await db()
        .from("follow_marks")
        .select("target_type, target_id, active")
        .eq("profile_id", profileId)
        .eq("target_type", "topic"),
    ),
  ]);

  return NextResponse.json({ categories, topics, scores, marks });
}

export async function POST(request: NextRequest) {
  const profileId = await profileIdUitCookie();
  if (!profileId) {
    return NextResponse.json({ error: "geen profiel gekozen" }, { status: 401 });
  }

  const body = (await request.json()) as {
    keuzes?: VoorkeurKeuze[];
    nieuwe_topics?: NieuwTopic[];
    /** volledige set topic_ids die als verhaallijn gevolgd moeten worden */
    tracked_topic_ids?: string[];
    onboarding_afgerond?: boolean;
  };

  try {
    if (body.keuzes?.length) {
      await applyPreferences(profileId, body.keuzes);
    }
    for (const nieuw of body.nieuwe_topics ?? []) {
      await createUserTopic(profileId, nieuw);
    }
    if (body.tracked_topic_ids !== undefined) {
      await applyThreadTracking(profileId, body.tracked_topic_ids);
    }

    if (body.onboarding_afgerond) {
      const profile = unwrap(
        await db().from("profiles").select("*").eq("id", profileId).single(),
      ) as Profile;
      await db()
        .from("profiles")
        .update({ settings: { ...profile.settings, voorkeuren_ingesteld: true } })
        .eq("id", profileId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
