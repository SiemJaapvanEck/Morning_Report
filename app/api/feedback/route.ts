// Feedback-endpoint: ratings en volg-markeringen vanuit de lezer-UI.
// Auth: het profiel-cookie volstaat (geen login, vertrouwde gebruikers).

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/modules/shared/db";
import { applyFeedback } from "@/modules/rank";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const profileId = cookieStore.get("mr_profile")?.value;
  if (!profileId) {
    return NextResponse.json({ error: "geen profiel gekozen" }, { status: 401 });
  }

  const body = (await request.json()) as {
    action: "rating" | "volgen";
    target_type: "item" | "topic" | "category" | "source";
    target_id: string;
    rating?: number;
    tags?: string[];
    note?: string;
    active?: boolean;
  };

  if (body.action === "rating") {
    if (!body.rating || body.rating < 1 || body.rating > 5) {
      return NextResponse.json({ error: "rating 1-5 verplicht" }, { status: 400 });
    }
    // feedback-event vastleggen (geschiedenis + Sol's context)
    const { error } = await db().from("feedback_events").insert({
      profile_id: profileId,
      target_type: body.target_type,
      target_id: body.target_id,
      rating: body.rating,
      tags: body.tags ?? [],
      note: body.note ?? null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // scores direct bijwerken voor topic/categorie/bron;
    // item-ratings tellen via hun topic (komt in fase 4 met de volledige hiërarchie)
    if (body.target_type !== "item") {
      await applyFeedback(profileId, body.target_type, body.target_id, body.rating);
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "volgen") {
    const { error } = await db().from("follow_marks").upsert(
      {
        profile_id: profileId,
        target_type: body.target_type,
        target_id: body.target_id,
        active: body.active ?? true,
      },
      { onConflict: "profile_id,target_type,target_id" },
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "onbekende actie" }, { status: 400 });
}
