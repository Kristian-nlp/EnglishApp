# English Tutor

AI-powered English conversation tutor for German-speaking learners (CEFR A1–C1).
Speak English with a warm AI tutor, get gentle in-context correction and
pronunciation feedback, and return because progress is measurable and vocabulary
comes back for review at the right time.

This repository is built against a numbered requirements specification. Every
implemented piece references the requirement it satisfies (e.g. `FR-306`,
`NFR-105`) in code comments so the spec and the code stay traceable.

> **Build status — Phase 1 foundation.** The scaffolding, data model, shared
> validation, the tested pure-domain core, authentication, and the mobile-first
> PWA shell are in place and verified (typecheck + tests + production build all
> green). The conversation engine, dashboards, SRS UI, scenarios and voice
> pipeline are scaffolded by the schema/domain layer but not yet wired to routes
> — see the roadmap below.

---

## Tech stack (spec §2)

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript strict |
| Database | Postgres (Neon or Supabase — pooled endpoint) |
| ORM | Drizzle ORM + `drizzle-kit` migrations |
| Auth | Auth.js v5 (NextAuth) + Drizzle adapter — Google OAuth + Resend magic link |
| Validation | Zod on every boundary, shared client/server |
| SRS | `ts-fsrs` |
| LLM / TTS / STT | OpenAI (`gpt-4o-mini`, `tts-1`, Whisper) |
| Styling | Tailwind CSS v4 |
| Testing | Vitest (+ Playwright and an LLM eval harness, later phases) |

---

## What's implemented and verified

### Foundation
- **Project scaffold** — Next 15 / React 19 / TS strict with
  `noUncheckedIndexedAccess`, Tailwind v4, Vitest, ESLint, Drizzle config.
- **Validated server env** (`src/lib/env.ts`) — Zod-checked, lazy, never
  reaches the client (NFR-305). Throws a readable list of what's missing.

### Data model — spec §4 (`src/db/schema.ts`)
All 16 tables, 9 enums (including the 17-value `correction_tag` taxonomy and the
5-level `cefr_level`), and every §4.3 index. Initial migration generated at
`drizzle/0000_initial.sql`. Pooled, single-connection client with `prepare:false`
for transaction poolers (NFR-105) in `src/db/client.ts`.

### Authentication — FR-100 (`src/auth.ts`)
- Google OAuth (FR-102) and Resend email magic link, 15-min single-use (FR-101).
- Database session strategy, 30-day rolling httpOnly cookie (FR-103).
- `requireUserId()` resolves the user from the server session; no user id is ever
  taken from the client (FR-109).

### Shared validation schemas (`src/lib/schemas/`)
- **Tutor structured output** (FR-303/304/305): `reply`, `corrections[]`,
  `vocabulary[]`, `pronunciationTip?`, `funFact?`, `difficultySignal`,
  `sessionShouldEnd` — prose and metadata as separate fields, never parsed from a
  single string. A snapshot test guards against silent schema drift (TEST-107).
- **Settings** (FR-1000), **scenarios + rubric** (FR-604/606), and the
  **localStorage import** payload with partial-import + de-duplication (FR-204/206).

### Tested pure-domain core (`src/lib/`)
Fully unit-tested with Vitest (TEST-101). The metric, adaptation and FSRS
modules are at **100% branch coverage**.
- **Metrics** (FR-802/502): MLU, moving-window TTR (MATTR), errors-per-100-words,
  self-correction rate, talk-time ratio, tokenizer.
- **Level adaptation** (FR-503/504/506): promote on 3 rising-MLU low-error
  sessions, demote on 2 high-error sessions, one band per session, manual
  override suppression.
- **FSRS scheduling** (FR-702/704/706): grade mapping, review scheduling,
  conversation-as-review, verified deterministic and round-trip-safe through the
  stored column subset.
- **Correction prioritisation** (FR-306): ≤2 per turn, severity then recency,
  the A1/A2 consecutive-turn suppression rule.

### Mobile-first PWA shell — spec §10
- Manifest with `display: standalone`, portrait lock, maskable icon (FR-1202).
- Dark-by-default theme (FR-1220), `100dvh` (FR-1210), safe-area insets
  (FR-1211), 16px inputs (FR-1216), `touch-action`/`overscroll` guards (FR-1217),
  reduced-motion (NFR-506), visible focus rings (NFR-502).

---

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in values (see spec §2)

# Database (needs DATABASE_URL / DATABASE_URL_UNPOOLED)
npm run db:generate          # regenerate migrations from the schema
npm run db:migrate           # apply migrations (uses the unpooled endpoint)

npm run dev                  # http://localhost:3000
```

### Scripts

| Script | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev / production build / serve |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm test` / `npm run test:watch` | Vitest |
| `npm run lint` | ESLint (next/core-web-vitals) |
| `npm run db:generate` / `db:migrate` / `db:push` / `db:studio` | Drizzle |

The app uses the **pooled** database endpoint; migrations use the **unpooled**
one (`drizzle.config.ts`).

---

## Testing

