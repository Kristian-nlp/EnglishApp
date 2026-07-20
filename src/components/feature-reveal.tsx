"use client";

import { useId, useState, type ReactNode } from "react";

/**
 * Progressive-disclosure control for the landing page. The button reveals the
 * feature panel on click, so "See what's inside" actually shows something.
 * Accessible: the button exposes `aria-expanded` and points at the panel via
 * `aria-controls`; the panel is always in the DOM and toggled with `hidden`
 * (removes it from layout and the a11y tree) so the relationship always
 * resolves. Keyboard operable by default (it is a real <button>).
 */
export function FeatureReveal({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <section className="mt-8" aria-label="What's inside">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="tap-target flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-4 text-base font-semibold text-[var(--accent-contrast)] transition-transform active:scale-[0.98]"
      >
        {open ? "Hide details" : "See what's inside"}
        <span
          aria-hidden="true"
          className={`inline-block transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      <div id={panelId} hidden={!open} className="mt-4 grid gap-3">
        {children}
      </div>
    </section>
  );
}
