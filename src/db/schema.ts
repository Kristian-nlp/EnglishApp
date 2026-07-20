import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";
import { CEFR_LEVELS } from "@/lib/cefr";
import { CORRECTION_TAGS } from "@/lib/corrections/tags";

/**
 * Database schema (spec section 4). Column names are snake_case in Postgres;
 * Drizzle maps them to camelCase TypeScript keys.
 *
 * Every user-scoped table carries `user_id` so that every row-level query can be
 * scoped by the session user (NFR-303). Indexes follow §4.3.
 */

// --- Enums -----------------------------------------------------------------

const asEnumValues = <T extends readonly string[]>(values: T) =>
  values as unknown as [string, ...string[]];

export const cefrLevelEnum = pgEnum("cefr_level", asEnumValues(CEFR_LEVELS));
export const correctionTagEnum = pgEnum(
  "correction_tag",
  asEnumValues(CORRECTION_TAGS),
);
export const accentEnum = pgEnum("accent", ["en-US", "en-GB"]);
export const voiceEnum = pgEnum("voice", ["male", "female"]);
export const correctionIntensityEnum = pgEnum("correction_intensity", [
  "gentle",
  "balanced",
  "strict",
]);
export const germanSupportEnum = pgEnum("german_support", [
  "heavy",
  "light",
  "none",
]);
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"]);
export const reviewGradeEnum = pgEnum("review_grade", [
  "again",
  "hard",
  "good",
  "easy",
]);
export const reviewSourceEnum = pgEnum("review_source", [
  "review",
  "conversation",
]);

// --- Users & settings (FR-100, FR-1000) ------------------------------------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Auth.js adapter fields:
  email: text("email").notNull().unique(),
  name: text("name"),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Hard-delete leaves no rows (FR-107); this column supports a grace window
  // only if a future soft-delete is ever needed. Default flow sets nothing.
  deletedAt: timestamp("deleted_at", { withTimezone: true }),

  // Settings (FR-1000). Persisted here so they sync across devices (FR-1008).
  cefrLevel: cefrLevelEnum("cefr_level").notNull().default("A2"),
  accent: accentEnum("accent").notNull().default("en-GB"),
  voice: voiceEnum("voice").notNull().default("female"),
  speakingSpeed: real("speaking_speed").notNull().default(1.0),
  correctionIntensity: correctionIntensityEnum("correction_intensity")
    .notNull()
    .default("balanced"),
  germanSupport: germanSupportEnum("german_support")
    .notNull()
    .default("light"),
  silenceThresholdMs: integer("silence_threshold_ms").notNull().default(4500),
  weeklyMinuteGoal: integer("weekly_minute_goal").notNull().default(60),
  pushToTalk: boolean("push_to_talk").notNull().default(true),
  reminderHour: integer("reminder_hour"), // null = reminders off (FR-708)
});

// --- Auth.js adapter tables (FR-101, FR-102, FR-103) -----------------------

export const accounts = pgTable(
  "accounts",
  {
    // Property names match what @auth/drizzle-adapter reads off the table.
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
    index("accounts_user_id_idx").on(t.userId),
  ],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// --- Learning sessions & messages (FR-300, §4.1) ---------------------------

export const learningSessions = pgTable(
  "learning_sessions",
  {
    // Client-generated UUID — the idempotency key for import (FR-204).
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topic: text("topic"),
    scenarioId: uuid("scenario_id").references(() => scenarios.id, {
      onDelete: "set null",
    }),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationS: integer("duration_s"),
    learnerWordCount: integer("learner_word_count").notNull().default(0),
    learnerSpeechS: integer("learner_speech_s").notNull().default(0), // FR-410
    aiSpeechS: integer("ai_speech_s").notNull().default(0),
    cefrLevelAtStart: cefrLevelEnum("cefr_level_at_start"),
    cefrLevelAtEnd: cefrLevelEnum("cefr_level_at_end"),
  },
  (t) => [
    // FR-808 / §4.3: recent sessions per user.
    index("learning_sessions_user_started_idx").on(
      t.userId,
      t.startedAt.desc(),
    ),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => learningSessions.id, { onDelete: "cascade" }),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    audioUrl: text("audio_url"), // cached TTS (FR-402); null by default (NFR-401)
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    seq: integer("seq").notNull(),
  },
  (t) => [
    // §4.3: ordered message retrieval.
    uniqueIndex("messages_session_seq_idx").on(t.sessionId, t.seq),
  ],
);