```bash
npm test                     # all unit tests
npx vitest run --coverage    # coverage (metrics/adaptation/srs at 100% branch)
```

Coverage is enforced at 90%+ on the pure-domain modules via `vitest.config.ts`.
All external APIs will be mocked in CI — no test calls OpenAI or Azure (TEST-108).

---

## Deploying to Vercel (database + sign-in)

Real sign-in needs a Postgres database (users and sessions are stored there), a
session secret, and at least one provider. The quickest path is the **Neon**
integration, whose env var names match this project exactly.

### 1. Create the database (Neon via Vercel)

1. Vercel dashboard → your project → **Storage** → **Create Database** →
   **Neon** (Postgres) from the Marketplace. Pick a region near your learners
   (e.g. Frankfurt).
2. Vercel injects the connection env vars automatically, including
   **`DATABASE_URL`** (pooled — used by the app, NFR-105) and
   **`DATABASE_URL_UNPOOLED`** (direct — used for migrations). Confirm under
   Project → Settings → Environment Variables.

   Supabase works too (Storage → Supabase); just make sure `DATABASE_URL` is the
   **pooled** string (port 6543) and `DATABASE_URL_UNPOOLED` the direct one
   (port 5432).

### 2. Apply the migrations

The schema lives in `drizzle/`. Apply it once against the new database:

```bash
npm i -g vercel
vercel link                    # link this folder to the Vercel project
vercel env pull .env.local     # pulls DATABASE_URL_UNPOOLED etc.
npm run db:migrate             # applies drizzle/0000_initial.sql
```

(Alternatively, paste `drizzle/0000_initial.sql` into the Neon SQL editor.)

### 3. Add the remaining sign-in env vars

In Project → Settings → Environment Variables (Production):

| Variable | How to get it |
|---|---|
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google Cloud → Credentials → OAuth client. Add the redirect URI `https://<your-app>/api/auth/callback/google`. |
| `RESEND_API_KEY` + `AUTH_EMAIL_FROM` | Resend API key + a **verified** sender domain (for magic links). |

You need Google **or** Resend — set both to offer both. Auth.js auto-detects the
site URL on Vercel (`trustHost` is on), so `AUTH_URL` is optional.

> **Never set `DEV_LOGIN` in production.** The dev test login is refused on
> production Vercel deployments regardless, but leave it unset to be safe.

### 4. Redeploy

Redeploy so the env vars take effect. The sign-in buttons enable automatically
once their vars are present — each provider is gated independently, so setting
only Resend lights up the magic link while Google stays disabled.

Full app functionality later also uses `UPSTASH_REDIS_REST_URL/TOKEN`,
`BLOB_READ_WRITE_TOKEN` and `CRON_SECRET` (see `.env.example`), but none of those
are needed just to sign in.

---

## Roadmap (spec §8, adjusted for mobile §10.7)

| Phase | Contents | Status |
|---|---|---|
| 1 | Next 15, Drizzle, Auth.js, users/settings, PWA shell | **foundation in place** |
| 2 | Sessions, messages, corrections, structured-output chat, Whisper STT | schema + schemas ready; routes pending |
| 3 | localStorage import | payload validation ready; `/api/import` pending |
| 4 | `daily_stats` rollup, cron, dashboard metrics | metrics + table ready; rollup/UI pending |
| 5 | SRS tables, review screen, offline queue | FSRS core ready; screen pending |
| 6 | Scenarios + rubric scoring | schema + rubric ready; content/routes pending |
| 7 | Voice: barge-in, transcript edit, TTS caching | pending |
| 8 | Azure pronunciation assessment | pending |
| 9 | OpenAI Realtime migration | pending |

### Immediate next steps
1. API routes (spec §5): `/api/settings`, `/api/account` (hard delete, FR-107),
   `/api/export` (FR-108), `/api/sessions`, `/api/chat` (structured outputs).
2. Onboarding + settings UI (FR-105/106) and the conversation screen.
3. `next-intl` UI-chrome i18n (NFR-601/602) and the service worker (FR-1203).

---

## Open decisions (spec §11)

Deliberately unresolved; settle before the relevant phase. The code stays
neutral to keep these reversible:
- **DB host**: Neon (branching) vs Supabase (bundled auth/storage). Schema and
  pooled client work with either.
- **PWA only vs Capacitor wrapper** — decide after testing mobile audio (§10.3)
  on real hardware.
- **Scenarios in DB vs version-controlled seed files** — the shared Zod schema
  supports both.

---

## Architecture notes

- **Traceability**: code references spec IDs (`FR-…`, `NFR-…`, `TEST-…`).
- **No secrets on the client**: only server modules import `src/lib/env.ts`; a
  runtime guard throws if it is ever evaluated in the browser (NFR-305).
- **User isolation**: every user-scoped table carries `user_id`; routes resolve
  the user from the session (FR-109, NFR-303).
- **Structured outputs, not string parsing**: the tutor contract is a Zod schema
  (`src/lib/schemas/tutor.ts`); prose and metadata never share a field (FR-303).
