import type { CefrLevel } from "@/lib/cefr";
import {
  type CorrectionTag,
  isBlockingTag,
  tagSeverity,
} from "@/lib/corrections/tags";

/**
 * Correction selection policy (FR-306):
 *  - At most 2 corrections per turn.
 *  - Prioritise by tag severity, then by recency of the same tag for this
 *    learner (reinforce patterns they are actively making).
 *  - Never correct in consecutive turns if the learner is at A1 or A2 and the
 *    error is not blocking comprehension.
 *
 * Pure and generic over anything carrying a `tag`, so it works on both parsed
 * model corrections and stored rows. Fully branch-tested (TEST-101).
 */

export const MAX_CORRECTIONS_PER_TURN = 2;

export interface CorrectionSelectionContext {
  level: CefrLevel;
  /** The learner's recent correction tags, MOST RECENT FIRST. */
  recentTags: CorrectionTag[];
  /** Did we already correct the learner on the previous turn? */
  correctedLastTurn: boolean;
}

function recencyRank(tag: CorrectionTag, recentTags: CorrectionTag[]): number {
  const idx = recentTags.indexOf(tag);
  return idx === -1 ? Number.POSITIVE_INFINITY : idx;
}

export function selectCorrections<T extends { tag: CorrectionTag }>(
  candidates: T[],
  ctx: CorrectionSelectionContext,
): T[] {
  const isLowLevel = ctx.level === "A1" || ctx.level === "A2";

  // A1/A2 consecutive-turn rule: only comprehension-blocking errors survive if
  // we already corrected last turn. This can legitimately return [].
  const eligible =
    isLowLevel && ctx.correctedLastTurn
      ? candidates.filter((c) => isBlockingTag(c.tag))
      : candidates.slice();

  eligible.sort((a, b) => {
    const bySeverity = tagSeverity(b.tag) - tagSeverity(a.tag);
    if (bySeverity !== 0) return bySeverity;
    // Tie-break: more recently made tag (lower rank) comes first.
    return (
      recencyRank(a.tag, ctx.recentTags) - recencyRank(b.tag, ctx.recentTags)
    );
  });

  return eligible.slice(0, MAX_CORRECTIONS_PER_TURN);
}
