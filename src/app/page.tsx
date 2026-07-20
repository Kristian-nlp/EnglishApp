import Link from "next/link";
import { FeatureReveal } from "@/components/feature-reveal";

const FEATURES = [
  {
    title: "Talk, don't drill",
    body: "Real conversations with a warm tutor tuned for German speakers. Correction always serves the conversation.",
  },
  {
    title: "Gentle, tagged correction",
    body: "At most two fixes per turn, prioritised by what actually blocks understanding — from V2 word order to false friends.",
  },
  {
    title: "Vocabulary that comes back",
    body: "Words you meet in conversation return for spoken review at the right moment, and get woven back into later chats.",
  },
  {
    title: "Progress you can see",
    body: "Talk-time ratio, sentence length, and error trends — measured, not guessed, so improvement is visible.",
  },
];

export default function HomePage() {
  return (
    <main className="safe-area mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10">
      <div className="flex items-center justify-between pt-6">
        <p className="text-sm font-medium tracking-wide text-[var(--accent)]">
          English Tutor
        </p>
        {/* Secondary controls live at the top (FR-1212). */}
        <Link
          href="/signin"
          className="tap-target inline-flex items-center rounded-full px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:text-[var(--accent)]"
        >
          Sign in
        </Link>
      </div>

      <header className="pt-6">
        <h1 className="text-3xl font-bold leading-tight">
          Speak English with a tutor who never gets tired.
        </h1>
        <p className="mt-4 text-[var(--muted)]">
          Built for German-speaking learners from A1 to C1. Practise out loud,
          get gentle in-context feedback, and come back to see real progress.
        </p>
      </header>

      {/* Progressive disclosure: the button actually reveals the cards. */}
      <FeatureReveal>
        {FEATURES.map((f) => (
          <article
            key={f.title}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
          >
            <h2 className="text-base font-semibold">{f.title}</h2>
            <p className="mt-1.5 text-sm text-[var(--muted)]">{f.body}</p>
          </article>
        ))}
      </FeatureReveal>

      {/* Primary call to action, low for thumb reach (FR-1212). */}
      <div className="mt-auto pt-10">
        <Link
          href="/signin"
          className="tap-target flex w-full items-center justify-center rounded-full bg-[var(--accent)] px-6 py-4 text-base font-semibold text-[var(--accent-contrast)] transition-transform active:scale-[0.98]"
        >
          Get started
        </Link>
        <p className="mt-4 text-center text-xs text-[var(--muted)]">
          Foundation build · voice practice arrives next.
        </p>
      </div>
    </main>
  );
}
