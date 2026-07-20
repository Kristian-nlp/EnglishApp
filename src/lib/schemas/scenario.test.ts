import { describe, expect, it } from "vitest";
import {
  rubricResultSchema,
  scenarioPassed,
  scenarioSchema,
} from "./scenario";

const validScenario = {
  slug: "return-faulty-item",
  title: "Return a faulty item",
  cefrMin: "A2",
  cefrMax: "B1",
  tutorRole: "a shop assistant at the returns desk",
  learnerGoal: "obtain a full refund for a broken kettle",
  requiredFunctions: [
    { key: "explain_problem", description: "Describe what is wrong" },
    { key: "request_refund", description: "Ask for money back" },
  ],
  successCriteria: "A refund or replacement is agreed politely.",
};

describe("scenarioSchema (FR-604/605)", () => {
  it("accepts a valid scenario", () => {
    expect(() => scenarioSchema.parse(validScenario)).not.toThrow();
  });
  it("rejects a bad slug", () => {
    expect(() =>
      scenarioSchema.parse({ ...validScenario, slug: "Not A Slug" }),
    ).toThrow();
  });
  it("requires at least one required function", () => {
    expect(() =>
      scenarioSchema.parse({ ...validScenario, requiredFunctions: [] }),
    ).toThrow();
  });
});

describe("rubricResultSchema + scenarioPassed (FR-606/607)", () => {
  const result = {
    goalAchieved: true,
    registerAppropriate: true,
    requiredFunctionsUsed: [
      { key: "explain_problem", used: true },
      { key: "request_refund", used: true },
    ],
    feedback: "You explained the fault clearly. Next time, open more politely.",
  };

  it("accepts a valid rubric result", () => {
    expect(() => rubricResultSchema.parse(result)).not.toThrow();
  });

  it("passed requires goal AND register", () => {
    expect(scenarioPassed(result)).toBe(true);
    expect(scenarioPassed({ ...result, registerAppropriate: false })).toBe(false);
    expect(scenarioPassed({ ...result, goalAchieved: false })).toBe(false);
  });
});
