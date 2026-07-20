/**
 * CEFR levels and helpers (FR-501, FR-307, FR-404).
 *
 * The app targets A1..C1 (see spec 1.2). C2 is intentionally excluded from v1
 * but the ordering below leaves room to append it without breaking callers.
 */

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;

export type CefrLevel = (typeof CEFR_LEVELS)[number];

export const DEFAULT_CEFR_LEVEL: CefrLevel = "A2"; // FR-105 default

export function isCefrLevel(value: unknown): value is CefrLevel {
  return (
    typeof value === "string" &&
    (CEFR_LEVELS as readonly string[]).includes(value)
  );
}

/** 0-based rank of a level. A1 = 0 … C1 = 4. */
export function cefrIndex(level: CefrLevel): number {
  return CEFR_LEVELS.indexOf(level);
}

/**
 * Compare two levels. Negative if `a` is lower than `b`, positive if higher,
 * zero if equal.
 */
export function compareCefr(a: CefrLevel, b: CefrLevel): number {
  return cefrIndex(a) - cefrIndex(b);
}

/** True when `band` is at or above the learner's `level` (FR-307 vocab filter). */
export function isAtOrAboveBand(band: CefrLevel, level: CefrLevel): boolean {
  return compareCefr(band, level) >= 0;
}

/** One band up, clamped to the top of the ladder (FR-504 caps at one band). */
export function promoteLevel(level: CefrLevel): CefrLevel {
  const i = cefrIndex(level);
  return CEFR_LEVELS[Math.min(i + 1, CEFR_LEVELS.length - 1)]!;
}

/** One band down, clamped to the bottom of the ladder. */
export function demoteLevel(level: CefrLevel): CefrLevel {
  const i = cefrIndex(level);
  return CEFR_LEVELS[Math.max(i - 1, 0)]!;
}

/**
 * Default adaptive silence threshold in ms (FR-404).
 * 4.5s at A1/A2, 3s at B1, 2s at B2/C1. User-overridable 1.5s–8s in settings.
 */
export function defaultSilenceThresholdMs(level: CefrLevel): number {
  switch (level) {
    case "A1":
    case "A2":
      return 4500;
    case "B1":
      return 3000;
    case "B2":
    case "C1":
      return 2000;
  }
}

export const SILENCE_THRESHOLD_MIN_MS = 1500; // FR-404 / FR-1006
export const SILENCE_THRESHOLD_MAX_MS = 8000;
