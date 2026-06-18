"use client";

// Voorkeurenkiezer: per onderwerp volgen/niet-volgen + relevantie (−2…+2,
// dezelfde schaal als de kaart-rating). Eigen onderwerpen — hoe specifiek
// ook, bv. één AI-bedrijf — kunnen erbij, eventueel in een eigen categorie.
// Gebruikt in de onboarding (defaults voorgeselecteerd) en in Instellingen.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Category, Source, Topic } from "@/modules/shared/types";

interface Keuze {
  volgen: boolean;
  relevantie: number;
  /** dit onderwerp als doorlopende verhaallijn (thread) bijhouden */
  track: boolean;
}

interface PendingTopic {
  naam: string;
  category_id?: string;
  nieuwe_categorie?: string;
  relevantie: number;
  zoektekst?: string;
  source_id?: string;
}

const RELEVANTIES = [-2, -1, 0, 1, 2] as const;

function RelevantieKiezer({
  waarde,
  onKies,
}: {
  waarde: number;
  onKies: (relevantie: number) => void;
}) {
  return (
    <span className="inline-flex items-center gap-px">
      {RELEVANTIES.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onKies(value)}
          className={`min-w-6 rounded px-1 py-0.5 text-xs font-medium leading-none transition-colors ${
            waarde === value
              ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
              : "text-stone-400 hover:text-amber-500"
          }`}
        >
          {value > 0 ? `+${value}` : value}
        </button>
      ))}
    </span>
  );
}

