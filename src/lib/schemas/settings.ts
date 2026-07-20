import { z } from "zod";
import {
  CEFR_LEVELS,
  DEFAULT_CEFR_LEVEL,
  SILENCE_THRESHOLD_MAX_MS,
  SILENCE_THRESHOLD_MIN_MS,
} from "@/lib/cefr";

/** User settings contract (FR-1000, FR-1008). Persisted to Postgres. */

export const accentSchema = z.enum(["en-US", "en-GB"]); // FR-1002
export type Accent = z.infer<typeof accentSchema>;

export const voiceSchema = z.enum(["male", "female"]); // FR-1003
export type Voice = z.infer<typeof voiceSchema>;

export const correctionIntensitySchema = z.enum([
  "gentle",
  "balanced",
  "strict",
]); // FR-1004
export type CorrectionIntensity = z.infer<typeof correctionIntensitySchema>;

export const germanSupportSchema = z.enum(["heavy", "light", "none"]); // FR-1005
export type GermanSupport = z.infer<typeof germanSupportSchema>;

export const SPEAKING_SPEED_MIN = 0.5; // FR-1001
export const SPEAKING_SPEED_MAX = 2.0;

export const settingsSchema = z.object({
  displayName: z.string().min(1).max(80),
  cefrLevel: z.enum(CEFR_LEVELS),
  accent: accentSchema,
  voice: voiceSchema,
  speakingSpeed: z.number().min(SPEAKING_SPEED_MIN).max(SPEAKING_SPEED_MAX),
  correctionIntensity: correctionIntensitySchema,
  germanSupport: germanSupportSchema,
  silenceThresholdMs: z
    .number()
    .int()
    .min(SILENCE_THRESHOLD_MIN_MS)
    .max(SILENCE_THRESHOLD_MAX_MS),
  pushToTalk: z.boolean(),
  weeklyMinuteGoal: z.number().int().min(0).max(10_000),
  /** Local hour (0–23) for the review reminder email, or null = off (FR-708). */
  reminderHour: z.number().int().min(0).max(23).nullable(),
});

export type Settings = z.infer<typeof settingsSchema>;

/** PATCH body: every field optional, but each still range-validated (FR-109). */
export const settingsPatchSchema = settingsSchema.partial().strict();
export type SettingsPatch = z.infer<typeof settingsPatchSchema>;

/**
 * Defaults applied at onboarding (FR-105). Mobile default is push-to-talk
 * (FR-1232) and A2/en-GB per FR-105.
 */
export const DEFAULT_SETTINGS: Settings = {
  displayName: "Learner",
  cefrLevel: DEFAULT_CEFR_LEVEL,
  accent: "en-GB",
  voice: "female",
  speakingSpeed: 1.0,
  correctionIntensity: "balanced",
  germanSupport: "light",
  silenceThresholdMs: 4500,
  pushToTalk: true,
  weeklyMinuteGoal: 60,
  reminderHour: null,
};
