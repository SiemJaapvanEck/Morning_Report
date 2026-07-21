// Getypeerde spiegel van het Supabase-schema (supabase/migrations/0001_init.sql).
// Handmatig bijgehouden tot er een Supabase-project is voor codegen.

export type Cadence = "altijd" | "wekelijks" | "groot_nieuws";
export type StepStatus = "pending" | "running" | "done" | "failed" | "skipped";
export type EditionStatus = "pending" | "running" | "done" | "failed";
export type Band = "deep" | "summary" | "headline";
export type SectionKind =
  | "weather"
  | "category"
  | "sol"
  | "discovery"
  | "trivia"
  | "calendar"
  | "on_this_day";
export type TargetType = "item" | "topic" | "category" | "source";

export interface Profile {
  id: string;
  name: string;
  settings: ProfileSettings;
  created_at: string;
}

export interface ProfileSettings {
  /** Locatie voor de weermodule */
  lat?: number;
  lon?: number;
  plaats?: string;
  /** true zodra de gebruiker de voorkeuren-onboarding heeft afgerond */
  voorkeuren_ingesteld?: boolean;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  position: number;
}

export interface Topic {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  cadence: Cadence;
  query_mode: boolean;
  query_text: string | null;
  /** optionele vaste bron: items uit deze bron krijgen dit topic direct */
  source_id: string | null;
  created_at: string;
}

export interface Source {
  id: string;
  category_id: string | null;
  name: string;
  kind: "rss" | "api" | "query";
  /** content type: plain article vs explainer media for the catch-up step */
  medium: "article" | "podcast" | "video";
  url: string | null;
  active: boolean;
  weight: number;
  last_fetched_at: string | null;
  last_error: string | null;
  created_at: string;
}

/** Playable media on an item (catch-up). Stored under items.scan_meta.media. */
export interface MediaMeta {
  type: "podcast" | "video";
  url: string;
  durationSec: number | null;
}

export interface TopicScore {
  id: string;
  profile_id: string;
  target_type: "topic" | "category" | "source";
  target_id: string;
  score: number;
  updated_at: string;
}

export interface Item {
  id: string;
  source_id: string | null;
  category_id: string | null;
  topic_id: string | null;
  guid: string | null;
  url: string | null;
  title: string;
  raw_summary: string | null;
  /** full article body as plain text (from the feed's content:encoded), or null */
  content: string | null;
  published_at: string | null;
  fetched_at: string;
  content_hash: string | null;
  is_ad: boolean;
  importance: number | null;
  scan_meta: Record<string, unknown> | null;
  image_url: string | null;
}

export interface Edition {
  id: string;
  profile_id: string;
  date: string;
  status: EditionStatus;
  front_page: FrontPage | null;
  created_at: string;
  finished_at: string | null;
}

export interface FrontPage {
  intro?: string;
  top_items?: { item_id: string; title: string; section_title: string }[];
  weather?: WeatherSnapshot;
  /** aantal items per wereldregio (RegioCode → telling) voor de nieuwskaart */
  regios?: Record<string, number>;
  /** beurssnapshot per regio voor de markten-kaart */
  markten?: MarktSnapshot;
  /** neutral, topic-driven cross-reference synthesis of the day (depth-2 layer) */
  daily_paper?: string;
  /** short summary of the day — also rendered as the front-page Daily Paper block */
  dp_summary?: string;
  /** intro explaining the day's topics + the paper's layout */
  dp_intro?: string;
  /** the Daily Paper body: one article per followed thread + one broad general article */
  dp_articles?: DailyPaperArticle[];
  /** per-section editorial text: a one-sentence caption + a small category summary */
  dp_sections?: DailyPaperSection[];
}

/** Sol's editorial intro for one newspaper section: a punchy caption + a short roundup. */
export interface DailyPaperSection {
  /** the section/category title this text belongs to (matches edition_sections.title) */
  title: string;
  /** one-sentence angle on the section's news (Sol's framing) */
  caption: string;
  /** a small 2-3 sentence summary of what happened in this category today */
  summary: string;
}

/** One Daily Paper article — a thread update (followed topic) or the broad general roundup. */
/**
 * A short, source-grounded forecast attached to a thread (Phase C). Only ever set
 * when the model could name a concrete basis in the thread's news/events; no basis
 * ⇒ null. Mirrored into a linked calendar_event so it flows into agenda + archive.
 */
export interface ThreadPrediction {
  /** the forecast itself (Dutch, 1-2 sentences) */
  text: string;
  /** when it is expected to play out (YYYY-MM-DD) */
  target_date: string;
  confidence: CalendarEventCertainty;
  /** what in the provided news/events grounds it — required, no basis ⇒ no prediction */
  source_basis: string;
}

