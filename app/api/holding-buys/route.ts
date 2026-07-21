// Holding-buys-endpoint: individuele aankopen (DCA-geschiedenis) van een
// holding (docs/prd/finance.md, Phase 3). Eén actie-gebaseerde POST, zoals
// app/api/feedback/route.ts. Auth: profiel-cookie (login-loos).

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
    holding_id?: string;
    bought_on?: string;
    quantity?: number;
    price_native?: number;
    currency?: string;
    fee_eur?: number;
  };

  if (body.action === "create") {
    if (!body.holding_id || !body.bought_on || body.quantity == null || body.price_native == null || !body.currency) {
      return NextResponse.json(
        { error: "holding_id, bought_on, quantity, price_native en currency zijn verplicht" },
        { status: 400 },
      );
    }
    const { data, error } = await db()
      .from("holding_buys")
      .insert({
        profile_id: profileId,
        holding_id: body.holding_id,
        bought_on: body.bought_on,
        quantity: body.quantity,
        price_native: body.price_native,
        currency: body.currency.trim().toUpperCase(),
        fee_eur: body.fee_eur ?? 0,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ buy: data });
  }

  if (body.action === "update") {
    if (!body.id) return NextResponse.json({ error: "id verplicht" }, { status: 400 });
    const patch: Record<string, unknown> = {};
    if (body.bought_on !== undefined) patch.bought_on = body.bought_on;
    if (body.quantity !== undefined) patch.quantity = body.quantity;
    if (body.price_native !== undefined) patch.price_native = body.price_native;
    if (body.currency !== undefined) patch.currency = body.currency.trim().toUpperCase();
    if (body.fee_eur !== undefined) patch.fee_eur = body.fee_eur;
    const { error } = await db().from("holding_buys").update(patch).eq("id", body.id).eq("profile_id", profileId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete") {
    if (!body.id) return NextResponse.json({ error: "id verplicht" }, { status: 400 });
    const { error } = await db().from("holding_buys").delete().eq("id", body.id).eq("profile_id", profileId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "onbekende actie" }, { status: 400 });
}
