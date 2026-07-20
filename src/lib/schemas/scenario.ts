import { z } from "zod";
import { CEFR_LEVELS } from "@/lib/cefr";

/**
 * Task-based scenarios (FR-604, FR-605) and their rubric results (FR-606).
 *
 * Whether scenarios live in the DB or as version-controlled seed files is an
 * open decision (§11). This schema is the shared shape either way, so the choice
 * stays reversible.
 */

/** A required language function the learner is expected to use (FR-604). */
export const requiredFunctionSchema = z.object({
  key: z.string().min(1), // e.g. "apologise", "state_preference"
  description: z.string().min(1),
});
export type RequiredFunction = z.infer<typeof requiredFunctionSchema>;

export const scenarioSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  cefrMin: z.enum(CEFR_LEVELS),
  cefrMax: z.enum(CEFR_LEVELS),
  /** Role the tutor plays, e.g. "a shop assistant at a returns desk". */
  tutorRole: z.string().min(1),
  /** What the learner must achieve, e.g. "obtain a full refund". */
  learnerGoal: z.string().min(1),
  requiredFunctions: z.array(requiredFunctionSchema).min(1),
  successCriteria: z.string().min(1),
});
export type Scenario = z.infer<typeof scenarioSchema>;

/** Per-required-function outcome in a rubric result. */
export const functionResultSchema = z.object({
  key: z.string().min(1),
  used: z.boolean(),
});

/** Rubric result returned by the model at scenario end (FR-606). */
export const rubricResultSchema = z.object({
  goalAchieved: z.boolean(),
  registerAppropriate: z.boolean(),
  requiredFunctionsUsed: z.array(functionResultSchema),
  /** Exactly two sentences of feedback (FR-606); enforced softly as non-empty. */
  feedback: z.string().min(1),
});
export type RubricResult = z.infer<typeof rubricResultSchema>;

/** A scenario is "passed" when the goal is met with an appropriate register. */
export function scenarioPassed(result: RubricResult): boolean {
  return result.goalAchieved && result.registerAppropriate;
}
