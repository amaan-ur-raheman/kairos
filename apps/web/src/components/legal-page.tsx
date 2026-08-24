import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

type LegalPageProps = { title: string; updated: string; children: ReactNode };

export function LegalPage({ title, updated, children }: LegalPageProps) {
  return (
    <main className="min-h-svh bg-[var(--paper)] text-[var(--ink)]">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-5 py-6 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5 font-serif-display text-xl font-semibold">
          <img src="/kairos-logo.png" alt="" aria-hidden="true" className="size-8 object-contain" />
          kairos
        </Link>
        <Link
          to="/sign-in"
          className="text-sm text-[var(--ink-muted)] underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </header>
      <article className="mx-auto max-w-3xl px-5 pb-20 pt-12 sm:px-8 sm:pt-20">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ember)]">
          Kairos
        </p>
        <h1 className="mt-3 font-serif-display text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
          {title}
        </h1>
        <p className="mt-3 text-sm text-[var(--ink-muted)]">Last updated {updated}</p>
        <div className="mt-12 space-y-8 text-sm leading-7 text-[var(--ink-body)]">{children}</div>
      </article>
      <footer className="mx-auto flex max-w-3xl gap-5 border-t border-[var(--color-border)] px-5 py-6 text-xs text-[var(--ink-muted)] sm:px-8">
        <Link to="/privacy" className="underline-offset-4 hover:underline">
          Privacy
        </Link>
        <Link to="/terms" className="underline-offset-4 hover:underline">
          Terms
        </Link>
        <a
          href="mailto:shadowmonarch15125@gmail.com"
          className="underline-offset-4 hover:underline"
        >
          Contact
        </a>
      </footer>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-serif-display text-2xl font-semibold text-[var(--ink)]">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
