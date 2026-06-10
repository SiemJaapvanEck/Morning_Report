// Web-variant van capture: zelfde werking als /api/capture, maar
// geauthenticeerd via het profiel-cookie in plaats van het gedeelde geheim.

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/modules/shared/db";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const profileId = cookieStore.get("mr_profile")?.value;
  if (!profileId) {
    return NextResponse.json({ error: "geen profiel gekozen" }, { status: 401 });
  }

  const body = (await request.json()) as {
    text?: string;
    kind?: "onderwerp" | "bron" | "notitie";
  };
  if (!body.text?.trim()) {
    return NextResponse.json({ error: "text is verplicht" }, { status: 400 });
  }

  const { error } = await db().from("captures").insert({
    text: body.text.trim(),
    kind: body.kind ?? "onderwerp",
    profile_id: profileId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
