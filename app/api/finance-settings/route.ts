// Finance-settings-endpoint: het "verwacht rendement"-knopje op /financien
// (docs/prd/finance.md, Phase 5) — één rij per profiel
// (`unique (profile_id)`, migration 0019), dus een upsert i.p.v. insert.
// Auth: profiel-cookie (login-loos). Only `expected_return_pct` is written
// here — `monthly_contribution_override` is the Settings Financiën tab's
// seam (PRD amendment), not this phase's scope.

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

  const body = (await request.json()) as { expected_return_pct?: number };
  if (body.expected_return_pct == null || !Number.isFinite(body.expected_return_pct)) {
    return NextResponse.json({ error: "expected_return_pct is verplicht" }, { status: 400 });
  }

  const { data, error } = await db()
    .from("finance_settings")
    .upsert(
      {
        profile_id: profileId,
        expected_return_pct: body.expected_return_pct,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_id" },
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