export const corrections = pgTable(
  "corrections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tag: correctionTagEnum("tag").notNull(),
    original: text("original").notNull(),
    corrected: text("corrected").notNull(),
    explanation: text("explanation").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // §4.3: grammar tracker queries (FR-803).
    index("corrections_user_tag_created_idx").on(
      t.userId,
      t.tag,
      t.createdAt,
    ),
  ],
);

// --- Vocabulary & SRS (FR-700) ---------------------------------------------

export const vocabItems = pgTable(
  "vocab_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    word: text("word").notNull(),
    germanGloss: text("german_gloss").notNull(),
    sourceSentence: text("source_sentence").notNull(), // FR-701
    cefrBand: cefrLevelEnum("cefr_band").notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // §4.1: one row per (user, word).
    uniqueIndex("vocab_items_user_word_idx").on(t.userId, t.word),
  ],
);

export const srsState = pgTable(
  "srs_state",
  {
    vocabItemId: uuid("vocab_item_id")
      .primaryKey()
      .references(() => vocabItems.id, { onDelete: "cascade" }),
    stability: doublePrecision("stability").notNull(),
    difficulty: doublePrecision("difficulty").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    reps: integer("reps").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    state: integer("state").notNull().default(0), // ts-fsrs State (0..3)
  },
  (t) => [
    // §4.3: due-queue scan (joined to vocab_items for the user filter).
    index("srs_state_due_at_idx").on(t.dueAt),
  ],
);

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  vocabItemId: uuid("vocab_item_id")
    .notNull()
    .references(() => vocabItems.id, { onDelete: "cascade" }),
  grade: reviewGradeEnum("grade").notNull(),
  source: reviewSourceEnum("source").notNull(), // FR-706
  reviewedAt: timestamp("reviewed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// --- Pronunciation (FR-900) ------------------------------------------------

export const pronScores = pgTable("pron_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  word: text("word").notNull(),
  phoneme: text("phoneme"), // per-phoneme where returned (FR-902)
  accuracyScore: real("accuracy_score").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// --- Scenarios (FR-600) ----------------------------------------------------

export const scenarios = pgTable("scenarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  cefrMin: cefrLevelEnum("cefr_min").notNull(),
  cefrMax: cefrLevelEnum("cefr_max").notNull(),
  tutorRole: text("tutor_role").notNull(),
  learnerGoal: text("learner_goal").notNull(),
  requiredFunctions: jsonb("required_functions").notNull(),
  rubric: jsonb("rubric").notNull(),
});

export const scenarioRuns = pgTable(
  "scenario_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").references(() => learningSessions.id, {
      onDelete: "set null",
    }),
    scenarioId: uuid("scenario_id")
      .notNull()
      .references(() => scenarios.id, { onDelete: "cascade" }),
    passed: boolean("passed").notNull(),
    rubricResult: jsonb("rubric_result").notNull(), // FR-606
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("scenario_runs_user_idx").on(t.userId, t.scenarioId)],
);

export const customTopics = pgTable(
  "custom_topics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("custom_topics_user_idx").on(t.userId)],
);

// --- Rollups & usage (FR-800, §9) ------------------------------------------

export const dailyStats = pgTable(
  "daily_stats",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD in the user's timezone
    minutes: real("minutes").notNull().default(0),
    turns: integer("turns").notNull().default(0),
    learnerWords: integer("learner_words").notNull().default(0),
    errorsPer100w: real("errors_per_100w").notNull().default(0),
    mlu: real("mlu").notNull().default(0),
    ttr: real("ttr").notNull().default(0),
    talkTimeRatio: real("talk_time_ratio").notNull().default(0),
    selfCorrectionRate: real("self_correction_rate").notNull().default(0),
    reviewsDone: integer("reviews_done").notNull().default(0),
  },
  (t) => [
    // §4.1 composite PK; §4.3 dashboard read pattern.
    primaryKey({ columns: [t.userId, t.date] }),
    index("daily_stats_user_date_idx").on(t.userId, t.date),
  ],
);

export const usage = pgTable(
  "usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    ttsCharacters: integer("tts_characters").notNull().default(0),
    sttSeconds: integer("stt_seconds").notNull().default(0),
    estimatedCostCents: integer("estimated_cost_cents").notNull().default(0),
  },
  (t) => [index("usage_user_date_idx").on(t.userId, t.date)],
);

// Convenience type exports for use across the app.
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type LearningSession = typeof learningSessions.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Correction = typeof corrections.$inferSelect;
export type VocabItem = typeof vocabItems.$inferSelect;
export type SrsStateRow = typeof srsState.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Scenario = typeof scenarios.$inferSelect;
export type ScenarioRun = typeof scenarioRuns.$inferSelect;
export type DailyStat = typeof dailyStats.$inferSelect;
export type UsageRow = typeof usage.$inferSelect;
