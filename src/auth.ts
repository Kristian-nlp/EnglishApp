import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { db } from "@/db/client";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";

/**
 * Auth.js v5 configuration (FR-101, FR-102, FR-103).
 *
 *  - Email magic link via Resend, valid 15 minutes and single-use (FR-101).
 *  - Google OAuth; the same email links to the same account (FR-102). Auth.js
 *    reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET from the environment.
 *  - Database session strategy so sessions persist via a secure httpOnly cookie
 *    with a 30-day rolling expiry (FR-103).
 */

const THIRTY_DAYS_S = 30 * 24 * 60 * 60;
const ONE_DAY_S = 24 * 60 * 60;
const FIFTEEN_MINUTES_S = 15 * 60;

// Not a secret; the sender must be a verified Resend domain in production.
const EMAIL_FROM =
  process.env.AUTH_EMAIL_FROM ?? "English Tutor <onboarding@resend.dev>";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: {
    strategy: "database",
    maxAge: THIRTY_DAYS_S, // 30-day expiry (FR-103)
    updateAge: ONE_DAY_S, // rolling: refresh at most once per day
  },
  providers: [
    Google,
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: EMAIL_FROM,
      maxAge: FIFTEEN_MINUTES_S, // magic-link validity (FR-101)
    }),
  ],
  callbacks: {
    // Surface the DB user id on the session so every route can scope queries by
    // it server-side (FR-109). The client never supplies a user id.
    session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
  trustHost: true,
});