export function VoorkeurenKiezer({
  categories,
  topics,
  sources: sourcesInitieel,
  initieel,
  modus,
}: {
  categories: Category[];
  topics: Topic[];
  /** actieve bronnen, voor de optionele topic ↔ bron-koppeling */
  sources: Source[];
  /** huidige stand per topic_id; ontbreekt een topic, dan geldt de modus-default */
  initieel: Record<string, Keuze>;
  modus: "onboarding" | "instellingen";
}) {
  const router = useRouter();
  const [keuzes, setKeuzes] = useState<Record<string, Keuze>>(() => {
    const start: Record<string, Keuze> = {};
    for (const topic of topics) {
      start[topic.id] = initieel[topic.id] ?? { volgen: false, relevantie: 1, track: false };
    }
    return start;
  });
  // Bronnen zijn stateful: een net toegevoegde feed verschijnt meteen in de lijst.
  const [sources, setSources] = useState<Source[]>(sourcesInitieel);
  const [pending, setPending] = useState<PendingTopic[]>([]);
  const [nieuwNaam, setNieuwNaam] = useState("");
  const [nieuwCategorie, setNieuwCategorie] = useState<string>(categories[0]?.id ?? "");
  const [eigenCategorie, setEigenCategorie] = useState("");
  const [nieuwZoektekst, setNieuwZoektekst] = useState("");
  const [nieuwBron, setNieuwBron] = useState(""); // "" = alle bronnen (normale zoekweg)
  const [nieuwRelevantie, setNieuwRelevantie] = useState(1);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  // Eigen feed toevoegen aan de gedeelde broncatalogus.
  const [bronNaam, setBronNaam] = useState("");
  const [bronUrl, setBronUrl] = useState("");
  const [bronCategorie, setBronCategorie] = useState<string>(categories[0]?.id ?? "");
  const [bronBezig, setBronBezig] = useState(false);
  const [bronFout, setBronFout] = useState<string | null>(null);
  const [bronOk, setBronOk] = useState<string | null>(null);

  const perCategorie = useMemo(
    () =>
      categories.map((category) => ({
        category,
        topics: topics.filter((topic) => topic.category_id === category.id),
      })),
    [categories, topics],
  );

  function zetKeuze(topicId: string, patch: Partial<Keuze>) {
    setKeuzes((prev) => ({ ...prev, [topicId]: { ...prev[topicId], ...patch } }));
  }

  function voegPendingToe() {
    if (!nieuwNaam.trim()) return;
    setPending((prev) => [
      ...prev,
      {
        naam: nieuwNaam.trim(),
        category_id: eigenCategorie.trim() ? undefined : nieuwCategorie,
        nieuwe_categorie: eigenCategorie.trim() || undefined,
        relevantie: nieuwRelevantie,
        zoektekst: nieuwZoektekst.trim() || undefined,
        source_id: nieuwBron || undefined,
      },
    ]);
    setNieuwNaam("");
    setNieuwZoektekst("");
    setEigenCategorie("");
    setNieuwBron("");
    setNieuwRelevantie(1);
  }

  async function voegBronToe() {
    if (!bronNaam.trim() || !bronUrl.trim()) return;
    setBronBezig(true);
    setBronFout(null);
    setBronOk(null);
    const response = await fetch("/api/bronnen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        naam: bronNaam.trim(),
        url: bronUrl.trim(),
        category_id: bronCategorie || null,
      }),
    });
    setBronBezig(false);
    const data = (await response.json().catch(() => null)) as
      | { source?: Source; error?: string }
      | null;
    if (!response.ok || !data?.source) {
      setBronFout(data?.error ?? "Feed toevoegen mislukt — controleer de URL.");
      return;
    }
    // dedupe op id: een bestaande feed (zelfde url) komt ongewijzigd terug
    setSources((prev) =>
      prev.some((s) => s.id === data.source!.id) ? prev : [...prev, data.source!],
    );
    setNieuwBron(data.source.id); // koppel 'm meteen voor een nieuw onderwerp
    setBronOk(`'${data.source.name}' toegevoegd.`);
    setBronNaam("");
    setBronUrl("");
  }

  async function opslaan() {
    setBezig(true);
    setFout(null);
    const response = await fetch("/api/voorkeuren", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keuzes: Object.entries(keuzes).map(([topic_id, keuze]) => ({ topic_id, ...keuze })),
        nieuwe_topics: pending,
        // alleen gevolgde onderwerpen kunnen als verhaallijn worden bijgehouden
        tracked_topic_ids: Object.entries(keuzes)
          .filter(([, keuze]) => keuze.volgen && keuze.track)
          .map(([topic_id]) => topic_id),
        onboarding_afgerond: true,
      }),
    });
    setBezig(false);
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setFout(data?.error ?? "Opslaan mislukt — probeer het nog eens.");
      return;
    }
    setPending([]);
    if (modus === "onboarding") {
      router.push("/");
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {perCategorie.map(({ category, topics: catTopics }) =>
        catTopics.length === 0 ? null : (
          <section key={category.id}>
            <h3 className="text-sm font-semibold">{category.name}</h3>
            <ul className="mt-2 space-y-1.5">
              {catTopics.map((topic) => {
                const keuze = keuzes[topic.id];
                return (
                  <li key={topic.id} className="flex items-center justify-between gap-3">
                    <label className="flex min-w-0 cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={keuze.volgen}
                        onChange={(event) => zetKeuze(topic.id, { volgen: event.target.checked })}
                        className="h-4 w-4 accent-amber-500"
                      />
                      <span className={`truncate ${keuze.volgen ? "" : "text-stone-400"}`}>
                        {topic.name}
                        {topic.query_mode && (
                          <span className="ml-1.5 text-xs text-sky-600" title={topic.query_text ?? ""}>
                            · specifiek
                          </span>
                        )}
                        {topic.source_id && (
                          <span className="ml-1.5 text-xs text-stone-400">
                            · {sources.find((s) => s.id === topic.source_id)?.name ?? "vaste bron"}
                          </span>
                        )}
                      </span>
                    </label>
                    {keuze.volgen && (
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => zetKeuze(topic.id, { track: !keuze.track })}
                          aria-pressed={keuze.track}
                          title="Als doorlopende verhaallijn bijhouden — ook gewoon nieuws bouwt de lijn op"
                          className={`rounded px-1.5 py-0.5 text-xs font-medium leading-none transition-colors ${
                            keuze.track
                              ? "bg-[#2f6df0]/10 text-[#2f6df0] dark:bg-[#2f6df0]/20"
                              : "text-stone-400 hover:text-[#2f6df0]"
                          }`}
                        >
                          ✦ Verhaallijn
                        </button>
                        <RelevantieKiezer
                          waarde={keuze.relevantie}
                          onKies={(relevantie) => zetKeuze(topic.id, { relevantie })}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ),
      )}

      {/* Eigen onderwerp */}
      <section className="rounded-xl border border-stone-200 p-4 dark:border-stone-800">
        <h3 className="text-sm font-semibold">Eigen onderwerp volgen</h3>
        <p className="mt-1 text-xs text-stone-500">
          Hoe specifiek je wilt — bv. één bedrijf. Met een zoektekst wordt het onderwerp
          &apos;s ochtends ook actief opgezocht. Koppel je een vaste bron, dan komt dit
          onderwerp direct uit die bron; anders geldt de normale zoekweg.
        </p>
        <div className="mt-3 space-y-2">
          <input
            value={nieuwNaam}
            onChange={(event) => setNieuwNaam(event.target.value)}
            placeholder="Naam, bv. Anthropic"
            className="w-full rounded-lg border border-stone-300 bg-transparent px-3 py-1.5 text-sm dark:border-stone-700"
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={nieuwCategorie}
              onChange={(event) => setNieuwCategorie(event.target.value)}
              disabled={eigenCategorie.trim().length > 0}
              className="rounded-lg border border-stone-300 bg-transparent px-2 py-1.5 text-sm disabled:opacity-40 dark:border-stone-700 dark:bg-stone-900"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <span className="text-xs text-stone-400">of</span>
            <input
              value={eigenCategorie}
              onChange={(event) => setEigenCategorie(event.target.value)}
              placeholder="nieuwe categorie"
              className="w-36 rounded-lg border border-stone-300 bg-transparent px-3 py-1.5 text-sm dark:border-stone-700"
            />
          </div>
          <input
            value={nieuwZoektekst}
            onChange={(event) => setNieuwZoektekst(event.target.value)}
            placeholder="Zoektekst (optioneel), bv. Anthropic OR Claude"
            className="w-full rounded-lg border border-stone-300 bg-transparent px-3 py-1.5 text-sm dark:border-stone-700"
          />
          <select
            value={nieuwBron}
            onChange={(event) => setNieuwBron(event.target.value)}
            className="w-full rounded-lg border border-stone-300 bg-transparent px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-900"
          >
            <option value="">Bron: alle bronnen (normale zoekweg)</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                Alleen uit: {source.name}
              </option>
            ))}
          </select>

          {/* Eigen feed toevoegen aan de gedeelde lijst */}
          <details className="rounded-lg border border-dashed border-stone-300 px-3 py-2 dark:border-stone-700">
            <summary className="cursor-pointer text-xs text-stone-500">
              Feed niet in de lijst? Voeg een RSS-feed toe
            </summary>
            <div className="mt-2 space-y-2">
              <input
                value={bronNaam}
                onChange={(event) => setBronNaam(event.target.value)}
                placeholder="Bronnaam, bv. PR Newswire M&amp;A"
                className="w-full rounded-lg border border-stone-300 bg-transparent px-3 py-1.5 text-sm dark:border-stone-700"
              />
              <input
                value={bronUrl}
                onChange={(event) => setBronUrl(event.target.value)}
                placeholder="https://… (RSS/Atom-URL)"
                className="w-full rounded-lg border border-stone-300 bg-transparent px-3 py-1.5 text-sm dark:border-stone-700"
              />
              <div className="flex items-center justify-between gap-2">
                <select
                  value={bronCategorie}
                  onChange={(event) => setBronCategorie(event.target.value)}
                  className="rounded-lg border border-stone-300 bg-transparent px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-900"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={voegBronToe}
                  disabled={bronBezig || !bronNaam.trim() || !bronUrl.trim()}
                  className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-stone-100 dark:text-stone-900"
                >
                  {bronBezig ? "Valideren…" : "Valideer & voeg toe"}
                </button>
              </div>
              {bronFout && <p className="text-xs text-red-600">{bronFout}</p>}
              {bronOk && <p className="text-xs text-emerald-600">{bronOk}</p>}
            </div>
          </details>
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-500">
              Relevantie: <RelevantieKiezer waarde={nieuwRelevantie} onKies={setNieuwRelevantie} />
            </span>
            <button
              type="button"
              onClick={voegPendingToe}
              disabled={!nieuwNaam.trim()}
              className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-stone-100 dark:text-stone-900"
            >
              Toevoegen
            </button>
          </div>
        </div>
        {pending.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {pending.map((topic, i) => (
              <li
                key={`${topic.naam}-${i}`}
                className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200"
              >
                {topic.naam} ({topic.relevantie > 0 ? `+${topic.relevantie}` : topic.relevantie})
                <button
                  type="button"
                  onClick={() => setPending((prev) => prev.filter((_, j) => j !== i))}
                  aria-label={`${topic.naam} verwijderen`}
                  className="text-amber-500 hover:text-amber-700"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {fout && <p className="text-sm text-red-600">{fout}</p>}

      <button
        type="button"
        onClick={opslaan}
        disabled={bezig}
        className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
      >
        {bezig ? "Opslaan…" : modus === "onboarding" ? "Klaar — naar mijn krant" : "Voorkeuren opslaan"}
      </button>
    </div>
  );
}
