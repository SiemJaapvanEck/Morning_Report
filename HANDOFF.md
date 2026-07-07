# HANDOFF — Krant "A2 · Dagblad + Verhaallijn" rebuild + brandbook

> **Last updated:** 7 July 2026 (interactive session with Siem) —
> branch `idle-work/2026-07-02-krant-a3`

## What happened

Siem reviewed the A3 idle-run krant layout (Phases 1–3, previous handoff) and
**rejected it** — the layout wasn't right. He supplied his own Claude-artifact
design ("Richting A2 · Dagblad + Verhaallijn"), now checked in as
**`Morning Report design/krant-a2-dagblad.html`** (the pixel truth). The page
was rebuilt against it in three agreed steps, all on this same branch (the A3
data plumbing — timeline builder, geo helper, places query — was kept; only
the presentation was replaced).

**Read `docs/brandbook.md` before touching any UI.** It now documents the
whole visual system (tokens, type scale, geometry, component recipes, layout
grids) and supersedes `docs/design.md`. CLAUDE.md's design section points at it.

## What shipped (3 commits on top of the A3 phases)

1. **`1b7f4cc` — Scheme token system + brandbook.**
   - `app/lib/schemes.ts`: single source of truth for 24 color schemes
     (17 light / 7 dark) on shared neutral bases. Generates the scheme CSS
     (injected by `layout.tsx` as `<style id="mr-schemes">`) and the
     anti-flash bootstrap script (migrates legacy `mr_thema` →
     `mr_scheme`: krant→blue, sepia→amber, mint→green, nacht→dark).
   - `globals.css`: only static status tokens (emer/amber/stone/rose) +
     legacy `--background`/`--foreground` aliases remain.
   - `ThemaKiezer.tsx`: 4-dot row → grouped scheme-picker popover (Licht /
     Donker, 24 swatches). Dark mode still class-based (`.dark`).
   - `docs/brandbook.md` created; 10 vitest tests for the scheme module.
2. **`be25dc3` — Krant page rebuild** (`app/components/EditieWeergave.tsx`,
   full rewrite of the presentation):
   - Full-bleed shell (breaks out of the app main padding via
     `mx-[calc(50%-50vw)]`), own sticky utility bar (Overzicht back link,
     MORNING REPORT wordmark, edition date), masthead band with 64px
     "De Krant" + joined weather bar, topzone (Sol block + Markten/Regio
     tiles, `1fr/400px`).
   - **One row per rubriek** (`krow`, `1fr/340px/360px` ≥xl): articles left;
     sticky middle aside (WAAR HET SPEELT map card + RUBRIEK IN CIJFERS with
     real article/source counts — **no Tavily stub**, the line comes when
     Tavily ships); sticky right **Verhaallijn rail** (accent header, title,
     delen/weken/bronnen stats, tagged timeline DEEL/VANDAAG/VOORUITBLIK +
     certainty chips).
   - Lead story: HOOFDVERHAAL chip + 58px headline + 520px hero
     (image-or-hatch) + thread ribbon + meta row (source · match% · JOUW
     OORDEEL rating) + drop cap + numbered GEVOLGEN list + Vooruitblik card.
   - The lead's rubriek opens the paper; asides pick the first item with a
     storyline/geography (lead → deep → rest), and hide when there's no data.
   - New pure helper `storylineStats` in `app/lib/stories.ts` (+5 tests).
   - `krant/page.tsx`: old back link removed (utility bar owns it).
3. **Docs (this commit):** ontwerp.md §8 decision entry, design.md superseded
   banner, CLAUDE.md design section rewritten, HANDOFF + TIJDLIJN.

**Gate:** lint ✓ · tsc ✓ · 330 tests ✓ · build ✓ (run before each commit).
**Verified:** rendered the 2026-07-06 edition via `next start` (prod mode) —
all sections, rails, map cards, cijfers cards and brief lists present. Both
routes also 200 on the dev server after it recompiled.

## Decisions taken (agreed with Siem in-session)

- **Full scheme system** (24 schemes + picker) over keeping the 4 themes.
- **Real counts only** in RUBRIEK IN CIJFERS (no Tavily placeholder).
- **Stay on this idle branch**; one merge decision at the end.
- **Whole-app brandbook** as the lasting deliverable (so no future session
  redesigns from scratch).
- Masthead H1 is **"De Krant"** (design's page identity); the MORNING REPORT
  wordmark lives in the utility bar.

## What's open

1. **Siem's visual review on localhost:3000** (`/editie/2026-07-06/krant` has
   yesterday's full edition; today's was still `running` mid-session).
   Checklist: masthead + weather bar, Sol/markten/regio topzone, lead with
   drop cap + ribbon + GEVOLGEN, per-rubriek rails (stats correct?), map
   cards, cijfers cards, brief lists, scheme picker (try a few light + dark
   schemes; old theme choice should migrate silently).
2. **Merge decision** — `/merge-idle-to-main` once satisfied. No migrations
   on this branch.
3. **Opportunistic**: dashboard components (`Edition*`) still use hardcoded
   stone/blue palette classes — migrate to tokens when touched (brandbook §7).

## Known issues / gotchas

- Siem's long-running dev server briefly served 500/404 right after the
  rewrite landed (stale HMR state); it recovered on its own after
  recompiling. If it happens again: restart `npm run dev`.
- The pipeline runner stops at 100 rounds by design; two runs on 6 July (0
  failed steps) still left deep-research `generate` backlog. Another
  `npm run pipeline` drains more if wanted.
- Pre-existing: if `.next/types/… 2.*` duplicate files appear, run
  `find .next -name "* 2.*" -delete` and re-run tsc.
- The design mock's brief-list section and "Tavily" cijfers line exist in CSS
  but were deliberately data-gated in the implementation (brandbook §7).
