// Developer-modus: testdata en hulpfuncties om de app te kunnen testen
// zonder op de ochtend-pipeline te wachten.
//
// - seedOudeEdities: complete edities op oude datums (artikelen mét oude
//   published_at, afbeeldingen, match-scores) — geen AI-kosten, puur data.
// - opruimTestdata: verwijdert alles wat geseed is (herkenbaar aan het
//   dev-guid-voorvoegsel), inclusief de bijbehorende edities.
//
// De "quick pipeline test" zelf is gewoon tick() uit modules/pipeline,
// aangeroepen via /api/dev — exact dezelfde code als productie.

import { db, unwrap } from "../shared/db";
import type { Category } from "../shared/types";

const DEV_GUID_PREFIX = "dev-test-";

interface TestArtikel {
  titel: string;
  samenvatting: string;
  categorieSlug: string;
  /** 0..1 — wordt de match-score in de editie */
  match: number;
  band: "deep" | "summary" | "headline";
  solNote?: string;
}

// Vaste, herkenbare testset — per dag hergebruikt met de dag-index in de
// guid zodat elke dag eigen item-rijen krijgt.
const TEST_ARTIKELEN: TestArtikel[] = [
  {
    titel: "Anthropic toont nieuw redeneer-model voor agents",
    samenvatting:
      "Het lab demonstreert een model dat meerstaps-taken plant en uitvoert met minder toezicht. Eerste benchmarks tonen een flinke sprong in betrouwbaarheid.",
    categorieSlug: "tech",
    match: 0.92,
    band: "deep",
    solNote: "Dit raakt direct aan je AI-interesse — de agent-richting wordt serieus.",
  },
  {
    titel: "ASML verhoogt outlook na sterke chipvraag",
    samenvatting:
      "De Veldhovense machinebouwer ziet de vraag naar EUV-systemen aanhouden en schroeft de jaarverwachting op. Analisten reageren positief.",
    categorieSlug: "financieel",
    match: 0.84,
    band: "deep",
  },
  {
    titel: "Doorbraak in zonnecel-rendement: 31% in het lab",
    samenvatting:
      "Onderzoekers combineren perovskiet met silicium en doorbreken de 30%-grens. Productie op schaal is de volgende horde.",
    categorieSlug: "wetenschap",
    match: 0.78,
    band: "summary",
  },
  {
    titel: "Spanningen rond handelsverdrag lopen op voor top",
    samenvatting:
      "Onderhandelaars zien de posities verharden in aanloop naar de top van volgende week. Een compromis over tarieven ligt nog open.",
    categorieSlug: "wereld",
    match: 0.66,
    band: "summary",
  },
  {
    titel: "Buurtinitiatief bouwt voedselbos op braakliggend terrein",
    samenvatting:
      "Vrijwilligers vormden een kale stadskavel om tot een eetbaar bos met 400 soorten. De gemeente wil het model nu breder uitrollen.",
    categorieSlug: "goed-nieuws",
    match: 0.71,
    band: "summary",
    solNote: "Klein verhaal, maar precies het soort goed nieuws dat je dag opent.",
  },
  {
    titel: "Nieuwe GPU-generatie aangekondigd met fors lager verbruik",
    samenvatting:
      "De volgende architectuur belooft 40% efficiëntiewinst bij gelijke prestaties. Releases volgen in het najaar.",
    categorieSlug: "tech",
    match: 0.58,
    band: "headline",
  },
  {
    titel: "Centrale bank houdt rente gelijk, hint op verlaging",
    samenvatting:
      "Het rentebesluit viel zoals verwacht; de toelichting suggereert ruimte voor een verlaging later dit jaar.",
    categorieSlug: "financieel",
    match: 0.49,
    band: "headline",
  },
  {
    titel: "Ruimtetelescoop vangt oudste sterrenstelsel tot nu toe",
    samenvatting:
      "Het licht reisde 13,4 miljard jaar; het stelsel blijkt verrassend compact en helder voor zijn leeftijd.",
    categorieSlug: "wetenschap",
    match: 0.55,
    band: "headline",
  },
];

/**
 * Seedt complete edities op oude datums voor een profiel (gisteren t/m
 * `dagen` terug). Bestaat er al een editie op zo'n datum, dan wordt die dag
 * overgeslagen — bestaande (echte) data blijft altijd staan.
 */
