import {
  type CefrLevel,
  demoteLevel,
  promoteLevel,
} from "@/lib/cefr";

/**
 * Adaptive difficulty (FR-500). Level changes are computed from measurable
 * signals, never "model vibes" (FR-502). This module is pure and fully
 * branch-tested (TEST-101).
 *
 * Rules implemented:
 *  - FR-503 Promote when errors/100w is below the band's promote threshold AND
 *    MLU is rising across the 3 most recent sessions.
 *  - FR-503 Demote when errors/100w exceeds the band's demote threshold for the
 *    2 most recent sessions.
 *  - FR-504 At most one band per session.
 *  - FR-506 A manual override wins and suppresses automatic adjustment for 3
 *    sessions.
 */

/** Per-session signal snapshot, most-recent LAST in the arrays passed below. */
export interface SessionSignal {
  errorsPer100Words: number;
  mlu: number;
}

/** Errors-per-100-words thresholds per band. Tunable against the eval harness. */
export interface LevelThreshold {
  /** Promote only if recent errors are strictly below this. */
  promoteBelow: number;
  /** Demote if recent errors are strictly above this. */
  demoteAbove: number;
}

export const LEVEL_THRESHOLDS: Record<CefrLevel, LevelThreshold> = {
  A1: { promoteBelow: 25, demoteAbove: 45 },
  A2: { promoteBelow: 18, demoteAbove: 35 },
  B1: { promoteBelow: 12, demoteAbove: 28 },
  B2: { promoteBelow: 8, demoteAbove: 20 },
  C1: { promoteBelow: 5, demoteAbove: 15 },
};

export const PROMOTE_WINDOW = 3; // consecutive sessions (FR-503)
export const DEMOTE_WINDOW = 2; // consecutive sessions (FR-503)
export const MANUAL_OVERRIDE_SUPPRESSION = 3; // sessions (FR-506)

export type Direction = "up" | "down" | "hold";

export interface LevelDecisionInput {
  currentLevel: CefrLevel;
  /** Session signals in chronological order (oldest first, newest last). */
  recentSessions: SessionSignal[];
  /**
   * Sessions remaining during which automatic adjustment is suppressed because
   * the learner set the level manually (FR-506). 0 = not suppressed.
   */
  manualOverrideSessionsRemaining?: number;
}

export interface LevelDecision {
  nextLevel: CefrLevel;
  direction: Direction;
  /** Learner-facing explanation of why (FR-504). Empty when holding. */
  reason: string;
}

function isStrictlyRising(values: number[]): boolean {
  for (let i = 1; i < values.length; i += 1) {
    if (!(values[i]! > values[i - 1]!)) return false;
  }
  return true;
}

/**
 * Decide whether to promote, demote, or hold. Never moves more than one band
 * (FR-504); at the top/bottom of the ladder a would-be move becomes a hold.
 */
export function decideLevelChange(input: LevelDecisionInput): LevelDecision {
  const { currentLevel, recentSessions } = input;
  const hold = (reason = ""): LevelDecision => ({
    nextLevel: currentLevel,
    direction: "hold",
    reason,
  });

  // FR-506: manual override suppresses automatic adjustment.
  if ((input.manualOverrideSessionsRemaining ?? 0) > 0) {
    return hold("Automatic level changes are paused after your manual change.");
  }

  const threshold = LEVEL_THRESHOLDS[currentLevel];

  // --- Demote check (2 consecutive sessions above the demote threshold) ---
  if (recentSessions.length >= DEMOTE_WINDOW) {
    const window = recentSessions.slice(-DEMOTE_WINDOW);
    const allAbove = window.every(
      (s) => s.errorsPer100Words > threshold.demoteAbove,
    );
    if (allAbove) {
      const nextLevel = demoteLevel(currentLevel);
      if (nextLevel === currentLevel) {
        return hold(); // already at the floor; nothing to do
      }
      return {
        nextLevel,
        direction: "down",
        reason:
          "We'll ease off a little so you can build confidence — your error rate has been high for two sessions.",
      };
    }
  }

  // --- Promote check (errors below threshold AND MLU rising over 3 sessions) ---
  if (recentSessions.length >= PROMOTE_WINDOW) {
    const window = recentSessions.slice(-PROMOTE_WINDOW);
    const allBelow = window.every(
      (s) => s.errorsPer100Words < threshold.promoteBelow,
    );
    const mluRising = isStrictlyRising(window.map((s) => s.mlu));
    if (allBelow && mluRising) {
      const nextLevel = promoteLevel(currentLevel);
      if (nextLevel === currentLevel) {
        return hold(); // already at the ceiling
      }
      return {
        nextLevel,
        direction: "up",
        reason:
          "You're ready for more — your accuracy is strong and your sentences are getting longer.",
      };
    }
  }

  return hold();
}