export interface DailyPaperArticle extends DeepArticle {
  /** thread this article updates; null = the broad general roundup article */
  thread_id: string | null;
  /** news-specific custom headline */
  headline: string;
  /** does the reader actively follow this thread's topic/category? */
  followed: boolean;
  /** reused from a source item (og:image / feed thumbnail) */
  image_url: string | null;
  /** which DESTEP lenses the research used (only the relevant ones) */
  destep_lenses: string[];
  /** true when this builds on stored thread state (a real "update") */
  is_update: boolean;
  /** the thread's current source-grounded forecast, when there is one */
  prediction: ThreadPrediction | null;
}

/** One "ripple" of a deep article: a reasoned consequence with its own subtitle. */
export interface ArticleRipple {
  /** a fitting, news-specific subtitle for this consequence (Dutch), e.g.
   *  "Hoe Tesla een deel van de klap opving" */
  subhead: string;
  /** the reasoned consequence (1-2 sentences), grounded in the day's stories —
   *  analysis, not invented facts */
  text: string;
}

/**
 * A "full story" deep article: source-grounded facts (`lead`) plus up to three
 * reasoned consequences (`ripples`), each with its own fitting subtitle.
 */
export interface DeepArticle {
  /** the source-grounded facts: what happened + the hard numbers (Dutch) */
  lead: string;
  /** up to 3 grounded consequences, each a labelled mini-section */
  ripples: ArticleRipple[];
}

/**
 * The AI output of a thread-aware generation: an update that builds on the
 * thread's stored state, plus the rewritten state for the next edition.
 */
export interface ThreadUpdate extends DeepArticle {
  /** news-specific headline for this update */
  headline: string;
  /** the rewritten storyline state the next edition builds on */
  newState: string;
  /** which DESTEP lenses the update actually used (subset of the offered ones) */
  lenses: DestepLens[];
  /** a source-grounded forecast for this storyline, or null when none is warranted */
  prediction: ThreadPrediction | null;
}

/** Eén beursindex met dagrendement, voor de markten-per-regio-kaart. */
export interface MarktIndex {
  /** RegioCode (na, eu, …) */
  regio: string;
  /** bron-symbool, bv. ^GSPC */
  symbool: string;
  naam: string;
  /** procentuele verandering t.o.v. de vorige slotkoers */
  d: number;
}

export interface MarktSnapshot {
  indices: MarktIndex[];
  opgehaald_op: string;
}

