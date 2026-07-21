# Project rules — Morning Report

## Architecture (non-negotiable)

- **Modules are pure.** `modules/` is framework-agnostic TypeScript: no
  Next.js imports, no React. The app (`app/`) and scripts are only callers.
  New functionality = a new module or an extension, never a rewrite (no
  v2/v3).
- **The pipeline is a step machine.** Steps live in `pipeline_steps` (DB);
  each step is idempotent and finishes within ~7s. New pipeline functionality
  = a step handler in `modules/pipeline/steps.ts`, scheduled by the plan step.
- **Every AI call goes through `askAI()`** (`modules/shared/ai.ts`) so tokens
  and cost land in `usage_log`. Generation steps respect `budgetPolicy`.
  Never call an AI SDK/API directly outside the provider implementations.
- **Database changes = migration.** New numbered SQL file in
  `supabase/migrations/`. Agents author migration FILES only — Siem applies
  them (Supabase connector). Keep `modules/shared/types.ts` in sync.
- **Model choice:** `tier: "scan"` cheap, `tier: "deep"` strong. Model IDs,
  provider, and prices only in `modules/shared/config.ts`. xAI/Grok active
  (`AI_PROVIDER=xai`); Anthropic switchable.
- **Editorial layer is persona-free:** neutral topic-driven synthesis
  ("De rode draad") in `modules/redactie` — no personas. Deep research stays
  in `generate`.

## Stack

- Next.js (see AGENTS.md warning: read `node_modules/next/dist/docs/` before
  writing code — this version has breaking changes), React, TypeScript,
  Tailwind v4, Supabase, Vercel.
- Tests: vitest. Pure functions in `modules/` get tests alongside
  (`*.test.ts`).

## Design / UI

- **Read `docs/brandbook.md` before touching any UI** — tokens, type scale,
  geometry, recipes, grids. New UI patterns get a recipe there in the same PR.
- Color via scheme tokens only (`app/lib/schemes.ts`, 24 schemes; components
  use `var(--accent)` etc. via Tailwind arbitrary values). Dark mode
  class-based.
- Krant page = "A2 · Dagblad + Verhaallijn"; dashboard = "Atlas" bento tiles
  (references in `Morning Report design/`).
- Fonts: Archivo (headings), Space Grotesk (body), Space Mono (labels/data).
- **UI copy is Dutch**; the synthesis prompt output is Dutch. Everything else
  (code, docs, commits) is English.
- No heavy component libraries; client components only where interaction
  demands.

## Environments & secrets

- `.env.local` (not in git) — keys in `.env.example`.
- Supabase project "Morning Report." (`iqhyndhrlhjfdrwjvmjv`, eu-west-1).
- **Verification reality for unattended sessions:** gate only (lint / tsc /
  vitest / build) — no live DB, no paid pipeline, no localhost. Migrations
  are files only; Siem applies and live-verifies in the morning review.

## Deploy

- GitHub `SiemJaapvanEck/Morning_Report` → Vercel; **only `main` deploys**.
  Branch pushes are safe.
- Living design doc: `docs/ontwerp.md` (incl. decision log §8) — record
  design decisions there, not in loose notes. Update README on structure or
  roadmap changes.
