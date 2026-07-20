import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

export const metadata = { title: "Your practice — English Tutor" };

/**
 * Authenticated home. A protected placeholder for now: it proves the session
 * works end-to-end and is where the conversation, dashboard and review screens
 * will live in the next phases. Unauthenticated visitors are sent to sign in.
 */
export default async function AppHome() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const name = session.user.name;
  const email = session.user.email;

  return (
    <main className="safe-area mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10">
      <header className="pt-10">
        <p className="text-sm font-medium tracking-wide text-[var(--accent)]">
          English Tutor
        </p>
        <h1 className="mt-3 text-2xl font-bold leading-tight">
          You&apos;re signed in{name ? `, ${name}` : ""}.
        </h1>
        {email ? (
          <p className="mt-2 text-sm text-[var(--muted)]">{email}</p>
        ) : null}
      </header>

      <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-base font-semibold">Your practice home</h2>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          This is a placeholder. The conversation screen, progress dashboard and
          spaced-repetition review land in the next phases — the session,
          settings and auth plumbing they build on is already in place.
        </p>
      </section>

      <div className="mt-auto pt-10">
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="tap-target flex w-full items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-6 py-4 text-base font-semibold transition-transform active:scale-[0.98]"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
