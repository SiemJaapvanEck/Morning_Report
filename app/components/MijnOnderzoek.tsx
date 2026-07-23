"use client";

// "Mijn onderzoek" — self-contained management panel (Research Tracking PRD,
// Phase 4). Add research (title + tekst) → POST /api/research runs the Phase 2
// extraction and seeds + follows its storyline synchronously (Phase 3); the
// list shows each note's status, its seeded storyline's live status/last
// update, and a link to the storyline; archiving is a soft delete (locked
// decision: storyline history stays intact, no hard delete).
//
// Takes its initial data as a prop and owns its list state from there — no
// page-specific assumptions, no fetch-on-mount — so it drops into any host
// page (currently a temporary section on /instellingen; PRD #3's Settings
// "Account" tab, MOR-18, mounts it unchanged) as the integration seam the PRD
// designed it to be. Form pattern follows CaptureFormulier.tsx.

import { useState, type FormEvent } from "react";
import Link from "next/link";
import type { ResearchNote } from "@/app/lib/queries";
import type { ResearchStatus, ThreadStatus } from "@/modules/shared/types";

const MONO = "font-[family-name:var(--font-space-mono)]";
const ARCH = "font-[family-name:var(--font-archivo)]";
const GROTESK = "font-[family-name:var(--font-space-grotesk)]";

const STATUS_LABEL: Record<ResearchStatus, string> = {
  nieuw: "Nieuw",
  gevolgd: "Gevolgd",
  gearchiveerd: "Gearchiveerd",
};

const THREAD_STATUS_LABEL: Record<ThreadStatus, string> = {
  active: "live",
  dormant: "slapend",
  closed: "afgerond",
};

export function MijnOnderzoek({ initial }: { initial: ResearchNote[] }) {
  const [notes, setNotes] = useState<ResearchNote[]>(initial);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  async function verstuur(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !body.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "onbekende fout");
      const research = data.research as ResearchNote;
      setNotes((prev) => [
        { ...research, threadStatus: "active", threadUpdatedLabel: "nu" },
        ...prev,
      ]);
      setTitle("");
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "onbekende fout");
    } finally {
      setBusy(false);
    }
  }

  async function archiveer(id: string) {
    setArchivingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/research?id=${id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "onbekende fout");
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, status: "gearchiveerd" } : n)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "onbekende fout");
    } finally {
      setArchivingId(null);
    }
  }

  const actief = notes.filter((n) => n.status !== "gearchiveerd");
  const gearchiveerd = notes.filter((n) => n.status === "gearchiveerd");

  return (
    <div className="space-y-8">
      <section>
        <h2 className={`${ARCH} text-[19px] font-extrabold tracking-[-.01em] text-[var(--ink)]`}>
          Mijn onderzoek
        </h2>
        <p className="mt-1 max-w-[60ch] text-[14.5px] leading-[1.5] text-[var(--muted)]">
          Plak of schrijf je onderzoek — het wordt een verhaallijn die het rapport elke ochtend
          bijwerkt met wat er nieuw is.
        </p>

        <form onSubmit={verstuur} className="mt-4 space-y-2">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Titel, bv. 'Bamboe-investeringen'"
            className="w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--faint)]"
          />
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Je onderzoekstekst..."
            rows={4}
            className="w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--faint)]"
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={busy || !title.trim() || !body.trim()}
              className={`${MONO} rounded-full bg-[var(--accent)] px-4 py-2 text-[12px] font-bold tracking-[.06em] text-white uppercase disabled:opacity-50`}
            >
              {busy ? "Bezig…" : "Toevoegen"}
            </button>
            {error && <span className="text-sm text-rose-600 dark:text-rose-400">{error}</span>}
          </div>
        </form>
      </section>

      <section>
        {actief.length === 0 ? (
          <p className={`${GROTESK} text-sm text-[var(--faint)]`}>Nog geen onderzoek toegevoegd.</p>
        ) : (
          <ul className="divide-y divide-[var(--line2)]">
            {actief.map((note) => (
              <ResearchRow
                key={note.id}
                note={note}
                onArchive={archiveer}
                busy={archivingId === note.id}
              />
            ))}
          </ul>
        )}
      </section>

      {gearchiveerd.length > 0 && (
        <section>
          <p className={`${MONO} mb-2 text-[11px] tracking-[.1em] text-[var(--faint)] uppercase`}>
            Gearchiveerd
          </p>
          <ul className="divide-y divide-[var(--line2)] opacity-60">
            {gearchiveerd.map((note) => (
              <ResearchRow key={note.id} note={note} onArchive={archiveer} busy={false} archived />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ResearchRow({
  note,
  onArchive,
  busy,
  archived = false,
}: {
  note: ResearchNote;
  onArchive: (id: string) => void;
  busy: boolean;
  archived?: boolean;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className={`${GROTESK} truncate text-sm font-medium text-[var(--ink)]`}>{note.title}</p>
        <p className={`${MONO} mt-0.5 text-[11px] tracking-[.04em] text-[var(--muted)]`}>
          {STATUS_LABEL[note.status]}
          {note.threadStatus && ` · ${THREAD_STATUS_LABEL[note.threadStatus]}`}
          {note.thread_id && ` · bijgewerkt ${note.threadUpdatedLabel}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {note.thread_id && (
          <Link
            href={`/archive/${note.thread_id}`}
            className={`${MONO} text-[11px] text-[var(--accent)] underline`}
          >
            Verhaallijn
          </Link>
        )}
        {!archived && (
          <button
            type="button"
            onClick={() => onArchive(note.id)}
            disabled={busy}
            className={`${MONO} text-[11px] text-[var(--muted)] underline disabled:opacity-50`}
          >
            {busy ? "…" : "Archiveer"}
          </button>
        )}
      </div>
    </li>
  );
}
