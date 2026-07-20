import { z } from "zod";
import { CEFR_LEVELS } from "@/lib/cefr";

/**
 * localStorage migration payload (FR-200 family).
 *
 * Import is idempotent on the client-generated session UUID (FR-204) and must
 * import what is valid while reporting what was skipped, rather than failing
 * whole (FR-206). To honour that, we validate each item individually and keep a
 * skip list — see `partitionImportPayload`.
 */

export const legacySessionSchema = z.object({
  id: z.string().uuid(), // client-generated UUID, the idempotency key (FR-204)
  topic: z.string().min(1),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable().optional(),
  durationS: z.number().int().nonnegative().optional(),
  cefrLevel: z.enum(CEFR_LEVELS).optional(),
});
export type LegacySession = z.infer<typeof legacySessionSchema>;

export const legacyVocabSchema = z.object({
  word: z.string().min(1),
  germanGloss: z.string().min(1),
  sourceSentence: z.string().min(1).optional(),
  cefrBand: z.enum(CEFR_LEVELS).optional(),
});
export type LegacyVocab = z.infer<typeof legacyVocabSchema>;

export const importPayloadSchema = z.object({
  version: z.number().int().optional(),
  sessions: z.array(z.unknown()).default([]),
  vocabulary: z.array(z.unknown()).default([]),
});
export type ImportPayload = z.infer<typeof importPayloadSchema>;

export interface SkippedItem {
  kind: "session" | "vocab";
  index: number;
  reason: string;
}

export interface PartitionedImport {
  sessions: LegacySession[];
  vocabulary: LegacyVocab[];
  skipped: SkippedItem[];
}

/**
 * Split a raw payload into valid rows plus a skip report (FR-206).
 * Never throws on individual bad rows — only a totally unparseable envelope
 * (not an object with the right array fields) fails at the caller's `.parse`.
 */
export function partitionImportPayload(payload: ImportPayload): PartitionedImport {
  const sessions: LegacySession[] = [];
  const vocabulary: LegacyVocab[] = [];
  const skipped: SkippedItem[] = [];

  payload.sessions.forEach((raw, index) => {
    const parsed = legacySessionSchema.safeParse(raw);
    if (parsed.success) {
      sessions.push(parsed.data);
    } else {
      skipped.push({
        kind: "session",
        index,
        reason: parsed.error.issues[0]?.message ?? "invalid session",
      });
    }
  });

  payload.vocabulary.forEach((raw, index) => {
    const parsed = legacyVocabSchema.safeParse(raw);
    if (parsed.success) {
      vocabulary.push(parsed.data);
    } else {
      skipped.push({
        kind: "vocab",
        index,
        reason: parsed.error.issues[0]?.message ?? "invalid vocab item",
      });
    }
  });

  // De-duplicate sessions by UUID within the payload itself (FR-204). The DB
  // insert additionally upserts on the same key for cross-request idempotency.
  const seen = new Set<string>();
  const dedupedSessions = sessions.filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  return { sessions: dedupedSessions, vocabulary, skipped };
}
