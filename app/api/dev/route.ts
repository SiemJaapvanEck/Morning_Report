// Developer-endpoint: quick pipeline test (tick-loop vanuit de UI), oude
// test-edities seeden en testdata opruimen. Auth: profiel-cookie, zoals de
// andere lezer-endpoints (login-loos ontwerp, vertrouwde gebruikers).

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { tick } from "@/modules/pipeline";
import { seedOudeEdities, opruimTestdata } from "@/modules/dev";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const profileId = cookieStore.get("mr_profile")?.value;
  if (!profileId) {
    return NextResponse.json({ error: "geen profiel gekozen" }, { status: 401 });
  }

  const body = (await request.json()) as {
    action: "tick" | "seed_oud" | "opruimen";
    dagen?: number;
  };

  try {
    if (body.action === "tick") {
      const result = await tick();
      return NextResponse.json(result);
    }
    if (body.action === "seed_oud") {
      const result = await seedOudeEdities(profileId, body.dagen ?? 4);
      return NextResponse.json(result);
    }
    if (body.action === "opruimen") {
      const result = await opruimTestdata(profileId);
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: "onbekende actie" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
