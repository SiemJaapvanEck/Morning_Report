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
}

/** One Daily Paper article — a thread update (followed topic) or the broad general roundup. */
export interface DailyPaperArticle {
  /** thread this article updates; null = the broad general roundup article */
  thread_id: string | null;
  /** news-specific custom headline */
  headline: string;
  body: string;
  /** does the reader actively follow this thread's topic/category? */
  followed: boolean;
  /** reused from a source item (og:image / feed thumbnail) */
  image_url: string | null;
  /** which DESTEP lenses the research used (only the relevant ones) */
  destep_lenses: string[];
  /** true when this builds on stored thread state (a real "update") */
  is_update: boolean;
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
  target_type: "item" | "topic" | "category";
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
  last_edition_id: string | null;
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

export interface CalendarEvent {
  id: string;
  title: string;
  kind: "earnings" | "release" | "event" | "dividend" | "ipo" | "verkiezing" | "overig";
  date: string;
  certainty: "bevestigd" | "verwacht" | "gerucht";
  topic_id: string | null;
  source: string | null;
  meta: Record<string, unknown>;
  created_at: string;
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
