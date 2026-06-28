// Pure helpers for the krant reading surface (no db, no React) so they can be
// unit-tested in isolation. Data fetching lives in queries.ts; rendering in
// app/components/EditieWeergave.tsx.

import type { SectionView } from "./queries";

/**
 * Orders the krant's category sections so the reader's followed categories lead,
 * preserving the existing position order within each group (stable). Mirrors
 * orderThreads in modules/redactie: followed-first, otherwise unchanged.
 */
export function orderSectionsFollowedFirst(
  sections: SectionView[],
  followedCategoryIds: string[],
): SectionView[] {
  const followed = new Set(followedCategoryIds);
  return sections
    .map((section, index) => ({ section, index }))
    .sort((a, b) => {
      const af = a.section.section.category_id != null && followed.has(a.section.section.category_id);
      const bf = b.section.section.category_id != null && followed.has(b.section.section.category_id);
      if (af !== bf) return af ? -1 : 1;
      return a.index - b.index; // stable within each group
    })
    .map((entry) => entry.section);
}
