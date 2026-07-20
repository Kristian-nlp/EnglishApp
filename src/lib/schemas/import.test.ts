import { describe, expect, it } from "vitest";
import {
  importPayloadSchema,
  partitionImportPayload,
} from "./import";

const goodSession = {
  id: "11111111-1111-4111-8111-111111111111",
  topic: "Travel",
  startedAt: "2026-01-01T10:00:00.000Z",
  endedAt: "2026-01-01T10:08:00.000Z",
  durationS: 480,
  cefrLevel: "A2",
};

const goodVocab = {
  word: "delayed",
  germanGloss: "verspätet",
  sourceSentence: "The train was delayed.",
  cefrBand: "B1",
};

describe("partitionImportPayload (FR-206 partial import)", () => {
  it("keeps valid rows and reports skipped ones", () => {
    const payload = importPayloadSchema.parse({
      sessions: [goodSession, { id: "not-a-uuid", topic: "" }],
      vocabulary: [goodVocab, { word: "" }],
    });
    const out = partitionImportPayload(payload);
    expect(out.sessions).toHaveLength(1);
    expect(out.vocabulary).toHaveLength(1);
    expect(out.skipped).toHaveLength(2);
    expect(out.skipped.map((s) => s.kind).sort()).toEqual(["session", "vocab"]);
  });

  it("de-duplicates sessions by UUID within the payload (FR-204)", () => {
    const payload = importPayloadSchema.parse({
      sessions: [goodSession, { ...goodSession, topic: "Food" }],
      vocabulary: [],
    });
    const out = partitionImportPayload(payload);
    expect(out.sessions).toHaveLength(1);
    expect(out.sessions[0]!.topic).toBe("Travel"); // first wins
  });

  it("defaults missing arrays to empty", () => {
    const payload = importPayloadSchema.parse({});
    const out = partitionImportPayload(payload);
    expect(out.sessions).toEqual([]);
    expect(out.vocabulary).toEqual([]);
    expect(out.skipped).toEqual([]);
  });

  it("rejects a totally malformed envelope", () => {
    expect(() => importPayloadSchema.parse({ sessions: "nope" })).toThrow();
  });
});
