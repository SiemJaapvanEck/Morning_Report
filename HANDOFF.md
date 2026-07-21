# HANDOFF — workflow v2 + krant "A2 · Dagblad + Verhaallijn" on main

> **Last updated:** 21 July 2026 (Cowork session with Siem) —
> merged `idle-work/2026-07-02-krant-a3` → `main`

## What's on main now

Two things landed together (same branch, sequential work):

### 1. Orchestrator workflow v2

Installed from `~/Documents/Claude/Projects/Claude code workflow template`:

- **Skills:** /prd /plan /dispatch /work /close /merge /status — the old
  idle skills are retired in `.claude/retired-skills/`.
- **Agents:** orchestrator, implementer, reviewer, test-engineer.
- **Config:** `.claude/project.json` (gate, Linear team, label taxonomy,
  sprints=milestones) · rules split into `.claude/rules/workflow.md` (generic)
  + `.claude/rules/project.md` (Morning Report specifics).
- **Linear:** team "Morning Report" is the task source of truth; labels
  auto-ok / needs-siem / in-review / test / infra created 21 Jul. Board is
  currently near-empty (only MOR-1/MOR-2, filed by Jesse Hoeks, untriaged) —
  the real backlog (below) isn't captured as issues yet.
- **CI:** `.github/workflows/gate.yml` runs `.claude/hooks/gate.sh` on PRs.
- CLAUDE.md is now thin (imports the rules).

### 2. Krant "A2 · Dagblad + Verhaallijn" rebuild + brandbook

Siem reviewed the earlier A3 idle-run layout and rejected it, then supplied
his own design (`Morning Report design/krant-a2-dagblad.html`, the pixel
truth). Rebuilt in three steps; **Siem live-reviewed the result on
localhost and approved it for merge (21 July).**

**Read `docs/brandbook.md` before touching any UI.** It documents the whole
visual system (tokens, type scale, geometry, component recipes, layout
grids) and supersedes `docs/design.md`.

What shipped:

1. **Scheme token system** — `app/lib/schemes.ts`: single source of truth
   for 24 color schemes (17 light / 7 dark) on shared neutral bases.
   Generates the scheme CSS (injected by `layout.tsx`) and the anti-flash
   bootstrap script (migrates legacy `mr_thema` → `mr_scheme`). `globals.css`
   now only holds static status tokens + legacy aliases. `ThemaKiezer.tsx`
   is a grouped scheme-picker popover (Licht/Donker, 24 swatches).
2. **Krant page rebuild** (`app/components/EditieWeergave.tsx`, full
   presentation rewrite): full-bleed shell, sticky utility bar, masthead
   band + weather bar, topzone (Sol/Markten/Regio), one row per rubriek
   (articles + sticky WAAR HET SPEELT map card + RUBRIEK IN CIJFERS +
   Verhaallijn rail), lead story with drop cap/ribbon/GEVOLGEN/Vooruitblik.
   RUBRIEK IN CIJFERS uses real article/source counts only — no Tavily stub
   (comes when Tavily ships).
3. **Docs:** `docs/ontwerp.md` §8 decision entry, `docs/design.md`
   superseded banner, CLAUDE.md design section.

**Gate:** lint ✓ · tsc ✓ · 330 tests ✓ · build ✓. Double-gated merge to main
green.

## What's open

1. **Run /plan** to put the real backlog on the Linear board as the first
   sprints: phase D3, phase E, 5c-3, entity-typing tail, Tavily web-search
   grounding (deep-research Phase 5, needs a `TAVILY_API_KEY`), dashboard
   token migration (below).
2. **Triage MOR-1/MOR-2** (Jesse Hoeks' items) into the label taxonomy or
   park them explicitly.
3. **Opportunistic**: dashboard components (`Edition*`) still use hardcoded
   stone/blue palette classes — migrate to tokens when touched (brandbook §7).
4. Housekeeping: `idle-work/2026-07-02` and `idle-work/2026-07-02-after-f3`
   are already merged into main — safe to delete (local + remote).

## Known issues / gotchas

- Siem's long-running dev server briefly served 500/404 right after the
  krant rewrite landed (stale HMR state); recovered on its own. If it
  happens again: restart `npm run dev`.
- The pipeline runner stops at 100 rounds by design; deep-research
  `generate` backlog may still need another `npm run pipeline` to drain.
- Pre-existing: if `.next/types/… 2.*` duplicate files appear, run
  `find .next -name "* 2.*" -delete` and re-run tsc.
- The design mock's brief-list section and "Tavily" cijfers line exist in
  CSS but are deliberately data-gated (brandbook §7).
