/**
 * Correction tag taxonomy (spec section 4.2).
 *
 * This is a FIXED enum. The tutor model must return one of these values and may
 * not invent new ones (FR-305). `OTHER` is the escape hatch; if it exceeds 10%
 * of corrections the taxonomy needs extending (see acceptance criteria §9).
 *
 * Each tag carries two pieces of business metadata used by the prioritiser
 * (FR-306):
 *   - `severity`: higher = more important to surface first.
 *   - `blocking`: does the error impede comprehension? Non-blocking errors are
 *     suppressed on consecutive turns for A1/A2 learners.
 *
 * Severity values are a deliberate, documented pedagogical judgement and are
 * meant to be tuned against the eval harness (TEST-106). They are ordinal, not
 * absolute.
 */

export const CORRECTION_TAGS = [
  "V2_WORDORDER",
  "ADV_PLACEMENT",
  "SUBORD_WORDORDER",
  "TENSE_PRESPERF",
  "TENSE_PROGRESSIVE",
  "SINCE_FOR",
  "FALSE_FRIEND",
  "UNCOUNTABLE",
  "ARTICLE",
  "PREPOSITION",
  "MODAL",
  "CAP_NOUN",
  "PLURAL_AGREEMENT",
  "PRONOUN",
  "LEXICAL_CHOICE",
  "SPELLING",
  "OTHER",
] as const;

export type CorrectionTag = (typeof CORRECTION_TAGS)[number];

export function isCorrectionTag(value: unknown): value is CorrectionTag {
  return (
    typeof value === "string" &&
    (CORRECTION_TAGS as readonly string[]).includes(value)
  );
}

interface TagMeta {
  /** Higher surfaces first when trimming to the 2-per-turn cap (FR-306). */
  readonly severity: number;
  /** Does the error block comprehension? Drives the A1/A2 consecutive rule. */
  readonly blocking: boolean;
  /** Human-readable label for the dashboard grammar tracker (FR-803). */
  readonly label: string;
}

export const CORRECTION_TAG_META: Record<CorrectionTag, TagMeta> = {
  // Structural word-order carryover from German — high impact on comprehension.
  V2_WORDORDER: { severity: 90, blocking: true, label: "Verb-second word order" },
  SUBORD_WORDORDER: {
    severity: 88,
    blocking: true,
    label: "Subordinate-clause word order",
  },
  // False friends can invert meaning entirely.
  FALSE_FRIEND: { severity: 85, blocking: true, label: "False friend" },
  // Tense/aspect errors distort the timeline.
  TENSE_PRESPERF: {
    severity: 75,
    blocking: true,
    label: "Present perfect vs. past",
  },
  TENSE_PROGRESSIVE: {
    severity: 70,
    blocking: false,
    label: "Progressive aspect",
  },
  PLURAL_AGREEMENT: {
    severity: 68,
    blocking: true,
    label: "Subject–verb agreement",
  },
  PRONOUN: { severity: 62, blocking: true, label: "Pronoun case/gender" },
  ADV_PLACEMENT: { severity: 55, blocking: false, label: "Adverb placement" },
  SINCE_FOR: { severity: 52, blocking: false, label: "since / for" },
  MODAL: { severity: 50, blocking: false, label: "Modal verbs" },
  UNCOUNTABLE: { severity: 48, blocking: false, label: "Uncountable nouns" },
  PREPOSITION: { severity: 45, blocking: false, label: "Prepositions" },
  ARTICLE: { severity: 40, blocking: false, label: "Articles" },
  LEXICAL_CHOICE: {
    severity: 35,
    blocking: false,
    label: "Word choice (idiom)",
  },
  CAP_NOUN: { severity: 20, blocking: false, label: "Noun capitalisation" },
  SPELLING: { severity: 18, blocking: false, label: "Spelling" },
  OTHER: { severity: 10, blocking: false, label: "Other" },
};

export function tagSeverity(tag: CorrectionTag): number {
  return CORRECTION_TAG_META[tag].severity;
}

export function isBlockingTag(tag: CorrectionTag): boolean {
  return CORRECTION_TAG_META[tag].blocking;
}
