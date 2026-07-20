import { z } from "zod";
import { CORRECTION_TAGS } from "@/lib/corrections/tags";
import { CEFR_LEVELS } from "@/lib/cefr";

/**
 * Structured output contract for a tutor turn (FR-303, FR-304, FR-305).
 *
 * Prose (`reply`) and metadata are SEPARATE fields — never parsed out of a
 * single string (FR-303). This Zod schema is the single source of truth for
 * both the OpenAI structured-output request and server-side validation. Schema
 * drift must break the build loudly (TEST-107), which the snapshot test guards.
 *
 * Design note on counts: FR-306 caps corrections at 2 and FR-307 asks for 2–4
 * vocab items, but those are BUSINESS rules applied after parsing (see
 * `selectCorrections`). We deliberately do NOT encode min/max counts here so a
 * slightly over-eager model response is trimmed rather than rejected — losing a
 * whole turn over one extra array item would violate NFR-202.
 */

export const correctionSchema = z.object({
  tag: z.enum(CORRECTION_TAGS),
  original: z.string().min(1),
  corrected: z.string().min(1),
  /** One-sentence explanation (FR-305). */
  explanation: z.string().min(1),
});

export type Correction = z.infer<typeof correctionSchema>;

export const vocabularyItemSchema = z.object({
  word: z.string().min(1),
  /** German gloss (FR-307, FR-701). */
  germanGloss: z.string().min(1),
  /** CEFR band the item sits at, used for the "at/above band" metric (FR-802). */
  cefrBand: z.enum(CEFR_LEVELS),
  /** The sentence the word appeared in, stored for SRS cards (FR-701, FR-703). */
  sourceSentence: z.string().min(1),
});

export type VocabularyItem = z.infer<typeof vocabularyItemSchema>;

export const difficultySignalSchema = z.enum(["up", "down", "hold"]);
export type DifficultySignal = z.infer<typeof difficultySignalSchema>;

export const tutorTurnSchema = z.object({
  /** The tutor's spoken/written reply — prose only, no embedded markers. */
  reply: z.string().min(1),
  corrections: z.array(correctionSchema),
  vocabulary: z.array(vocabularyItemSchema),
  /** Optional pronunciation nudge for this turn (FR-304). */
  pronunciationTip: z.string().min(1).nullable().optional(),
  funFact: z.string().min(1).nullable().optional(),
  /** Model's read on whether to nudge difficulty (advisory; FR-502 decides). */
  difficultySignal: difficultySignalSchema,
  sessionShouldEnd: z.boolean(),
});

export type TutorTurn = z.infer<typeof tutorTurnSchema>;

/**
 * Parse a raw model response into a validated `TutorTurn`.
 * Throws a `ZodError` on drift — callers surface a friendly retry (NFR-202)
 * and the CI snapshot test (TEST-107) asserts the shape is stable.
 */
export function parseTutorTurn(raw: unknown): TutorTurn {
  return tutorTurnSchema.parse(raw);
}
