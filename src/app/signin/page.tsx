import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { getServerEnv } from "@/lib/env";

export const metadata = { title: "Sign in — English Tutor" };

/** True when the auth secrets are present (Google, Resend, DB, AUTH_SECRET). */
function isAuthConfigured(): boolean {
  try {
    getServerEnv();
    return true;
  } catch {
    return false;
  }
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const configured = isAuthConfigured();

  // Already signed in? Send them home. (redirect() must live outside try/catch,
  // since it works by throwing.)
  let signedIn = false;
  if (configured) {
    try {
      const session = await auth();
      signedIn = Boolean(session?.user);
    } catch {
      signedIn = false;
    }
  }
  if (signedIn) redirect("/");

  const { error } = await searchParams;

  return (
    <main className="safe-area mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10">
      <header className="pt-10">
        <Link
          href="/"
          className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          ← Back
        </Link>
        <h1 className="mt-6 text-2xl font-bold leading-tight">
          Sign in to English Tutor
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Use Google, or get a magic link by email. No password needed.
        </p>
      </header>

      {error ? (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300"
        >
          Something went wrong signing you in. Please try again.
        </p>
      ) : null}

      {!configured ? (
        <div
          role="note"
          className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200"
        >
          <p className="font-semibold">Sign-in isn&apos;t configured here yet.</p>
          <p className="mt-1.5 text-amber-200/80">
            This preview has no auth credentials or database. To enable login,
            set <code>AUTH_SECRET</code>, <code>AUTH_GOOGLE_ID</code>/
            <code>SECRET</code>, <code>RESEND_API_KEY</code> and{" "}
            <code>DATABASE_URL</code>, then run the DB migrations. See{" "}
            <code>.env.example</code> and the README.
          </p>
        </div>
      ) : null}

      <div className="mt-8 grid gap-4">
        {/* Google OAuth (FR-102) */}
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            disabled={!configured}
            className="tap-target flex w-full items-center justify-center gap-3 rounded-full border border-[var(--border)] bg-[var(--surface)] px-6 py-4 text-base font-semibold transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <GoogleGlyph />
            Continue with Google
          </button>
        </form>

        <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
          <span className="h-px flex-1 bg-[var(--border)]" />
          or
          <span className="h-px flex-1 bg-[var(--border)]" />
        </div>

        {/* Email magic link via Resend (FR-101) */}
        <form
          action={async (formData: FormData) => {
            "use server";
            const email = String(formData.get("email") ?? "").trim();
            if (!email) return;
            await signIn("resend", { email, redirectTo: "/" });
          }}
          className="grid gap-3"
        >
          <label htmlFor="email" className="sr-only">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            disabled={!configured}
            className="tap-target w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-base outline-none focus:border-[var(--accent)] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!configured}
            className="tap-target flex w-full items-center justify-center rounded-full bg-[var(--accent)] px-6 py-4 text-base font-semibold text-[var(--accent-contrast)] transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Email me a magic link
          </button>
        </form>
      </div>

      <p className="mt-auto pt-10 text-center text-xs text-[var(--muted)]">
        The magic link is valid for 15 minutes and can be used once.
      </p>
    </main>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
