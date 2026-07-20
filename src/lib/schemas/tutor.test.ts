import { describe, expect, it } from "vitest";
import { parseTutorTurn, tutorTurnSchema } from "./tutor";

const validTurn = {
  reply: "That's a great start! Where did you go on holiday?",
  corrections: [
    {
      tag: "TENSE_PRESPERF",
      original: "I have been there last year",
      corrected: "I went there last year",
      explanation: "Use the simple past for a finished time like 'last year'.",
    },
  ],
  vocabulary: [
    {
      word: "seaside",
      germanGloss: "die Küste / das Meer",
      cefrBand: "A2",
      sourceSentence: "We spent a week at the seaside.",
    },
  ],
  pronunciationTip: "The 'th' in 'there' is soft: /ðeə/.",
  funFact: null,
  difficultySignal: "hold",
  sessionShouldEnd: false,
};

describe("tutorTurnSchema (FR-303/304/305)", () => {
  it("accepts a well-formed turn", () => {
    expect(() => parseTutorTurn(validTurn)).not.toThrow();
  });

  it("rejects an invalid correction tag (guards drift, TEST-107)", () => {
    const bad = {
      ...validTurn,
      corrections: [{ ...validTurn.corrections[0], tag: "NOT_A_TAG" }],
    };
    expect(() => parseTutorTurn(bad)).toThrow();
  });

  it("rejects a missing difficultySignal", () => {
    const { difficultySignal, ...rest } = validTurn;
    void difficultySignal;
    expect(() => parseTutorTurn(rest)).toThrow();
  });

  it("rejects an invalid difficultySignal value", () => {
    expect(() =>
      parseTutorTurn({ ...validTurn, difficultySignal: "sideways" }),
    ).toThrow();
  });

  it("allows optional fields to be omitted", () => {
    const { pronunciationTip, funFact, ...rest } = validTurn;
    void pronunciationTip;
    void funFact;
    expect(() => parseTutorTurn(rest)).not.toThrow();
  });

  it("does not constrain array counts (business rule handles trimming)", () => {
    const threeCorrections = {
      ...validTurn,
      corrections: [
        validTurn.corrections[0],
        { ...validTurn.corrections[0], tag: "ARTICLE" },
        { ...validTurn.corrections[0], tag: "SPELLING" },
      ],
    };
    expect(() => parseTutorTurn(threeCorrections)).not.toThrow();
  });

  // TEST-107: the wire shape must be stable. A schema change should require a
  // deliberate snapshot update, not slip through silently.
  it("has a stable field shape", () => {
    const shape = Object.keys(tutorTurnSchema.shape).sort();
    expect(shape).toMatchInlineSnapshot(`
      [
        "corrections",
        "difficultySignal",
        "funFact",
        "pronunciationTip",
        "reply",
        "sessionShouldEnd",
        "vocabulary",
      ]
    `);
  });
});
