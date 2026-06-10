// Capture-endpoint: invoer vanaf de iOS Shortcut en de web-app.
// Auth via gedeeld geheim (CAPTURE_SECRET) — zie docs/setup.md voor de
// Shortcut-configuratie.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/modules/shared/db";

export async function POST(request: NextRequest) {
  const secret = process.env.CAPTURE_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "niet geautoriseerd" }, { status: 401 });
  }

  const body = (await request.json()) as {
    text?: string;
    kind?: "onderwerp" | "bron" | "notitie";
    profile_id?: string;
  };

  if (!body.text?.trim()) {
    return NextResponse.json({ error: "text is verplicht" }, { status: 400 });
  }

  const { error } = await db().from("captures").insert({
    text: body.text.trim(),
    kind: body.kind ?? "onderwerp",
    profile_id: body.profile_id ?? null,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
