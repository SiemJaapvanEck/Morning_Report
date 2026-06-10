// Budget-guard: bewaakt het kostenplafond per editie.
//
// Elke Claude-call wordt gelogd in usage_log (zie claude.ts). De guard leest
// de som en vertaalt die naar een modus. De generatie-stappen vragen vóór elke
// call de modus op en passen hun gedrag aan — minder deep-dives, kortere Sol —
// in plaats van stilletjes door te branden.

import { config } from "./config";
import type { BudgetMode } from "./types";

/** Pure beslislogica: uitgegeven bedrag → modus. Los testbaar. */
export function budgetMode(spentEur: number, ceilingEur = config.budget.editionCeilingEur): BudgetMode {
  if (spentEur >= ceilingEur) return "stop";
  const fraction = spentEur / ceilingEur;
  if (fraction >= config.budget.minimaalVanaf) return "minimaal";
  if (fraction >= config.budget.zuinigVanaf) return "zuinig";
  return "vol";
}

/** Wat elke modus betekent voor de generatie-stappen. */
export const budgetPolicy: Record<
  BudgetMode,
  { deepDivesPerSectie: number; samenvattingMaxTokens: number; solMaxTokens: number }
> = {
  vol:      { deepDivesPerSectie: 2, samenvattingMaxTokens: 400, solMaxTokens: 600 },
  zuinig:   { deepDivesPerSectie: 1, samenvattingMaxTokens: 250, solMaxTokens: 350 },
  minimaal: { deepDivesPerSectie: 0, samenvattingMaxTokens: 150, solMaxTokens: 150 },
  stop:     { deepDivesPerSectie: 0, samenvattingMaxTokens: 0,   solMaxTokens: 0 },
};

/** Huidige uitgaven van een editie ophalen en vertalen naar een modus. */
export async function currentBudgetMode(editionId: string): Promise<BudgetMode> {
  const { db } = await import("./db");
  const { data, error } = await db().rpc("edition_cost_eur", { p_edition_id: editionId });
  if (error) throw new Error(`Budget-guard: ${error.message}`);
  return budgetMode(Number(data ?? 0));
}