export async function seedOudeEdities(
  profileId: string,
  dagen = 4,
): Promise<{ datums: string[]; artikelen: number }> {
  const categories = unwrap(await db().from("categories").select("*")) as Category[];
  const categorieVoor = new Map(categories.map((c) => [c.slug, c]));

  const datums: string[] = [];
  let artikelen = 0;

  for (let terug = 1; terug <= dagen; terug++) {
    const datum = new Date(Date.now() - terug * 24 * 60 * 60 * 1000);
    const datumStr = datum.toISOString().slice(0, 10);

    const bestaand = await db()
      .from("editions")
      .select("id")
      .eq("profile_id", profileId)
      .eq("date", datumStr)
      .maybeSingle();
    if (bestaand.data) continue;

    const edition = unwrap(
      await db()
        .from("editions")
        .insert({
          profile_id: profileId,
          date: datumStr,
          status: "done",
          finished_at: new Date(datum.getTime() + 7 * 60 * 60 * 1000).toISOString(),
          front_page: {
            intro:
              `Testeditie van ${datumStr}. Goedemorgen! Dit is geseedde ontwikkel-data ` +
              "zodat je het archief, de editie-punten en de kaarten kunt testen — " +
              "op te ruimen via Instellingen → Developer.",
          },
        })
        .select()
        .single(),
    );

    // weersectie met een plausibel snapshot
    await db().from("edition_sections").insert({
      edition_id: edition.id,
      kind: "weather",
      title: "Weer",
      position: 0,
      payload: {
        plaats: "Testdorp",
        temp_nu: 9 + terug,
        temp_min: 6,
        temp_max: 14 + terug,
        neerslag_kans: 20 * (terug % 4),
        weer_code: 3,
        omschrijving: "half bewolkt",
        wind_kmh: 12,
      },
    });

    // artikelen per categorie groeperen, secties + items aanmaken
    const perCategorie = new Map<string, TestArtikel[]>();
    for (const artikel of TEST_ARTIKELEN) {
      const lijst = perCategorie.get(artikel.categorieSlug) ?? [];
      lijst.push(artikel);
      perCategorie.set(artikel.categorieSlug, lijst);
    }

    let positie = 1;
    for (const [slug, lijst] of perCategorie) {
      const categorie = categorieVoor.get(slug);
      if (!categorie) continue;

      const section = unwrap(
        await db()
          .from("edition_sections")
          .insert({
            edition_id: edition.id,
            kind: "category",
            category_id: categorie.id,
            title: categorie.name,
            position: positie++,
          })
          .select()
          .single(),
      );

      for (let i = 0; i < lijst.length; i++) {
        const artikel = lijst[i];
        const guid = `${DEV_GUID_PREFIX}${datumStr}-${slug}-${i}`;
        const item = unwrap(
          await db()
            .from("items")
            .insert({
              source_id: null,
              category_id: categorie.id,
              guid,
              url: `https://example.org/test/${guid}`,
              title: artikel.titel,
              raw_summary: artikel.samenvatting,
              published_at: new Date(datum.getTime() + 5 * 60 * 60 * 1000).toISOString(),
              fetched_at: new Date(datum.getTime() + 6 * 60 * 60 * 1000).toISOString(),
              is_ad: false,
              importance: artikel.match,
              image_url: `https://picsum.photos/seed/${guid}/640/400`,
            })
            .select()
            .single(),
        );

        await db().from("edition_items").insert({
          edition_id: edition.id,
          section_id: section.id,
          item_id: item.id,
          band: artikel.band,
          position: i,
          summary_text: artikel.samenvatting,
          sol_note: artikel.solNote ?? null,
          // kleine variatie per dag zodat de volgorde niet elke dag identiek is
          match_score: Math.max(0.05, Math.min(1, artikel.match - terug * 0.02)),
        });
        artikelen++;
      }
    }

    datums.push(datumStr);
  }

  return { datums, artikelen };
}

/** Verwijdert alle geseedde testdata (items + de test-edities). */
export async function opruimTestdata(profileId: string): Promise<{ edities: number; items: number }> {
  // edities herkennen aan test-items die eraan hangen
  const testItems = unwrap(
    await db().from("items").select("id").like("guid", `${DEV_GUID_PREFIX}%`),
  ) as { id: string }[];

  let edities = 0;
  if (testItems.length > 0) {
    const itemIds = testItems.map((item) => item.id);
    const koppels = unwrap(
      await db().from("edition_items").select("edition_id").in("item_id", itemIds),
    ) as { edition_id: string }[];
    const editionIds = [...new Set(koppels.map((k) => k.edition_id))];

    if (editionIds.length > 0) {
      // cascade ruimt sections + edition_items op
      const { error } = await db()
        .from("editions")
        .delete()
        .in("id", editionIds)
        .eq("profile_id", profileId);
      if (error) throw new Error(`Opruimen edities: ${error.message}`);
      edities = editionIds.length;
    }

    const { error } = await db().from("items").delete().in("id", itemIds);
    if (error) throw new Error(`Opruimen items: ${error.message}`);
  }

  return { edities, items: testItems.length };
}
