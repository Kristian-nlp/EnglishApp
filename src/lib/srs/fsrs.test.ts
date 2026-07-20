import { describe, expect, it } from "vitest";
import {
  gradeToRating,
  initialSrsState,
  isDue,
  scheduleFromConversation,
  scheduleReview,
  type SrsState,
} from "./fsrs";
import { Rating } from "ts-fsrs";

const T0 = new Date("2026-01-01T00:00:00.000Z");

describe("gradeToRating (FR-704)", () => {
  it("maps the four buttons", () => {
    expect(gradeToRating("again")).toBe(Rating.Again);
    expect(gradeToRating("hard")).toBe(Rating.Hard);
    expect(gradeToRating("good")).toBe(Rating.Good);
    expect(gradeToRating("easy")).toBe(Rating.Easy);
  });
});

describe("initialSrsState (FR-701/702)", () => {
  it("creates a New card with zero reps", () => {
    const s = initialSrsState(T0);
    expect(s.reps).toBe(0);
    expect(s.lapses).toBe(0);
    expect(s.state).toBe(0); // New
    expect(s.stability).toBeGreaterThanOrEqual(0);
  });
});

describe("scheduleReview (FR-702)", () => {
  it("is deterministic for a fixed now", () => {
    const s = initialSrsState(T0);
    const a = scheduleReview(s, "good", T0);
    const b = scheduleReview(s, "good", T0);
    expect(a.dueAt.toISOString()).toBe(b.dueAt.toISOString());
    expect(a.stability).toBe(b.stability);
  });

  it("advances reps and sets a future due date on good", () => {
    const s = initialSrsState(T0);
    const next = scheduleReview(s, "good", T0);
    expect(next.reps).toBe(1);
    expect(next.dueAt.getTime()).toBeGreaterThan(T0.getTime());
    expect(next.lastReviewedAt?.toISOString()).toBe(T0.toISOString());
  });

  it("'easy' schedules further out than 'again'", () => {
    const s = initialSrsState(T0);
    const easy = scheduleReview(s, "easy", T0);
    const again = scheduleReview(s, "again", T0);
    expect(easy.dueAt.getTime()).toBeGreaterThan(again.dueAt.getTime());
  });

  it("records a lapse when a mature card is failed", () => {
    let s = initialSrsState(T0);
    s = scheduleReview(s, "good", T0);
    const reviewDay = new Date(s.dueAt.getTime());
    s = scheduleReview(s, "good", reviewDay);
    const failDay = new Date(s.dueAt.getTime());
    const failed = scheduleReview(s, "again", failDay);
    expect(failed.lapses).toBeGreaterThan(0);
  });

  it("round-trips through the stored subset without drift", () => {
    // Simulate persisting to DB and reloading (only stored columns survive).
    let s = initialSrsState(T0);
    s = scheduleReview(s, "good", T0);
    const reloaded: SrsState = {
      stability: s.stability,
      difficulty: s.difficulty,
      dueAt: s.dueAt,
      reps: s.reps,
      lapses: s.lapses,
      lastReviewedAt: s.lastReviewedAt,
      state: s.state,
    };
    const day = new Date(s.dueAt.getTime());
    const fromFull = scheduleReview(s, "good", day);
    const fromReloaded = scheduleReview(reloaded, "good", day);
    expect(fromReloaded.stability).toBeCloseTo(fromFull.stability, 6);
    expect(fromReloaded.dueAt.toISOString()).toBe(fromFull.dueAt.toISOString());
  });
});

describe("scheduleFromConversation (FR-706)", () => {
  it("is equivalent to a 'good' review", () => {
    const s = initialSrsState(T0);
    const conv = scheduleFromConversation(s, T0);
    const good = scheduleReview(s, "good", T0);
    expect(conv.dueAt.toISOString()).toBe(good.dueAt.toISOString());
    expect(conv.stability).toBe(good.stability);
  });
});

describe("isDue", () => {
  it("true at/after due, false before", () => {
    const s = initialSrsState(T0);
    const scheduled = scheduleReview(s, "good", T0);
    expect(isDue(scheduled, new Date(scheduled.dueAt.getTime() - 1))).toBe(false);
    expect(isDue(scheduled, scheduled.dueAt)).toBe(true);
    expect(isDue(scheduled, new Date(scheduled.dueAt.getTime() + 1))).toBe(true);
  });
});
