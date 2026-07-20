import { z } from "zod";

/**
 * Server-side environment validation (spec section 2, NFR-305).
 *
 * These values are secrets and MUST NEVER reach the client bundle. This module
 * has no `NEXT_PUBLIC_` variables, so importing it from a client component would
 * both fail validation at runtime and, more importantly, is a code smell caught
 * in review. Validation is lazy + cached so tests and `next build` don't need a
 * fully-populated environment just to import a route file.
 */

const serverEnvSchema = z.object({
  // Database — app uses the pooled endpoint (NFR-105).
  DATABASE_URL: z.string().url(),
  DATABASE_URL_UNPOOLED: z.string().url().optional(),

  // Auth.js v5
  AUTH_SECRET: z.string().min(1),
  AUTH_URL: z.string().url().optional(),
  AUTH_GOOGLE_ID: z.string().min(1),
  AUTH_GOOGLE_SECRET: z.string().min(1),

  // OpenAI
  OPENAI_API_KEY: z.string().min(1),

  // Email
  RESEND_API_KEY: z.string().min(1),

  // Upstash Redis (rate limiting + cache)
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

  // Vercel Blob (TTS cache)
  BLOB_READ_WRITE_TOKEN: z.string().min(1),

  // Cron protection (NFR-304)
  CRON_SECRET: z.string().min(1),

  // Azure Speech — phase 7, optional until then (FR-900)
  AZURE_SPEECH_KEY: z.string().optional(),
  AZURE_SPEECH_REGION: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

/**
 * Returns the validated server environment. Throws a readable error listing the
 * missing/invalid variables on first access. Cached thereafter.
 */
export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error(
      "getServerEnv() was called on the client. Secrets must never reach the browser (NFR-305).",
    );
  }
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid or missing server environment variables:\n${missing}`);
  }
  cached = parsed.data;
  return cached;
}
