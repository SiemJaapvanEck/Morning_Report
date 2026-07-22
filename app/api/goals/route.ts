// Goals-endpoint: het ene beleggingsdoel (ETA-gedreven) + de losse
// spaardoelen (docs/prd/finance.md, Phase 5). Eén actie-gebaseerde POST,
// zoals app/api/feedback/route.ts. Auth: profiel-cookie (login-loos).
//
// Locked decision (PRD §4 Phase 5): exactly one 'investment' goal per
// profile — creating a second one is rejected (409); edit the existing one
// instead. Savings goals are unlimited.

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/modules/shared/db";
import type { FinanceGoalKind } from "@/modules/shared/types";

async function profileIdUitCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("mr_profile")?.value ?? null;
}

export async function POST(request: NextRequest) {
  const profileId = await profileIdUitCookie();
  if (!profileId) {
    return NextResponse.json({ error: "geen profiel gekozen" }, { status: 401 });
  }

  const body = (await request.json()) as {
    action: "create" | "update" | "delete";
    id?: string;
    kind?: FinanceGoalKind;
    name?: string;
    target_eur?: number;
    target_date?: string | null;
    saved_eur?: number;
  };

  if (body.action === "create") {
    if (!body.kind || !body.name?.trim() || body.target_eur == null) {
      return NextResponse.json({ error: "kind, name en target_eur zijn verplicht" }, { status: 400 });
    }
    if (body.kind === "investment") {
      const { data: existing, error: existingError } = await db()
        .from("finance_goals")
        .select("id")
        .eq("profile_id", profileId)
        .eq("kind", "investment")
        .limit(1);
      if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
      if (existing && existing.length > 0) {
        return NextResponse.json(
          { error: "er bestaat al een beleggingsdoel — bewerk deze in plaats daarvan" },
          { status: 409 },
        );
      }
    }
    const { data, error } = await db()
      .from("finance_goals")
      .insert({
        profile_id: profileId,
        kind: body.kind,
        name: body.name.trim(),
        target_eur: body.target_eur,
        target_date: body.target_date || null,
        saved_eur: body.kind === "savings" ? body.saved_eur ?? 0 : 0,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ goal: data });
  }

  if (body.action === "update") {
    if (!body.id) return NextResponse.json({ error: "id verplicht" }, { status: 400 });
    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = body.name.trim();
    if (body.target_eur !== undefined) patch.target_eur = body.target_eur;
    if (body.target_date !== undefined) patch.target_date = body.target_date || null;
    if (body.saved_eur !== undefined) patch.saved_eur = body.saved_eur;
    const { error } = await db().from("finance_goals").update(patch).eq("id", body.id).eq("profile_id", profileId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete") {
    if (!body.id) return NextResponse.json({ error: "id verplicht" }, { status: 400 });
    const { error } = await db().from("finance_goals").delete().eq("id", body.id).eq("profile_id", profileId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "onbekende actie" }, { status: 400 });
}