export interface PipelineStep {
  id: string;
  edition_id: string;
  kind: string;
  payload: Record<string, unknown>;
  position: number;
  status: StepStatus;
  attempts: number;
  result: Record<string, unknown> | null;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface EditionSection {
  id: string;
  edition_id: string;
  kind: SectionKind;
  category_id: string | null;
  title: string;
  position: number;
  payload: Record<string, unknown>;
}

export interface EditionItem {
  id: string;
  edition_id: string;
  section_id: string | null;
  item_id: string;
  band: Band;
  position: number;
  summary_text: string | null;
  sol_note: string | null;
  /** Sol's voorspelling (0..1) hoe goed dit artikel bij de lezer past */
  match_score: number | null;
}

export interface FeedbackEvent {
  id: string;
  profile_id: string;
  target_type: TargetType;
  target_id: string;
  rating: number | null;
  escalation: "lager" | "tijdelijk_minder" | "niet_meer" | null;
  tags: string[];
  note: string | null;
  created_at: string;
}

export interface FollowMark {
  id: string;
  profile_id: string;
  target_type: "item" | "topic" | "category" | "thread";
  target_id: string;
  active: boolean;
  created_at: string;
}

export interface SolMemory {
  id: string;
  profile_id: string;
  kind: "karakter" | "observatie" | "voorkeur" | "compacted";
  content: string;
  weight: number;
  compacted: boolean;
  created_at: string;
}

export type ThreadStatus = "active" | "dormant" | "closed";

/** DESTEP research lenses (Dutch labels — only the relevant ones per story). */
export type DestepLens =
  | "demografisch"
  | "economisch"
  | "sociaal"
  | "technologisch"
  | "ecologisch"
  | "politiek";

/**
 * A persistent storyline per profile that accumulates state across editions.
 * Each edition appends what's new and rewrites `state` so the next one builds
 * on it. The realization of cross-reference axis B.
 */
export interface Thread {
  id: string;
  profile_id: string;
  topic_id: string | null;
  category_id: string | null;
  title: string;
  /** accumulated storyline prose the next edition builds on */
  state: string | null;
  /** normalized entity set, for free overlap matching */
  entities: string[];
  status: ThreadStatus;
  /** mega-thread parent: a child storyline points to the big anchor thread that absorbed it */
  parent_thread_id: string | null;
  /** normalized anchor entity for a mega-thread (e.g. "iran"); null for a normal thread */
  anchor_entity: string | null;
  /** current source-grounded forecast (Phase C); null when none */
  prediction: ThreadPrediction | null;
  last_edition_id: string | null;
  /** the edition whose update produced the current `state` (Phase D3 idempotency guard); null = never generated */
  state_edition_id: string | null;
  last_seen_at: string | null;
  created_at: string;
}

/** Which item fed which thread in which edition (audit + delta dedupe). */
export interface ThreadItem {
  id: string;
  thread_id: string;
  item_id: string;
  edition_id: string | null;
  created_at: string;
}

/**
 * Per-profile "track as thread" selection over the shared topic catalog.
 * Presence of a row = the profile wants this topic maintained as a storyline.
 */
export interface ThreadTracking {
  id: string;
  profile_id: string;
  topic_id: string;
  created_at: string;
}

export type CalendarEventKind =
  | "earnings"
  | "release"
  | "event"
  | "dividend"
  | "ipo"
  | "verkiezing"
  | "overig";
export type CalendarEventCertainty = "bevestigd" | "verwacht" | "gerucht";

/** One node in a Verhaallijn aside timeline (A3 Phase 2). */
export type TimelineNode =
  | { kind: "past"; date: string; title: string; source: string | null; deel: number; isNow: boolean }
  | { kind: "future"; date: string; text: string; certainty: CalendarEventCertainty };

/**
 * A forward-dated event as the scan extracts it from a single item — before it
 * is validated and linked into a CalendarEvent row by the agenda step.
 */
export interface ExtractedEvent {
  title: string;
  /** ISO date (YYYY-MM-DD) explicitly stated in the source text */
  date: string;
  kind: CalendarEventKind;
  certainty: CalendarEventCertainty;
}

export interface CalendarEvent {
  id: string;
  title: string;
  kind: CalendarEventKind;
  date: string;
  certainty: CalendarEventCertainty;
  topic_id: string | null;
  source: string | null;
  meta: Record<string, unknown>;
  created_at: string;
  /** whose agenda this event belongs to (null for legacy/global events) */
  profile_id: string | null;
  /** the source item it was extracted from */
  item_id: string | null;
  /** the storyline it belongs to, when the source item joined a thread */
  thread_id: string | null;
}

export interface Capture {
  id: string;
  profile_id: string | null;
  text: string;
  kind: "onderwerp" | "bron" | "notitie";
  processed: boolean;
  created_at: string;
}

export interface UsageLogEntry {
  id: string;
  edition_id: string | null;
  step_id: string | null;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_eur: number;
  created_at: string;
}

export interface WeatherSnapshot {
  plaats: string;
  temp_nu: number;
  temp_min: number;
  temp_max: number;
  neerslag_kans: number;
  weer_code: number;
  omschrijving: string;
  wind_kmh: number;
}

/** Budget-modus bepaalt hoeveel de generatie mag uitgeven */
export type BudgetMode = "vol" | "zuinig" | "minimaal" | "stop";

// ============================================================
// Entity registry (Phase F1 — entity typing)
// ============================================================

/** The kind of a real-world entity. Drives umbrella vs. facet selection in F3. */
export type EntityType = "actor" | "person" | "product" | "event" | "place" | "other";

/** How confident we are in a registry entry — seed rows are the trusted core. */
export type EntityConfidence = "seed" | "ai_high" | "ai_low";

/**
 * One row in the `entities` registry table. Mirrors supabase/migrations/0017_entities.sql.
 * The pipeline upserts on `norm_key` — see modules/entities/ for the pure helpers.
 */
export interface Entity {
  id: string;
  /** display form, e.g. "Anthropic", "Claude" */
  canonical_name: string;
  /** unique lookup key: output of normalizeEntity() */
  norm_key: string;
  type: EntityType;
  /** pre-normalized alias strings that also resolve to this canonical entry */
  aliases: string[];
  confidence: EntityConfidence;
  /**
   * The actor entity this product/event belongs to (product→actor link, F4).
   * Null for actors, persons, places and still-unlinked products.
   */
  parent_entity_id: string | null;
  /** null for seeded rows (they pre-date any edition) */
  first_seen_edition: string | null;
  created_at: string;
  /** updated by the application upsert on every write-back */
  updated_at: string;
}
