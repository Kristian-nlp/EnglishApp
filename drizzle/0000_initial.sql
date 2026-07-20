CREATE TYPE "public"."accent" AS ENUM('en-US', 'en-GB');--> statement-breakpoint
CREATE TYPE "public"."cefr_level" AS ENUM('A1', 'A2', 'B1', 'B2', 'C1');--> statement-breakpoint
CREATE TYPE "public"."correction_intensity" AS ENUM('gentle', 'balanced', 'strict');--> statement-breakpoint
CREATE TYPE "public"."correction_tag" AS ENUM('V2_WORDORDER', 'ADV_PLACEMENT', 'SUBORD_WORDORDER', 'TENSE_PRESPERF', 'TENSE_PROGRESSIVE', 'SINCE_FOR', 'FALSE_FRIEND', 'UNCOUNTABLE', 'ARTICLE', 'PREPOSITION', 'MODAL', 'CAP_NOUN', 'PLURAL_AGREEMENT', 'PRONOUN', 'LEXICAL_CHOICE', 'SPELLING', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."german_support" AS ENUM('heavy', 'light', 'none');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."review_grade" AS ENUM('again', 'hard', 'good', 'easy');--> statement-breakpoint
CREATE TYPE "public"."review_source" AS ENUM('review', 'conversation');--> statement-breakpoint
CREATE TYPE "public"."voice" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"tag" "correction_tag" NOT NULL,
	"original" text NOT NULL,
	"corrected" text NOT NULL,
	"explanation" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_stats" (
	"user_id" uuid NOT NULL,
	"date" text NOT NULL,
	"minutes" real DEFAULT 0 NOT NULL,
	"turns" integer DEFAULT 0 NOT NULL,
	"learner_words" integer DEFAULT 0 NOT NULL,
	"errors_per_100w" real DEFAULT 0 NOT NULL,
	"mlu" real DEFAULT 0 NOT NULL,
	"ttr" real DEFAULT 0 NOT NULL,
	"talk_time_ratio" real DEFAULT 0 NOT NULL,
	"self_correction_rate" real DEFAULT 0 NOT NULL,
	"reviews_done" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "daily_stats_user_id_date_pk" PRIMARY KEY("user_id","date")
);
--> statement-breakpoint
CREATE TABLE "learning_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"topic" text,
	"scenario_id" uuid,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_s" integer,
	"learner_word_count" integer DEFAULT 0 NOT NULL,
	"learner_speech_s" integer DEFAULT 0 NOT NULL,
	"ai_speech_s" integer DEFAULT 0 NOT NULL,
	"cefr_level_at_start" "cefr_level",
	"cefr_level_at_end" "cefr_level"
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"audio_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"seq" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pron_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"word" text NOT NULL,
	"phoneme" text,
	"accuracy_score" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vocab_item_id" uuid NOT NULL,
	"grade" "review_grade" NOT NULL,
	"source" "review_source" NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenario_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid,
	"scenario_id" uuid NOT NULL,
	"passed" boolean NOT NULL,
	"rubric_result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"cefr_min" "cefr_level" NOT NULL,
	"cefr_max" "cefr_level" NOT NULL,
	"tutor_role" text NOT NULL,
	"learner_goal" text NOT NULL,
	"required_functions" jsonb NOT NULL,
	"rubric" jsonb NOT NULL,
	CONSTRAINT "scenarios_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "srs_state" (
	"vocab_item_id" uuid PRIMARY KEY NOT NULL,
	"stability" double precision NOT NULL,
	"difficulty" double precision NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"reps" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"state" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"tts_characters" integer DEFAULT 0 NOT NULL,
	"stt_seconds" integer DEFAULT 0 NOT NULL,
	"estimated_cost_cents" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"email_verified" timestamp with time zone,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"cefr_level" "cefr_level" DEFAULT 'A2' NOT NULL,
	"accent" "accent" DEFAULT 'en-GB' NOT NULL,
	"voice" "voice" DEFAULT 'female' NOT NULL,
	"speaking_speed" real DEFAULT 1 NOT NULL,
	"correction_intensity" "correction_intensity" DEFAULT 'balanced' NOT NULL,
	"german_support" "german_support" DEFAULT 'light' NOT NULL,
	"silence_threshold_ms" integer DEFAULT 4500 NOT NULL,
	"weekly_minute_goal" integer DEFAULT 60 NOT NULL,
	"push_to_talk" boolean DEFAULT true NOT NULL,
	"reminder_hour" integer,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "vocab_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"word" text NOT NULL,
	"german_gloss" text NOT NULL,
	"source_sentence" text NOT NULL,
	"cefr_band" "cefr_level" NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrections" ADD CONSTRAINT "corrections_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrections" ADD CONSTRAINT "corrections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_topics" ADD CONSTRAINT "custom_topics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_stats" ADD CONSTRAINT "daily_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_sessions" ADD CONSTRAINT "learning_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_sessions" ADD CONSTRAINT "learning_sessions_scenario_id_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."scenarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_session_id_learning_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."learning_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pron_scores" ADD CONSTRAINT "pron_scores_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pron_scores" ADD CONSTRAINT "pron_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_vocab_item_id_vocab_items_id_fk" FOREIGN KEY ("vocab_item_id") REFERENCES "public"."vocab_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_runs" ADD CONSTRAINT "scenario_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_runs" ADD CONSTRAINT "scenario_runs_session_id_learning_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."learning_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_runs" ADD CONSTRAINT "scenario_runs_scenario_id_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."scenarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "srs_state" ADD CONSTRAINT "srs_state_vocab_item_id_vocab_items_id_fk" FOREIGN KEY ("vocab_item_id") REFERENCES "public"."vocab_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage" ADD CONSTRAINT "usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocab_items" ADD CONSTRAINT "vocab_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "corrections_user_tag_created_idx" ON "corrections" USING btree ("user_id","tag","created_at");--> statement-breakpoint
CREATE INDEX "custom_topics_user_idx" ON "custom_topics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "daily_stats_user_date_idx" ON "daily_stats" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "learning_sessions_user_started_idx" ON "learning_sessions" USING btree ("user_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "messages_session_seq_idx" ON "messages" USING btree ("session_id","seq");--> statement-breakpoint
CREATE INDEX "scenario_runs_user_idx" ON "scenario_runs" USING btree ("user_id","scenario_id");--> statement-breakpoint
CREATE INDEX "srs_state_due_at_idx" ON "srs_state" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "usage_user_date_idx" ON "usage" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "vocab_items_user_word_idx" ON "vocab_items" USING btree ("user_id","word");