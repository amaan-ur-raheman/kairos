import { expandOccurrences, type Recurrence, recurrenceLabel } from "@kairos/api/lib/recurrence";
import { Button } from "@kairos/ui/components/button";
import { Tabs, TabsList, TabsTrigger } from "@kairos/ui/components/tabs";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { type ScheduleOccurrence, ScheduleView } from "@/components/calendar/schedule-view";
import { ErrorStrip, Skeleton } from "@/components/states";
import { weekStartOf } from "@/utils/dates";
import { orpc } from "@/utils/orpc";
import { STATUS_META } from "@/utils/status";

export const Route = createFileRoute("/team/$id")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow, noarchive" }] }),
  component: MemberPage,
});

/* ── constants (mirrors calendar.tsx) ── */
const START_HOUR = 7;
const END_HOUR = 21;
const HOUR_H = 72;
const teamPageClass =
  "mx-auto w-full max-w-[920px] px-4 pb-[60px] pt-6 sm:px-[30px] sm:pb-[70px] sm:pt-[34px]";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const VIEW_ORDER = ["day", "week", "month", "schedule"] as const;
type View = (typeof VIEW_ORDER)[number];

const EVENT_TINTS: Record<string, string> = {
  "#c93c37": "var(--tint-busy)",
  "#f4511e": "var(--tint-meeting)",
  "#b98212": "var(--tint-meeting)",
  "#3f9142": "var(--tint-available)",
  "#3b6fb5": "var(--tint-focus)",
  "#2b2620": "var(--tint-focus)",
  "#7d55b5": "var(--tint-traveling)",
  "#e67c73": "var(--tint-busy)",
  "#3f51b5": "var(--tint-focus)",
};
const tintFor = (c: string) => EVENT_TINTS[c] ?? "var(--tint-focus)";

