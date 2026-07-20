/**
 * Attainment metrics (FR-802) and the measurable signals that drive adaptive
 * difficulty (FR-502). These are pure functions with full branch coverage
 * (TEST-101). Every definition below is documented because the dashboard trends
 * are only meaningful if the maths is stable.
 */

/**
 * Split text into lowercased word tokens. A "word" is a run of letters
 * (any script) optionally containing internal apostrophes or hyphens, so
 * "don't" and "mother-in-law" count as single tokens. Punctuation and digits
 * are dropped. Used by MLU and TTR.
 */
export function tokenizeWords(text: string): string[] {
  const matches = text
    .toLowerCase()
    .match(/\p{L}+(?:['’-]\p{L}+)*/gu);
  return matches ?? [];
}

/**
 * Mean length of utterance: average word count per utterance (FR-802).
 * Empty or whitespace-only utterances are not utterances and are excluded from
 * both numerator and denominator. Returns 0 when there is nothing to measure.
 */
export function meanLengthOfUtterance(utterances: string[]): number {
  let totalWords = 0;
  let count = 0;
  for (const u of utterances) {
    const words = tokenizeWords(u).length;
    if (words === 0) continue;
    totalWords += words;
    count += 1;
  }
  return count === 0 ? 0 : totalWords / count;
}

/**
 * Simple type-token ratio: unique tokens / total tokens, in [0, 1].
 * Returns 0 for an empty token list.
 */
export function typeTokenRatio(tokens: string[]): number {
  if (tokens.length === 0) return 0;
  return new Set(tokens).size / tokens.length;
}

export const DEFAULT_TTR_WINDOW = 50;

/**
 * Moving-average type-token ratio (MATTR, FR-802). Averages the simple TTR of
 * every sliding window of `windowSize` tokens. This removes the length bias of
 * plain TTR, so trends across sessions of different lengths are comparable.
 *
 * - `windowSize < 1` is treated as 1.
 * - When there are fewer tokens than the window, falls back to simple TTR over
 *   all tokens (there is only one, partial, window).
 */
export function movingWindowTTR(
  tokens: string[],
  windowSize: number = DEFAULT_TTR_WINDOW,
): number {
  if (tokens.length === 0) return 0;
  const w = Math.max(1, Math.floor(windowSize));
  if (tokens.length <= w) return typeTokenRatio(tokens);

  const windowCount = tokens.length - w + 1;
  let sum = 0;
  for (let start = 0; start < windowCount; start += 1) {
    const window = tokens.slice(start, start + w);
    sum += new Set(window).size / w;
  }
  return sum / windowCount;
}

/**
 * Errors per 100 words (FR-502, FR-802). Returns 0 when no words were spoken,
 * so an empty turn cannot masquerade as a perfect one downstream.
 */
export function errorsPer100Words(errorCount: number, wordCount: number): number {
  if (wordCount <= 0) return 0;
  return (errorCount / wordCount) * 100;
}

/**
 * Self-correction rate in [0, 1] (FR-502, FR-802): of all error *events*, the
 * fraction the learner repaired themselves. `uncorrectedErrors` are those the
 * tutor had to flag. Returns 0 when there were no error events at all.
 */
export function selfCorrectionRate(
  selfCorrections: number,
  uncorrectedErrors: number,
): number {
  const total = selfCorrections + uncorrectedErrors;
  if (total <= 0) return 0;
  return selfCorrections / total;
}

/**
 * Learner talk-time ratio in [0, 1] (FR-410, FR-802). Success target is above
 * 0.5 (§1.4). Returns 0 when no speech was recorded on either side.
 */
export function talkTimeRatio(
  learnerSpeechSeconds: number,
  aiSpeechSeconds: number,
): number {
  const total = learnerSpeechSeconds + aiSpeechSeconds;
  if (total <= 0) return 0;
  return learnerSpeechSeconds / total;
}
