# Status log

--- Wed 22 Jul 2026 · pipeline incident
[STATUS] ❌ Pipeline down: xAI credits out + scheduler stalled
• Done: local run (staging code) cleared non-AI backlog steps; every AI step fails 403 (credits/monthly limit); diagnosis: cron ticks ~1×/day since ~7 Jul instead of every 2 min, editions pile up unprocessed
• Next: after xAI top-up rerun today's edition (research-framing test rides along); backlog park/process decision pending
• Needs you: top up xAI credits + fix the cron-job.org tick job

--- Wed 22 Jul 2026 · staging landing
[STATUS] ✅ Review queue is on staging — 3 features ready
• Done: MOR-8 (goals+ETA), MOR-12 (research→storyline), MOR-16 (pipeline tab) landed on staging, double-gated, review docs written
• Next: your click-through on the staging preview (docs/reviews/MOR-8/12/16.md); approve → promote to production
• Needs you: review at https://morning-report-git-staging-siemjaapvanecks-projects.vercel.app

--- Wed 22 Jul 2026 · enrollment
[STATUS] ✅ Agent-team workflow enrolled
• Done: Bet & Flow + plugin team layered onto the existing workflow; Linear recategorized (18 issues, additive); staging merge policy set
• Next: clear one of MOR-8 / MOR-12 / MOR-16 to reopen the pipeline
• Needs you: ntfy topic name for phone cards; push staging branch on first networked session
