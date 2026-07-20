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
      <header className="pt-10">
        <p className="text-sm font-medium tracking-wide text-[var(--accent)]">
          English Tutor
        </p>
        <h1 className="mt-3 text-3xl font-bold leading-tight">
          Speak English with a tutor who never gets tired.
        </h1>
        <p className="mt-4 text-[var(--muted)]">
          Built for German-speaking learners from A1 to C1. Practise out loud,
          get gentle in-context feedback, and come back to see real progress.
        </p>
      </header>

      <section
        id="features"
        aria-label="What's inside"
        className="mt-10 grid gap-3"
      >
        {FEATURES.map((f) => (
          <article
            key={f.title}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
          >
            <h2 className="text-base font-semibold">{f.title}</h2>
            <p className="mt-1.5 text-sm text-[var(--muted)]">{f.body}</p>
          </article>
        ))}
      </section>

      {/* Primary control lives low, within thumb reach (FR-1212). */}
      <div className="mt-auto pt-10">
        <a
          href="#features"
          className="tap-target flex w-full items-center justify-center rounded-full bg-[var(--accent)] px-6 py-4 text-base font-semibold text-[var(--accent-contrast)] transition-transform active:scale-[0.98]"
        >
          See what&apos;s inside
        </a>
        <p className="mt-4 text-center text-xs text-[var(--muted)]">
          Foundation build · sign-in and voice practice arrive next.
        </p>
      </div>
    </main>
  );
}
