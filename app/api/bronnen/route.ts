// Bronnen-endpoint: een nieuwe RSS-feed aan de gedeelde broncatalogus toevoegen.
// POST valideert de URL (parset 'm echt) en maakt de bron aan; de gemaakte bron
// komt terug zodat de UI 'm meteen kan koppelen. Auth: profiel-cookie.

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createUserSource } from "@/modules/preferences";

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
    naam?: string;
    url?: string;
    category_id?: string | null;
  };

  if (!body.naam?.trim() || !body.url?.trim()) {
    return NextResponse.json({ error: "Naam en URL zijn verplicht." }, { status: 400 });
  }

  try {
    const source = await createUserSource({
      naam: body.naam,
      url: body.url,
      category_id: body.category_id ?? null,
    });
    return NextResponse.json({ source });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
