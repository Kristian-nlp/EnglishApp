import {
  type Card,
  createEmptyCard,
  fsrs,
  type FSRS,
  generatorParameters,
  type Grade,
  Rating,
  State,
} from "ts-fsrs";

/**
 * Spaced repetition scheduling via FSRS (FR-702). We persist only the columns
 * named in the data model (§4.1 `srs_state`): stability, difficulty, due_at,
 * reps, lapses, last_reviewed_at, state. That subset is sufficient — FSRS
 * recomputes elapsed time from `last_review` vs. `now`, verified to produce
 * identical scheduling to a full card.
 */

/** Four-button grades exposed to the UI (FR-704). */
export type ReviewGrade = "again" | "hard" | "good" | "easy";

/** Where a review came from (§4.1 `reviews.source`). */
export type ReviewSource = "review" | "conversation";

/** Persisted SRS state — mirrors the `srs_state` table columns. */
export interface SrsState {
  stability: number;
  difficulty: number;
  dueAt: Date;
  reps: number;
  lapses: number;
  lastReviewedAt: Date | null;
  /** FSRS lifecycle state (0 New, 1 Learning, 2 Review, 3 Relearning). */
  state: number;
}

// Maps to `Grade` (the non-Manual ratings), which is what `next()` accepts.
const GRADE_TO_RATING: Record<ReviewGrade, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

export function gradeToRating(grade: ReviewGrade): Grade {
  return GRADE_TO_RATING[grade];
}

// A single scheduler instance with default parameters. Retention/fuzz can be
// tuned later without touching call sites.
const scheduler: FSRS = fsrs(generatorParameters({ enable_fuzz: false }));

/** Initial state for a freshly introduced vocab item (FR-701). */
export function initialSrsState(now: Date): SrsState {
  return fromCard(createEmptyCard(now));
}

function toCard(state: SrsState): Card {
  return {
    due: state.dueAt,
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: 0, // recomputed by FSRS from last_review vs. now
    scheduled_days: 0, // recomputed by FSRS
    reps: state.reps,
    lapses: state.lapses,
    state: state.state as State,
    last_review: state.lastReviewedAt ?? undefined,
  };
}

function fromCard(card: Card): SrsState {
  return {
    stability: card.stability,
    difficulty: card.difficulty,
    dueAt: card.due,
    reps: card.reps,
    lapses: card.lapses,
    lastReviewedAt: card.last_review ?? null,
    state: card.state,
  };
}

/**
 * Advance FSRS state for a graded review. Pure: same inputs → same output, so
 * it is fully unit-testable with a fixed `now` (TEST-101).
 */
export function scheduleReview(
  state: SrsState,
  grade: ReviewGrade,
  now: Date,
): SrsState {
  const { card } = scheduler.next(toCard(state), now, gradeToRating(grade));
  return fromCard(card);
}

/**
 * A successful recall in live conversation counts as a review graded "good"
 * (FR-706) — the key link between the two halves of the app.
 */
export function scheduleFromConversation(state: SrsState, now: Date): SrsState {
  return scheduleReview(state, "good", now);
}

/** Whether an item is due for review at `now` (FR-700 queue building). */
export function isDue(state: SrsState, now: Date): boolean {
  return state.dueAt.getTime() <= now.getTime();
}