/* ── date helpers ── */
const fmt12 = (h: number, m = 0) => {
  const hh = h % 12 || 12;
  return m === 0
    ? `${hh} ${h < 12 ? "AM" : "PM"}`
    : `${hh}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
const shift = (d: Date, days: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
function fmtRange(a: Date, b: Date) {
  const o = { month: "short", day: "numeric" } as const;
  return a.getMonth() === b.getMonth()
    ? `${a.toLocaleDateString("en-US", o)}-${b.getDate()}, ${b.getFullYear()}`
    : `${a.toLocaleDateString("en-US", o)} - ${b.toLocaleDateString("en-US", o)}, ${b.getFullYear()}`;
}

type SavedEvent = {
  id: string;
  title: string;
  startTime: string | Date;
  endTime: string | Date;
  color: string;
  recurrence: string;
  recurrenceDays: number[] | null;
  recurrenceInterval: number | null;
  recurrenceUntil: string | Date | null;
};
type EventDefAlias = Parameters<typeof expandOccurrences>[0];

function MemberPage() {
  const { id } = Route.useParams();
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [popover, setPopover] = useState<{
    occ: { start: Date; end: Date; ev: SavedEvent };
    x: number;
    y: number;
  } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const member = useQuery(orpc.members.getById.queryOptions({ input: { id } }));
  const workingHours = useQuery(
    orpc.availability.getWorkingHours.queryOptions({ input: { memberId: id }, enabled: !!id }),
  );
  const statuses = useQuery(orpc.availability.getForOrg.queryOptions());
  const memberEvents = useQuery(
    orpc.events.listForMember.queryOptions({ input: { memberId: id }, enabled: !!id }),
  );

  const m = member.data;
  const myStatus = useMemo(
    () => statuses.data?.find((s) => s.memberId === id) ?? null,
    [statuses.data, id],
  );

  const weekStart = useMemo(() => weekStartOf(anchor), [anchor]);
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => shift(weekStart, i)),
    [weekStart],
  );
  const [today] = useState(() => new Date());
  const todayIdx = weekDates.findIndex((d) => sameDay(d, today));
  const isCurrentWeek = todayIdx >= 0;
  const nowTop = useMemo(() => {
    const dec = today.getHours() + today.getMinutes() / 60;
    return (dec - START_HOUR) * HOUR_H;
  }, [today]);

  /* ── visible range per view ── */
  const range = useMemo(() => {
    if (view === "day") {
      const dayStart = new Date(anchor);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(anchor);
      dayEnd.setHours(23, 59, 59, 999);
      return {
        start: dayStart,
        end: dayEnd,
        label: anchor.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        }),
      };
    }
    if (view === "week")
      return {
        start: weekDates[0],
        end: weekDates[6],
        label: fmtRange(weekDates[0], weekDates[6]),
      };
    if (view === "month") {
      const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
      return {
        start: weekStartOf(first),
        end: shift(weekStartOf(last), 6),
        label: anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      };
    }
    const t = new Date();
    const end = shift(t, 60);
    return { start: t, end, label: "Next 60 days" };
  }, [view, anchor, weekDates]);

  const navigate = (dir: -1 | 1) => {
    const step =
      view === "day" ? dir : view === "week" ? dir * 7 : view === "month" ? dir * 30 : dir * 7;
    setAnchor((a) => shift(a, step));
  };
  const goToday = () => setAnchor(new Date());

  /* ── expand events into occurrences ── */
  const occurrences = useMemo(() => {
    const out: { ev: SavedEvent; start: Date; end: Date }[] = [];
    for (const ev of memberEvents.data ?? []) {
      for (const occ of expandOccurrences(
        {
          startTime: String(ev.startTime),
          endTime: String(ev.endTime),
          recurrence: (ev.recurrence ?? "none") as Recurrence,
          recurrenceDays: (ev.recurrenceDays ?? []) as number[],
          recurrenceInterval: (ev.recurrenceInterval ?? 1) as number,
          recurrenceUntil: ev.recurrenceUntil ? String(ev.recurrenceUntil) : null,
        } as EventDefAlias,
        range.start,
        range.end,
      )) {
        out.push({ ev, start: occ.start, end: occ.end });
      }
    }
    return out.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [memberEvents.data, range.start, range.end]);

  /* ── scroll to now on week view ── */
  useEffect(() => {
    if ((view !== "week" && view !== "day") || !isCurrentWeek || !gridRef.current) return;
    const el = gridRef.current;
    const doScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      const target = Math.min(Math.max(0, nowTop - 80), Math.max(0, max));
      el.scrollTo({ top: target, behavior: "smooth" });
    };
    const t = setTimeout(doScroll, 120);
    return () => clearTimeout(t);
  }, [view, isCurrentWeek, nowTop]);

  /* ── keyboard shortcuts ── */
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyboard shortcuts use stable callbacks
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && popover) {
        setPopover(null);
        return;
      }
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "d") setView("day");
      else if (k === "w") setView("week");
      else if (k === "m") setView("month");
      else if (k === "s") setView("schedule");
      else if (k === "t") goToday();
      else if (e.key === "ArrowLeft") navigate(-1);
      else if (e.key === "ArrowRight") navigate(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [popover]);

  useEffect(() => {
    setPopover(null);
  }, []);

  const isLoading = member.isLoading || memberEvents.isLoading;
  const pageError = member.error || memberEvents.error;

  if (isLoading) {
    return (
      <div className={teamPageClass}>
        <Skeleton className="h-4 w-24 mb-4" />
        <div className="flex gap-5 mt-5">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="space-y-3 flex-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div
          className="mt-6 h-[520px] rounded-lg border"
          style={{ borderColor: "var(--color-border)", background: "var(--card)" }}
        />
      </div>
    );
  }

  if (!m) {
    return (
      <div className={`${teamPageClass} text-center`}>
        <h1 className="font-serif-display text-2xl font-semibold">Member not found</h1>
        <Link
          to="/team"
          className="inline-block mt-3 text-sm font-semibold hover:underline"
          style={{ color: "var(--ember)" }}
        >
          ← Back to team
        </Link>
      </div>
    );
  }

  const initials = m.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const statusColor = myStatus
    ? (STATUS_META[myStatus.status as keyof typeof STATUS_META]?.color ?? "var(--status-offline)")
    : "var(--status-offline)";
  const whByDow = new Map((workingHours.data ?? []).map((h) => [h.dayOfWeek, h]));

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden">
      {/* ══ Left rail ══ */}
      <aside
        aria-label="Member info"
        className="hidden lg:flex flex-col w-[296px] shrink-0 border-r overflow-y-auto px-6 py-7"
        style={{ background: "var(--card)", borderColor: "var(--color-border)" }}
      >
        <Link
          to="/team"
          className="text-[13px] font-medium hover:underline inline-flex items-center gap-1.5 mb-6"
          style={{ color: "var(--ember)" }}
        >
          ← Back to team
        </Link>

        {/* Avatar + name */}
        <div
          className="relative w-16 h-16 rounded-full grid place-items-center text-white text-[22px] font-semibold shrink-0 mx-auto"
          style={{ background: "var(--ember)", fontFamily: "var(--font-serif)" }}
        >
          {initials}
          <i
            className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-[3px] border-white block"
            style={{ background: statusColor }}
            aria-hidden
          />
        </div>
        <h2 className="font-serif-display font-semibold text-[20px] leading-snug tracking-[-0.01em] text-center mt-3">
          {m.name}
        </h2>
        <p className="text-[12.5px] text-center mt-1" style={{ color: "var(--ink-muted)" }}>
          {m.jobRole ?? "Team member"}
        </p>

        {/* Status */}
        {myStatus && (
          <section className="mt-6">
            <h3 className="mb-[11px] border-b border-[var(--color-border)] pb-[7px] font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
              Status
            </h3>
            <div
              className="border p-3.5"
              style={{
                borderColor: "var(--color-border)",
                borderRadius: "var(--r-md, 12px)",
                background: "var(--paper)",
              }}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    background: STATUS_META[myStatus.status as keyof typeof STATUS_META]?.color,
                  }}
                />
                <span className="text-[13.5px] font-semibold">
                  {STATUS_META[myStatus.status as keyof typeof STATUS_META]?.label}
                </span>
              </div>
              {myStatus.note && (
                <p
                  className="font-serif-display italic text-[12.5px] mt-1.5"
                  style={{ color: "var(--ink-secondary)" }}
                >
                  "{myStatus.note}"
                </p>
              )}
            </div>
          </section>
        )}

        {/* Week summary */}
        <section className="mt-6">
          <h3 className="mb-[11px] border-b border-[var(--color-border)] pb-[7px] font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
            This week
          </h3>
          <div className="space-y-0.5">
            {occurrences
              .filter((o) => {
                const s = weekDates[0];
                const e = weekDates[6];
                return o.start >= s && o.start <= e;
              })
              .slice(0, 5)
              .map((o, i) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: static/derived list, never reordered
                  key={i}
                  className="flex gap-3 py-2 border-b last:border-b-0"
                  style={{ borderColor: "var(--color-border-subtle)" }}
                >
                  <span
                    className="w-[3px] rounded-sm shrink-0"
                    style={{ background: o.ev.color }}
                  />
                  <span
                    className="font-mono text-[10px] pt-0.5 shrink-0 w-[52px]"
                    style={{ color: "var(--ink-muted)" }}
                  >
                    {o.start.toLocaleDateString("en-US", { weekday: "short" })}{" "}
                    {fmt12(o.start.getHours(), o.start.getMinutes())}
                  </span>
                  <span className="min-w-0">
                    <b className="block text-[12px] font-semibold truncate">{o.ev.title}</b>
                  </span>
                </div>
              ))}
            {occurrences.filter((o) => {
              const s = weekDates[0];
              const e = weekDates[6];
              return o.start >= s && o.start <= e;
            }).length === 0 && (
              <p className="text-[12.5px] py-2" style={{ color: "var(--ink-muted)" }}>
                No events this week.
              </p>
            )}
          </div>
        </section>

        {/* Contact */}
        <section className="mt-6 pb-4 space-y-2">
          <h3 className="mb-[11px] border-b border-[var(--color-border)] pb-[7px] font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
            Contact
          </h3>
          <a
            href={`mailto:${m.email}`}
            className="block text-[12.5px] font-semibold hover:underline"
            style={{ color: "var(--ember)" }}
          >
            {m.email}
          </a>
          {m.timezone && (
            <p
              className="text-[12px]"
              style={{ color: "var(--ink-muted)" }}
              suppressHydrationWarning
            >
              {new Intl.DateTimeFormat("en-US", {
                hour: "numeric",
                minute: "2-digit",
                timeZone: m.timezone,
              }).format(new Date())}{" "}
              local · {m.timezone}
            </p>
          )}
        </section>
      </aside>

      {/* ══ Main pane ══ */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Mobile back link */}
        <div className="lg:hidden px-6 pt-5">
          <Link
            to="/team"
            className="text-[13px] font-medium hover:underline inline-flex items-center gap-1.5"
            style={{ color: "var(--ember)" }}
          >
            ← Back to team
          </Link>
        </div>

        {/* Mobile hero */}
        <div className="lg:hidden flex items-center gap-4 px-6 pt-4 pb-2">
          <span
            className="relative w-12 h-12 rounded-full grid place-items-center text-white text-[17px] font-semibold shrink-0"
            style={{ background: "var(--ember)", fontFamily: "var(--font-serif)" }}
          >
            {initials}
            <i
              className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white block"
              style={{ background: statusColor }}
            />
          </span>
          <div>
            <h1 className="font-serif-display font-semibold text-[20px] leading-tight">{m.name}</h1>
            <p className="text-[12px]" style={{ color: "var(--ink-muted)" }}>
              {m.jobRole ?? "Team member"}
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-6 lg:px-7 pt-5 pb-4 shrink-0 flex-wrap">
          <h1 className="hidden lg:block font-serif-display text-[23px] font-semibold m-0">
            {m.name}
          </h1>
          <span className="font-mono text-[11px]" style={{ color: "var(--ink-muted)" }}>
            {range.label}
          </span>
          <Tabs value={view} onValueChange={(value) => setView(value as View)} className="ml-auto">
            <TabsList
              className="flex rounded-lg bg-[var(--paper-deep)] p-[3px]"
              aria-label="Calendar view"
            >
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
            </TabsList>
          </Tabs>
          {view !== "schedule" && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Previous"
                onClick={() => navigate(-1)}
                className="h-10 w-10 rounded-lg border border-[var(--color-border-strong)] bg-[var(--card)] text-base text-[var(--ink-secondary)] hover:bg-[var(--paper-deep)]"
              >
                ‹
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={goToday}
                className="rounded-lg border-[var(--color-border-strong)] px-[18px] py-[11px] text-[12.5px] text-[var(--ink-secondary)] hover:bg-[var(--paper-deep)]"
              >
                Today
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Next"
                onClick={() => navigate(1)}
                className="h-10 w-10 rounded-lg border border-[var(--color-border-strong)] bg-[var(--card)] text-base text-[var(--ink-secondary)] hover:bg-[var(--paper-deep)]"
              >
                ›
              </Button>
            </div>
          )}
        </div>

        <div className="px-6 lg:px-7">
          <div className="px-0 pb-2 text-[11px] text-[var(--ink-muted)] [&_b]:font-mono [&_b]:font-medium [&_b]:text-[var(--ink-secondary)]">
            Shortcuts: <b>D</b>ay · <b>W</b>eek · <b>M</b>onth · <b>S</b>chedule · <b>T</b>oday ·{" "}
            <b>←</b>/<b>→</b> navigate · View only
          </div>
        </div>

        {pageError && !isLoading && (
          <div className="px-6 lg:px-7 pt-4">
            <ErrorStrip
              message="Couldn't load this member's calendar."
              onRetry={() =>
                [member, memberEvents, workingHours].forEach((q) => {
                  q.refetch();
                })
              }
            />
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto overscroll-contain px-6 pb-6 lg:px-7">
          {/* ═══ DAY / WEEK ═══ */}
          {(view === "day" || view === "week") &&
            (() => {
              const days = view === "day" ? [range.start] : weekDates;
              const cols = days.length;
              return (
                <div ref={gridRef} style={{ minWidth: cols === 1 ? 0 : 960 }}>
                  <div
                    className="grid pb-2.5 sticky top-0 z-10 bg-[var(--paper)]"
                    style={{ gridTemplateColumns: `48px repeat(${cols}, 1fr)` }}
                  >
                    <span />
                    {days.map((d, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: static/derived list, never reordered
                      <div key={i} className="text-center">
                        <div
                          className="font-serif-display italic text-[12.5px]"
                          style={{ color: sameDay(d, today) ? "var(--ember)" : "var(--ink-muted)" }}
                        >
                          {DAY_FULL[d.getDay()].slice(0, 3)}
                        </div>
                        <div
                          className="font-mono text-[13px] w-7 h-7 leading-7 mx-auto mt-1 rounded-full"
                          style={
                            sameDay(d, today)
                              ? { background: "var(--ember)", color: "#fff" }
                              : { color: "var(--ink-secondary)" }
                          }
                        >
                          {d.getDate()}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    className="grid relative border-t"
                    style={{
                      gridTemplateColumns: `48px repeat(${cols}, 1fr)`,
                      borderColor: "var(--color-border)",
                    }}
                  >
                    {/* time gutter */}
                    <div className="relative">
                      {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i).map(
                        (h) => (
                          <span
                            key={h}
                            className={`absolute right-2.5 font-mono text-[9.5px] ${h === START_HOUR ? "" : "-translate-y-1/2"}`}
                            style={{
                              top: Math.max(12, (h - START_HOUR) * HOUR_H),
                              color: "var(--ink-muted)",
                            }}
                          >
                            {fmt12(h)}
                          </span>
                        ),
                      )}
                    </div>

                    {days.map((day, c) => {
                      const isToday = sameDay(day, today);
                      const weekend = day.getDay() === 0 || day.getDay() === 6;
                      const wh = whByDow.get(day.getDay());
                      const dayOccs = occurrences
                        .filter((o) => sameDay(o.start, day))
                        .map((o) => {
                          const s = o.start.getHours() + o.start.getMinutes() / 60;
                          const e = o.end.getHours() + o.end.getMinutes() / 60;
                          return { ...o, s, e: Math.max(e, s + 0.25) };
                        })
                        .sort((a, b) => a.s - b.s);

                      return (
                        <div
                          // biome-ignore lint/suspicious/noArrayIndexKey: static/derived list, never reordered
                          key={c}
                          className="relative border-l"
                          style={{
                            borderColor: "var(--color-border)",
                            minHeight: (END_HOUR - START_HOUR) * HOUR_H,
                            background: isToday
                              ? "linear-gradient(180deg, var(--ember-soft), transparent 26%)"
                              : weekend
                                ? "var(--paper-deep)"
                                : undefined,
                          }}
                        >
                          {Array.from(
                            { length: END_HOUR - START_HOUR },
                            (_, i) => START_HOUR + i,
                          ).map((h) => (
                            <div
                              key={h}
                              className="border-b"
                              style={{ height: HOUR_H, borderColor: "#efeae0" }}
                            />
                          ))}

                          {/* now line */}
                          {isToday && isCurrentWeek && (
                            <div
                              className="absolute left-0 right-0 z-20 pointer-events-none"
                              style={{ top: nowTop }}
                            >
                              <span
                                className="absolute -left-1 -top-1 w-2 h-2 rounded-full"
                                style={{ background: "var(--ember)" }}
                              />
                              <span
                                className="absolute left-1.5 right-0 top-[-0.5px] h-[1.5px]"
                                style={{ background: "var(--ember)" }}
                              />
                            </div>
                          )}

                          {/* working hours block */}
                          {wh?.isWorkingDay &&
                            (() => {
                              const [sh, sm] = wh.startTime.split(":").map(Number);
                              const [eh, em] = wh.endTime.split(":").map(Number);
                              const sDec = sh + sm / 60;
                              const eDec = eh + em / 60;
                              const top = Math.max(0, (sDec - START_HOUR) * HOUR_H);
                              const height = Math.max(24, (eDec - sDec) * HOUR_H - 7);
                              return (
                                <div
                                  className="absolute left-1 right-1.5 rounded-lg px-2 py-1.5 text-xs border pointer-events-none overflow-hidden"
                                  style={{
                                    top: top + 3,
                                    height,
                                    background: "var(--tint-work)",
                                    borderColor: "var(--color-border)",
                                  }}
                                  title={`Working hours ${wh.startTime}–${wh.endTime}`}
                                >
                                  <b className="block font-semibold truncate">
                                    <i
                                      className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-[1px]"
                                      style={{ background: "var(--st-available)" }}
                                    />
                                    Working hours
                                  </b>
                                  <span
                                    className="block font-mono text-[9px] mt-px"
                                    style={{ color: "var(--ink-muted)" }}
                                  >
                                    {wh.startTime}–{wh.endTime}
                                  </span>
                                </div>
                              );
                            })()}

                          {/* events */}
                          {dayOccs.map((o, i) => (
                            <Button
                              type="button"
                              variant="ghost"
                              // biome-ignore lint/suspicious/noArrayIndexKey: static/derived list, never reordered
                              key={o.ev.id + String(o.start.getTime()) + i}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPopover({
                                  occ: { start: o.start, end: o.end, ev: o.ev },
                                  x: e.clientX,
                                  y: e.clientY,
                                });
                              }}
                              className="absolute left-1 right-1.5 flex h-auto min-h-0 flex-col items-start justify-start gap-0 overflow-hidden rounded-lg border px-2.5 py-1.5 text-left text-xs whitespace-normal hover:brightness-95"
                              style={{
                                top: Math.max(0, (o.s - START_HOUR) * HOUR_H) + 3,
                                height: Math.max(24, (o.e - o.s) * HOUR_H - 7),
                                background: tintFor(o.ev.color),
                                borderColor: "var(--color-border)",
                              }}
                            >
                              <b className="block w-full truncate font-semibold">
                                <i
                                  className="inline-block w-[7px] h-[7px] rounded-full mr-1.5 align-[1px]"
                                  style={{ background: o.ev.color }}
                                />
                                {o.ev.title}
                              </b>
                              <span
                                className="mt-px block w-full truncate font-mono text-[9.5px]"
                                style={{ color: "var(--ink-muted)" }}
                              >
                                {fmt12(o.start.getHours(), o.start.getMinutes())}–
                                {fmt12(o.end.getHours(), o.end.getMinutes())}
                              </span>
                            </Button>
                          ))}
                        </div>
                      );
                    })}
                  </div>

                  {/* event detail popover (read-only) */}
                  {popover && (
                    // biome-ignore lint/a11y/noStaticElementInteractions: click-away backdrop overlay
                    // biome-ignore lint/a11y/useKeyWithClickEvents: click-away backdrop overlay
                    <div
                      className="fixed inset-0 z-40"
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest("[data-popover-panel]")) return;
                        setPopover(null);
                      }}
                    >
                      <div
                        data-popover-panel
                        role="dialog"
                        aria-label={`Details for ${popover.occ.ev.title}`}
                        className="fixed rounded-lg border shadow-lg p-4 w-64"
                        style={{
                          background: "var(--card)",
                          borderColor: "var(--color-border)",
                          left: Math.min(popover.x, window.innerWidth - 280),
                          top: Math.min(popover.y + 8, window.innerHeight - 200),
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <i
                            className="inline-block w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                            style={{ background: popover.occ.ev.color }}
                          />
                          <div>
                            <b className="block font-serif-display text-[15px] font-semibold">
                              {popover.occ.ev.title}
                            </b>
                            <span
                              className="text-xs block mt-1"
                              style={{ color: "var(--ink-secondary)" }}
                            >
                              {popover.occ.start.toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}{" "}
                              ·{" "}
                              {fmt12(popover.occ.start.getHours(), popover.occ.start.getMinutes())}{" "}
                              – {fmt12(popover.occ.end.getHours(), popover.occ.end.getMinutes())}
                            </span>
                            {popover.occ.ev.recurrence !== "none" && (
                              <span
                                className="text-xs block mt-1"
                                style={{ color: "var(--ink-muted)" }}
                              >
                                ↻ {recurrenceLabel(popover.occ.ev)}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-4 w-full text-center text-xs font-medium py-2 rounded-lg border"
                          style={{
                            borderColor: "var(--color-border-strong)",
                            color: "var(--ink-secondary)",
                          }}
                          onClick={() => setPopover(null)}
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

          {/* ═══ MONTH ═══ */}
          {view === "month" &&
            (() => {
              const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
              const gridStart = weekStartOf(first);
              const cells = Array.from({ length: 42 }, (_, i) => shift(gridStart, i));
              return (
                <div>
                  <div
                    className="grid border-b"
                    style={{
                      gridTemplateColumns: "repeat(7, 1fr)",
                      borderColor: "var(--color-border)",
                    }}
                  >
                    {DAYS.map((d) => (
                      <div
                        key={d}
                        className="text-center py-2 font-mono text-[9.5px] uppercase tracking-widest"
                        style={{ color: "var(--ink-muted)" }}
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                  <div className="grid" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
                    {cells.map((d, i) => {
                      const inMonth = d.getMonth() === anchor.getMonth();
                      const isToday = sameDay(d, today);
                      const occs = occurrences.filter((o) => sameDay(o.start, d));
                      return (
                        // biome-ignore lint/a11y/noStaticElementInteractions: pointer-driven calendar grid
                        // biome-ignore lint/a11y/useKeyWithClickEvents: pointer-driven calendar grid
                        <div
                          // biome-ignore lint/suspicious/noArrayIndexKey: static/derived list, never reordered
                          key={i}
                          onClick={() => {
                            setAnchor(d);
                            setView("day");
                          }}
                          className="border-b border-r p-1.5 min-h-[96px] cursor-pointer hover:bg-[var(--paper-deep)]"
                          style={{
                            borderColor: "var(--color-border)",
                            background: isToday
                              ? "var(--ember-soft)"
                              : !inMonth
                                ? "var(--paper-deep)"
                                : undefined,
                          }}
                        >
                          <div
                            className={`font-mono text-[11px] w-5 h-5 leading-5 text-center rounded-full mb-1 ${isToday ? "text-white" : ""}`}
                            style={
                              isToday
                                ? { background: "var(--ember)" }
                                : { color: inMonth ? "var(--ink-secondary)" : "var(--ink-muted)" }
                            }
                          >
                            {d.getDate()}
                          </div>
                          {occs.slice(0, 3).map((o, j) => (
                            <div
                              // biome-ignore lint/suspicious/noArrayIndexKey: static/derived list, never reordered
                              key={j}
                              className="flex items-center gap-1 text-[10.5px] truncate mb-0.5"
                            >
                              <i
                                className="inline-block w-[6px] h-[6px] rounded-full shrink-0"
                                style={{ background: o.ev.color }}
                              />
                              <span className="truncate" style={{ color: "var(--ink-body)" }}>
                                {o.ev.title}
                              </span>
                            </div>
                          ))}
                          {occs.length > 3 && (
                            <div
                              className="text-[9.5px] font-medium"
                              style={{ color: "var(--ember)" }}
                            >
                              +{occs.length - 3} more
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

          {/* ═══ SCHEDULE ═══ */}
          {view === "schedule" && (
            <ScheduleView
              occurrences={occurrences as ScheduleOccurrence[]}
              emptyMessage={`No events for ${m.name.split(" ")[0]} in the next 60 days.`}
            />
          )}
        </div>

        <p className="px-6 lg:px-7 pb-4 text-xs" style={{ color: "var(--ink-muted)" }}>
          View only — contact {m.name.split(" ")[0]} to schedule.
        </p>
      </div>
    </div>
  );
}
