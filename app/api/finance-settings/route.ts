// Finance-settings-endpoint: het "verwacht rendement"-knopje op /financien
// (docs/prd/finance.md, Phase 5) plus the Instellingen Financiën tab's
// maandelijkse-inleg-override quick-edit (docs/prd/settings-tabs.md, Phase
// 3, MOR-17) — één rij per profiel (`unique (profile_id)`, migration 0019),
// dus een upsert i.p.v. insert. Auth: profiel-cookie (login-loos).
//
// Partial upsert: the body may carry either field or both — a caller that
// only sends `expected_return_pct` (the /financien Goals section) must not
// clobber an already-saved `monthly_contribution_override` (the Instellingen
// tab), and vice versa. We read the existing row first and fall back to it
// (or a sane default) for whichever field the body omits.

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/modules/shared/db";
import type { FinanceSettings } from "@/modules/shared/types";

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
    expected_return_pct?: number;
    monthly_contribution_override?: number | null;
  };

  if (body.expected_return_pct === undefined && body.monthly_contribution_override === undefined) {
    return NextResponse.json({ error: "niets om op te slaan" }, { status: 400 });
  }
  if (body.expected_return_pct !== undefined && !Number.isFinite(body.expected_return_pct)) {
    return NextResponse.json({ error: "expected_return_pct is ongeldig" }, { status: 400 });
  }
  if (
    body.monthly_contribution_override !== undefined &&
    body.monthly_contribution_override !== null &&
    !Number.isFinite(body.monthly_contribution_override)
  ) {
    return NextResponse.json({ error: "monthly_contribution_override is ongeldig" }, { status: 400 });
  }

  const { data: existingRows, error: existingError } = await db()
    .from("finance_settings")
    .select("*")
    .eq("profile_id", profileId)
    .limit(1);
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
  const existing = ((existingRows as FinanceSettings[] | null) ?? [])[0] ?? null;

  const { data, error } = await db()
    .from("finance_settings")
    .upsert(
      {
        profile_id: profileId,
        expected_return_pct: body.expected_return_pct ?? existing?.expected_return_pct ?? 7,
        monthly_contribution_override:
          body.monthly_contribution_override !== undefined
            ? body.monthly_contribution_override
            : (existing?.monthly_contribution_override ?? null),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_id" },
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
