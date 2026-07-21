// Expenses-endpoint: manueel ingevoerde gecategoriseerde uitgaven voor de
// maandelijkse cashflow-rapportage (docs/prd/finance.md, Phase 4). Eén
// actie-gebaseerde POST, zoals app/api/feedback/route.ts. Auth:
// profiel-cookie (login-loos).

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/modules/shared/db";

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
    spent_on?: string;
    category?: string;
    label?: string | null;
    amount_eur?: number;
    recurring?: boolean;
  };

  if (body.action === "create") {
    if (!body.spent_on || !body.category?.trim() || body.amount_eur == null) {
      return NextResponse.json({ error: "spent_on, category en amount_eur zijn verplicht" }, { status: 400 });
    }
    const { data, error } = await db()
      .from("expenses")
      .insert({
        profile_id: profileId,
        spent_on: body.spent_on,
        category: body.category.trim(),
        label: body.label?.trim() || null,
        amount_eur: body.amount_eur,
        recurring: body.recurring ?? false,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ expense: data });
  }

  if (body.action === "update") {
    if (!body.id) return NextResponse.json({ error: "id verplicht" }, { status: 400 });
    const patch: Record<string, unknown> = {};
    if (body.spent_on !== undefined) patch.spent_on = body.spent_on;
    if (body.category !== undefined) patch.category = body.category.trim();
    if (body.label !== undefined) patch.label = body.label?.trim() || null;
    if (body.amount_eur !== undefined) patch.amount_eur = body.amount_eur;
    if (body.recurring !== undefined) patch.recurring = body.recurring;
    const { error } = await db().from("expenses").update(patch).eq("id", body.id).eq("profile_id", profileId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete") {
    if (!body.id) return NextResponse.json({ error: "id verplicht" }, { status: 400 });
    const { error } = await db().from("expenses").delete().eq("id", body.id).eq("profile_id", profileId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "onbekende actie" }, { status: 400 });
}
