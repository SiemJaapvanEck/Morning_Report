// Profielkeuze: zet het mr_profile-cookie (lokaal onthouden, geen login)
// en maakt nieuwe profielen aan.

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, unwrap } from "@/modules/shared/db";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { profile_id?: string; name?: string };
  const cookieStore = await cookies();

  // bestaand profiel kiezen
  if (body.profile_id) {
    cookieStore.set("mr_profile", body.profile_id, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
    return NextResponse.json({ ok: true });
  }

  // nieuw profiel aanmaken
  if (body.name?.trim()) {
    const profile = unwrap(
      await db().from("profiles").insert({ name: body.name.trim() }).select().single(),
    );
    cookieStore.set("mr_profile", profile.id, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
    return NextResponse.json({ ok: true, profile_id: profile.id });
  }

  return NextResponse.json({ error: "profile_id of name verplicht" }, { status: 400 });
}
