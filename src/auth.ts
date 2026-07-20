import NextAuth, { type NextAuthConfig } from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/db/client";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";

/**
 * Auth.js v5 configuration (FR-101, FR-102, FR-103).
 *
 *  - Email magic link via Resend, valid 15 minutes and single-use (FR-101).
 *  - Google OAuth; the same email links to the same account (FR-102).
 *  - Database session strategy: secure httpOnly cookie, 30-day rolling (FR-103).
 *
 * Plus a DEV-ONLY test login (see `isDevLoginEnabled`) that lets you create and
 * sign in as an arbitrary user with no external services, so the app can be
 * clicked through locally. It is hard-disabled in production.
 */

const THIRTY_DAYS_S = 30 * 24 * 60 * 60;
const ONE_DAY_S = 24 * 60 * 60;
const FIFTEEN_MINUTES_S = 15 * 60;

// Not a secret; the sender must be a verified Resend domain in production.
const EMAIL_FROM =
  process.env.AUTH_EMAIL_FROM ?? "English Tutor <onboarding@resend.dev>";

/**
 * Whether the dev-only test login is active. NEVER true in a real production
 * deployment: a production Vercel env is refused outright, and otherwise it is
 * on by default only outside `NODE_ENV=production` (opt back on with
 * `DEV_LOGIN=true` for a local production-mode build if you really mean to).
 */
export function isDevLoginEnabled(): boolean {
  if (process.env.VERCEL_ENV === "production") return false;
  if (process.env.DEV_LOGIN === "true") return true;
  return process.env.NODE_ENV !== "production";
}

const devLogin = isDevLoginEnabled();

const providers: NextAuthConfig["providers"] = [
  Google,
  Resend({
    apiKey: process.env.RESEND_API_KEY,
    from: EMAIL_FROM,
    maxAge: FIFTEEN_MINUTES_S, // magic-link validity (FR-101)
  }),
  // Dev-only: create/sign-in as any user, no DB or email required.
  ...(devLogin
    ? [
        Credentials({
          id: "dev",
          name: "Developer login",
          credentials: {
            email: { label: "Email", type: "email" },
            name: { label: "Name", type: "text" },
          },
          authorize(raw) {
            const email = String(raw?.email ?? "")
              .trim()
              .toLowerCase();
            if (!email || !email.includes("@")) return null;
            const name =
              String(raw?.name ?? "").trim() || email.split("@")[0]!;
            // Stable id per email so repeated logins are the same user.
            return { id: `dev:${email}`, email, name };
          },
        }),
      ]
    : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: {
    // Credentials requires JWT sessions, so the dev login uses JWT. Production
    // keeps the spec's database sessions (FR-103).
    strategy: devLogin ? "jwt" : "database",
    maxAge: THIRTY_DAYS_S, // 30-day expiry (FR-103)
    updateAge: ONE_DAY_S, // rolling: refresh at most once per day
  },
  // Real secret in prod; a clearly-labelled throwaway only when dev login is on
  // and no secret is set, so local clickthrough works out of the box.
  secret:
    process.env.AUTH_SECRET ??
    (devLogin ? "dev-only-insecure-secret-do-not-use-in-production" : undefined),
  providers,
  pages: {
    signIn: "/signin", // custom, branded sign-in screen (FR-101/102)
  },
  callbacks: {
    // Surface the user id on the session so every route can scope queries by it
    // server-side (FR-109). `user` is present with database sessions, `token`
    // with JWT (dev login). The client never supplies a user id.
    session({ session, user, token }) {
      const id = user?.id ?? token?.sub;
      if (session.user && id) session.user.id = id;
      return session;
    },
  },
  trustHost: true,
});
