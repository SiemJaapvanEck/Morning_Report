// Follow / unfollow a single storyline (Phase C). The detail page's
// "Volg verhaallijn" button posts here; it drives the "Mijn verhalen" archive
// filter. Auth: the profile cookie (login-loos, like the other reader endpoints).

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { setThreadFollow } from "@/modules/preferences";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const profileId = cookieStore.get("mr_profile")?.value;
  if (!profileId) {
    return NextResponse.json({ error: "geen profiel gekozen" }, { status: 401 });
  }

  const body = (await request.json()) as { thread_id?: string; active?: boolean };
  if (!body.thread_id) {
    return NextResponse.json({ error: "thread_id verplicht" }, { status: 400 });
  }

  try {
    await setThreadFollow(profileId, body.thread_id, body.active ?? true);
    return NextResponse.json({ ok: true, active: body.active ?? true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
