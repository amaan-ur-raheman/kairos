import { useAuth } from "@clerk/tanstack-react-start";
import { buttonVariants } from "@kairos/ui/components/button";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Check, UsersRound } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kairos — Team availability, at a glance" },
      {
        name: "description",
        content:
          "A calmer way to coordinate work. See who is free, focused, or away and plan with your team in seconds.",
      },
      { property: "og:title", content: "Kairos — Team availability, at a glance" },
      {
        property: "og:description",
        content: "See who is free, focused, or away before you have to ask.",
      },
      { property: "og:url", content: "https://kairos.noctura.dpdns.org/" },
    ],
    links: [{ rel: "canonical", href: "https://kairos.noctura.dpdns.org/" }],
  }),
  component: LandingPage,
});

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Kairos",
      logo: "https://kairos.noctura.dpdns.org/kairos-logo.png",
    },
    {
      "@type": "WebApplication",
      name: "Kairos",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: "A calmer way for teams to coordinate availability, focus time, and leave.",
    },
  ],
};

function LandingPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && isSignedIn) navigate({ to: "/calendar", replace: true });
  }, [isLoaded, isSignedIn, navigate]);

  return (
    <main className="min-h-svh overflow-hidden bg-[var(--paper)] text-[var(--ink)]">
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <Link to="/" className="flex items-center gap-2.5 font-serif-display text-xl font-semibold">
          <img src="/kairos-logo.png" alt="" aria-hidden="true" className="size-8 object-contain" />
          kairos
        </Link>
        <nav className="flex items-center gap-2.5" aria-label="Main navigation">
          <Link to="/sign-in" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Sign in
          </Link>
          <Link to="/sign-up" className={buttonVariants({ size: "sm" })}>
            Get started <ArrowRight aria-hidden="true" />
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-14 sm:px-8 sm:pb-28 sm:pt-24 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-10">
        <div className="max-w-2xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ember)]">
            Team coordination, made visible
          </p>
          <h1 className="mt-4 max-w-[12ch] font-serif-display text-[clamp(3.25rem,8vw,6.5rem)] font-semibold leading-[0.94] tracking-[-0.055em]">
            Know the moment before you book it.
          </h1>
          <p className="mt-7 max-w-[48ch] text-base leading-7 text-[var(--ink-muted)] sm:text-lg">
            Kairos gives your team one quiet place to share availability, focus time, and leave — so
            coordination feels thoughtful instead of interruptive.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/sign-up"
              className={buttonVariants({
                size: "lg",
                className: "bg-[var(--ember)] text-white hover:bg-[var(--ember-deep)]",
              })}
            >
              Start with your team <ArrowRight aria-hidden="true" />
            </Link>
            <Link to="/sign-in" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Sign in
            </Link>
          </div>
        </div>

        <div className="relative min-h-[360px] rounded-[2rem] border border-[var(--color-border)] bg-[var(--card)] p-5 shadow-[var(--shadow-lg)] sm:min-h-[440px] sm:p-7">
          <div
            className="absolute -right-10 -top-10 size-36 rounded-full bg-[var(--ember-soft)] blur-2xl"
            aria-hidden="true"
          />
          <div className="relative flex items-center justify-between border-b border-[var(--color-border)] pb-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                Today
              </p>
              <h2 className="mt-1 font-serif-display text-2xl font-semibold">Who&apos;s around?</h2>
            </div>
            <CalendarDays className="size-5 text-[var(--ember)]" aria-hidden="true" />
          </div>
          <div className="relative mt-5 space-y-3">
            {[
              ["Maya Chen", "Deep work until 2 PM", "var(--status-focus-time)"],
              ["Noah Williams", "Available now", "var(--status-available)"],
              ["Riley Smith", "Away until tomorrow", "var(--status-offline)"],
            ].map(([name, detail, color]) => (
              <div
                key={name}
                className="flex items-center gap-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--paper)] px-3.5 py-3"
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: color }}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <b className="block truncate text-sm">{name}</b>
                  <span className="block truncate text-xs text-[var(--ink-muted)]">{detail}</span>
                </span>
                <Check
                  className="ml-auto size-4 shrink-0 text-[var(--status-available)]"
                  aria-hidden="true"
                />
              </div>
            ))}
          </div>
          <p className="relative mt-6 border-t border-[var(--color-border)] pt-4 font-serif-display text-sm italic text-[var(--ink-muted)]">
            Less guessing. More considerate work.
          </p>
        </div>
      </section>

      <section
        className="border-y border-[var(--color-border)] bg-[var(--paper-deep)]"
        aria-labelledby="why-kairos"
      >
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-3 lg:px-10">
          <div className="lg:col-span-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ember)]">
              Built for the in-between
            </p>
            <h2
              id="why-kairos"
              className="mt-3 max-w-[20ch] font-serif-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl"
            >
              The context your calendar leaves out.
            </h2>
          </div>
          {[
            [
              UsersRound,
              "Team presence",
              "See availability and status in one shared view, without another message to send.",
            ],
            [
              CalendarDays,
              "Calmer planning",
              "Plan around focus time, working hours, and leave before a meeting becomes an interruption.",
            ],
            [
              Check,
              "Clear boundaries",
              "Share what teammates need to know while keeping the details of your day yours.",
            ],
          ].map(([Icon, title, description]) => (
            <article
              key={title as string}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--card)] p-6"
            >
              <Icon className="size-5 text-[var(--ember)]" aria-hidden="true" />
              <h3 className="mt-5 font-serif-display text-xl font-semibold">{title as string}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                {description as string}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-16 sm:px-8 sm:py-20 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <div>
          <h2 className="font-serif-display text-3xl font-semibold tracking-[-0.03em]">
            Make time easier to read.
          </h2>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            Start with a clearer view of your team&apos;s day.
          </p>
        </div>
        <Link
          to="/sign-up"
          className={buttonVariants({
            size: "lg",
            className: "bg-[var(--ember)] text-white hover:bg-[var(--ember-deep)]",
          })}
        >
          Create your workspace <ArrowRight aria-hidden="true" />
        </Link>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap gap-x-5 gap-y-2 border-t border-[var(--color-border)] px-5 py-6 text-xs text-[var(--ink-muted)] sm:px-8 lg:px-10">
        <span>© {new Date().getFullYear()} Kairos</span>
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
