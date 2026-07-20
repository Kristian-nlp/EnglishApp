import { describe, expect, it } from "vitest";
import {
  errorsPer100Words,
  meanLengthOfUtterance,
  movingWindowTTR,
  selfCorrectionRate,
  talkTimeRatio,
  tokenizeWords,
  typeTokenRatio,
} from "./index";

describe("tokenizeWords", () => {
  it("lowercases and strips punctuation/digits", () => {
    expect(tokenizeWords("Hello, world! 123")).toEqual(["hello", "world"]);
  });
  it("keeps internal apostrophes and hyphens as one token", () => {
    expect(tokenizeWords("I don't like mother-in-law visits")).toEqual([
      "i",
      "don't",
      "like",
      "mother-in-law",
      "visits",
    ]);
  });
  it("handles non-ASCII letters", () => {
    expect(tokenizeWords("Über Grüße")).toEqual(["über", "grüße"]);
  });
  it("empty / punctuation-only -> []", () => {
    expect(tokenizeWords("")).toEqual([]);
    expect(tokenizeWords("!!! ??? ...")).toEqual([]);
  });
});

describe("meanLengthOfUtterance (FR-802)", () => {
  it("averages words per utterance", () => {
    expect(meanLengthOfUtterance(["one two three", "four five"])).toBe(2.5);
  });
  it("ignores empty/whitespace utterances in num and denom", () => {
    expect(meanLengthOfUtterance(["a b c", "   ", ""])).toBe(3);
  });
  it("returns 0 when nothing to measure", () => {
    expect(meanLengthOfUtterance([])).toBe(0);
    expect(meanLengthOfUtterance(["", "  "])).toBe(0);
  });
});

describe("typeTokenRatio", () => {
  it("unique/total", () => {
    expect(typeTokenRatio(["a", "b", "a", "c"])).toBe(3 / 4);
  });
  it("all identical -> low ratio", () => {
    expect(typeTokenRatio(["x", "x", "x", "x"])).toBe(1 / 4);
  });
  it("empty -> 0", () => {
    expect(typeTokenRatio([])).toBe(0);
  });
});

describe("movingWindowTTR / MATTR (FR-802)", () => {
  it("falls back to simple TTR when tokens <= window", () => {
    const tokens = ["a", "b", "a"];
    expect(movingWindowTTR(tokens, 10)).toBe(typeTokenRatio(tokens));
  });
  it("averages window TTRs", () => {
    // tokens: a b a c, window 2 -> windows [a,b]=1, [b,a]=1, [a,c]=1 => 1.0
    expect(movingWindowTTR(["a", "b", "a", "c"], 2)).toBe(1);
    // tokens: a a b, window 2 -> [a,a]=0.5, [a,b]=1 => 0.75
    expect(movingWindowTTR(["a", "a", "b"], 2)).toBe(0.75);
  });
  it("clamps a non-positive window to 1", () => {
    // window 1 -> every window has 1 unique token => always 1
    expect(movingWindowTTR(["a", "a", "b"], 0)).toBe(1);
  });
  it("empty -> 0", () => {
    expect(movingWindowTTR([], 5)).toBe(0);
  });
});

describe("errorsPer100Words (FR-502)", () => {
  it("scales to 100 words", () => {
    expect(errorsPer100Words(3, 150)).toBe(2);
  });
  it("guards zero words", () => {
    expect(errorsPer100Words(5, 0)).toBe(0);
    expect(errorsPer100Words(5, -1)).toBe(0);
  });
});

describe("selfCorrectionRate (FR-502)", () => {
  it("fraction of error events repaired", () => {
    expect(selfCorrectionRate(2, 2)).toBe(0.5);
    expect(selfCorrectionRate(3, 0)).toBe(1);
  });
  it("no error events -> 0", () => {
    expect(selfCorrectionRate(0, 0)).toBe(0);
  });
});

describe("talkTimeRatio (FR-410)", () => {
  it("learner share of speech time", () => {
    expect(talkTimeRatio(60, 40)).toBeCloseTo(0.6, 10);
  });
  it("no speech -> 0", () => {
    expect(talkTimeRatio(0, 0)).toBe(0);
  });
});
