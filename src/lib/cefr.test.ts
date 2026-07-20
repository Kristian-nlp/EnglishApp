import { describe, expect, it } from "vitest";
import {
  CEFR_LEVELS,
  cefrIndex,
  compareCefr,
  defaultSilenceThresholdMs,
  demoteLevel,
  isAtOrAboveBand,
  isCefrLevel,
  promoteLevel,
} from "./cefr";

describe("cefr", () => {
  it("orders levels A1..C1", () => {
    expect(CEFR_LEVELS).toEqual(["A1", "A2", "B1", "B2", "C1"]);
    expect(cefrIndex("A1")).toBe(0);
    expect(cefrIndex("C1")).toBe(4);
  });

  it("isCefrLevel guards non-levels", () => {
    expect(isCefrLevel("B1")).toBe(true);
    expect(isCefrLevel("C2")).toBe(false);
    expect(isCefrLevel(2)).toBe(false);
    expect(isCefrLevel(null)).toBe(false);
  });

  it("compareCefr signs", () => {
    expect(compareCefr("A1", "B1")).toBeLessThan(0);
    expect(compareCefr("C1", "A2")).toBeGreaterThan(0);
    expect(compareCefr("B1", "B1")).toBe(0);
  });

  it("isAtOrAboveBand for vocab filtering (FR-307)", () => {
    expect(isAtOrAboveBand("B1", "A2")).toBe(true); // above
    expect(isAtOrAboveBand("A2", "A2")).toBe(true); // equal
    expect(isAtOrAboveBand("A1", "B2")).toBe(false); // below
  });

  it("promote/demote clamp at the ends (FR-504)", () => {
    expect(promoteLevel("A1")).toBe("A2");
    expect(promoteLevel("C1")).toBe("C1"); // ceiling
    expect(demoteLevel("B2")).toBe("B1");
    expect(demoteLevel("A1")).toBe("A1"); // floor
  });

  it("adaptive silence thresholds (FR-404)", () => {
    expect(defaultSilenceThresholdMs("A1")).toBe(4500);
    expect(defaultSilenceThresholdMs("A2")).toBe(4500);
    expect(defaultSilenceThresholdMs("B1")).toBe(3000);
    expect(defaultSilenceThresholdMs("B2")).toBe(2000);
    expect(defaultSilenceThresholdMs("C1")).toBe(2000);
  });
});
