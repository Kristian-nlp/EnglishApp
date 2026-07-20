import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

/**
 * Drizzle client over the POOLED Postgres endpoint (NFR-105). One connection per
 * instance, reused across warm serverless invocations for cold-start economics
 * (spec §2).
 *
 * The client is created eagerly and returns a real `PgDatabase` — required
 * because @auth/drizzle-adapter detects the dialect via `instanceof`, which a
 * lazy Proxy would defeat. postgres-js connects lazily (only on the first
 * query), so importing this module during `next build` — which runs no queries
 * — is safe even without a populated environment; we fall back to a
 * non-connecting placeholder URL in that case. A genuinely missing URL surfaces
 * as a clear connection error at request time, and `getServerEnv()` validates
 * the full secret set wherever routes need it.
 *
 * `prepare: false` is required for transaction-pooling poolers (PgBouncer /
 * Supabase / Neon pooled), which do not support prepared statements.
 */

const PLACEHOLDER_URL =
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  return url && url.length > 0 ? url : PLACEHOLDER_URL;
}

type DrizzleClient = ReturnType<typeof createClient>;

declare global {
  // eslint-disable-next-line no-var
  var __englishTutorDb: DrizzleClient | undefined;
}

function createClient() {
  const sql = postgres(connectionString(), {
    max: 1, // one connection per instance (NFR-105)
    prepare: false, // required by transaction-pooling endpoints
  });
  return drizzle(sql, { schema });
}

// Reuse across hot reloads in dev and warm serverless instances in prod.
export const db: DrizzleClient = globalThis.__englishTutorDb ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__englishTutorDb = db;
}

export { schema };
