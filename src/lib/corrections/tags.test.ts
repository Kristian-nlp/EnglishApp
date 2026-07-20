import { describe, expect, it } from "vitest";
import {
  CORRECTION_TAGS,
  CORRECTION_TAG_META,
  isBlockingTag,
  isCorrectionTag,
  tagSeverity,
} from "./tags";

describe("correction tags (§4.2)", () => {
  it("has exactly the 17 fixed tags", () => {
    expect(CORRECTION_TAGS).toHaveLength(17);
    expect(new Set(CORRECTION_TAGS).size).toBe(17); // no duplicates
    expect(CORRECTION_TAGS).toContain("OTHER");
  });

  it("every tag has complete metadata", () => {
    for (const tag of CORRECTION_TAGS) {
      const meta = CORRECTION_TAG_META[tag];
      expect(meta).toBeDefined();
      expect(typeof meta.severity).toBe("number");
      expect(typeof meta.blocking).toBe("boolean");
      expect(meta.label.length).toBeGreaterThan(0);
    }
  });

  it("isCorrectionTag guards unknown values", () => {
    expect(isCorrectionTag("V2_WORDORDER")).toBe(true);
    expect(isCorrectionTag("MADE_UP")).toBe(false);
    expect(isCorrectionTag(42)).toBe(false);
  });

  it("structural word-order outranks spelling in severity", () => {
    expect(tagSeverity("V2_WORDORDER")).toBeGreaterThan(tagSeverity("SPELLING"));
    expect(tagSeverity("OTHER")).toBeLessThan(tagSeverity("FALSE_FRIEND"));
  });

  it("blocking classification", () => {
    expect(isBlockingTag("V2_WORDORDER")).toBe(true);
    expect(isBlockingTag("FALSE_FRIEND")).toBe(true);
    expect(isBlockingTag("SPELLING")).toBe(false);
    expect(isBlockingTag("CAP_NOUN")).toBe(false);
  });
});
