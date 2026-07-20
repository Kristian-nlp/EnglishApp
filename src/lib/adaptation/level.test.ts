import { describe, expect, it } from "vitest";
import {
  decideLevelChange,
  LEVEL_THRESHOLDS,
  type SessionSignal,
} from "./level";

// Helpers to build session windows at a given band.
const B1 = LEVEL_THRESHOLDS.B1;

function sig(errorsPer100Words: number, mlu: number): SessionSignal {
  return { errorsPer100Words, mlu };
}

describe("decideLevelChange (FR-503/504/506)", () => {
  it("promotes when errors are low AND MLU rises over 3 sessions", () => {
    const d = decideLevelChange({
      currentLevel: "B1",
      recentSessions: [
        sig(B1.promoteBelow - 5, 6),
        sig(B1.promoteBelow - 6, 7),
        sig(B1.promoteBelow - 7, 8),
      ],
    });
    expect(d.direction).toBe("up");
    expect(d.nextLevel).toBe("B2");
    expect(d.reason).not.toBe("");
  });

  it("does NOT promote when MLU is not strictly rising", () => {
    const d = decideLevelChange({
      currentLevel: "B1",
      recentSessions: [
        sig(B1.promoteBelow - 5, 6),
        sig(B1.promoteBelow - 6, 6), // flat
        sig(B1.promoteBelow - 7, 8),
      ],
    });
    expect(d.direction).toBe("hold");
  });

  it("does NOT promote when one session's errors are above threshold", () => {
    const d = decideLevelChange({
      currentLevel: "B1",
      recentSessions: [
        sig(B1.promoteBelow - 1, 6),
        sig(B1.promoteBelow + 1, 7), // too many errors
        sig(B1.promoteBelow - 1, 8),
      ],
    });
    expect(d.direction).toBe("hold");
  });

  it("only considers the 3 most recent sessions for promotion", () => {
    const d = decideLevelChange({
      currentLevel: "B1",
      recentSessions: [
        sig(99, 1), // old bad session, ignored
        sig(B1.promoteBelow - 1, 6),
        sig(B1.promoteBelow - 1, 7),
        sig(B1.promoteBelow - 1, 8),
      ],
    });
    expect(d.direction).toBe("up");
  });

  it("demotes after 2 consecutive high-error sessions", () => {
    const d = decideLevelChange({
      currentLevel: "B1",
      recentSessions: [
        sig(B1.demoteAbove + 1, 5),
        sig(B1.demoteAbove + 2, 4),
      ],
    });
    expect(d.direction).toBe("down");
    expect(d.nextLevel).toBe("A2");
  });

  it("does NOT demote when only the latest session is bad", () => {
    const d = decideLevelChange({
      currentLevel: "B1",
      recentSessions: [
        sig(B1.demoteAbove - 1, 5),
        sig(B1.demoteAbove + 2, 4),
      ],
    });
    expect(d.direction).toBe("hold");
  });

  it("caps at one band and holds at the ceiling", () => {
    const d = decideLevelChange({
      currentLevel: "C1",
      recentSessions: [
        sig(0, 6),
        sig(0, 7),
        sig(0, 8),
      ],
    });
    expect(d.direction).toBe("hold");
    expect(d.nextLevel).toBe("C1");
  });

  it("holds at the floor instead of demoting below A1", () => {
    const d = decideLevelChange({
      currentLevel: "A1",
      recentSessions: [
        sig(LEVEL_THRESHOLDS.A1.demoteAbove + 5, 2),
        sig(LEVEL_THRESHOLDS.A1.demoteAbove + 5, 2),
      ],
    });
    expect(d.direction).toBe("hold");
    expect(d.nextLevel).toBe("A1");
  });

  it("manual override suppresses automatic adjustment (FR-506)", () => {
    const d = decideLevelChange({
      currentLevel: "B1",
      recentSessions: [
        sig(B1.promoteBelow - 1, 6),
        sig(B1.promoteBelow - 1, 7),
        sig(B1.promoteBelow - 1, 8),
      ],
      manualOverrideSessionsRemaining: 2,
    });
    expect(d.direction).toBe("hold");
    expect(d.reason).toMatch(/paused/i);
  });

  it("demote takes precedence and needs only 2 sessions of data", () => {
    const d = decideLevelChange({
      currentLevel: "B1",
      recentSessions: [
        sig(B1.demoteAbove + 1, 5),
        sig(B1.demoteAbove + 1, 6),
      ],
    });
    expect(d.direction).toBe("down");
  });

  it("holds with too little data", () => {
    const d = decideLevelChange({
      currentLevel: "B1",
      recentSessions: [sig(0, 5)],
    });
    expect(d.direction).toBe("hold");
  });
});
