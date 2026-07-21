// Holdings-endpoint: manueel ingevoerde instrumenten (Yahoo-ticker) voor de
// portefeuille (docs/prd/finance.md, Phase 3). Eén actie-gebaseerde POST,
// zoals app/api/feedback/route.ts. Auth: profiel-cookie (login-loos).
// Verwijderen cascadeert naar holding_buys (FK on delete cascade, 0019).

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/modules/shared/db";
import type { HoldingKind } from "@/modules/shared/types";

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
    symbol?: string;
    name?: string | null;
    kind?: HoldingKind;
    currency?: string;
  };

  if (body.action === "create") {
    if (!body.symbol?.trim() || !body.currency?.trim()) {
      return NextResponse.json({ error: "symbol en currency zijn verplicht" }, { status: 400 });
    }
    const { data, error } = await db()
      .from("holdings")
      .insert({
        profile_id: profileId,
        symbol: body.symbol.trim().toUpperCase(),
        name: body.name?.trim() || null,
        kind: body.kind ?? "aandeel",
        currency: body.currency.trim().toUpperCase(),
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ holding: data });
  }

  if (body.action === "update") {
    if (!body.id) return NextResponse.json({ error: "id verplicht" }, { status: 400 });
    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = body.name?.trim() || null;
    if (body.kind !== undefined) patch.kind = body.kind;
    if (body.currency !== undefined) patch.currency = body.currency.trim().toUpperCase();
    const { error } = await db().from("holdings").update(patch).eq("id", body.id).eq("profile_id", profileId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete") {
    if (!body.id) return NextResponse.json({ error: "id verplicht" }, { status: 400 });
    const { error } = await db().from("holdings").delete().eq("id", body.id).eq("profile_id", profileId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "onbekende actie" }, { status: 400 });
}
