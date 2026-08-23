import { expandOccurrences, type Recurrence, recurrenceLabel } from "@kairos/api/lib/recurrence";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DAY_FULL,
  DAYS,
  END_HOUR,
  HOUR_H,
  START_HOUR,
  tintFor,
  type View,
} from "@/components/calendar/constants";
import {
  dayKey,
  fmt12,
  fmtRange,
  isoWeek,
  nowDecimal,
  parseHM,
  sameDay,
  shift,
} from "@/components/calendar/date-utils";
import { EventDialog } from "@/components/calendar/event-dialog";
import { ErrorStrip, Skeleton } from "@/components/states";
import { weekStartOf } from "@/utils/dates";
import { orpc } from "@/utils/orpc";
import { statusMeta } from "@/utils/status";

export const Route = createFileRoute("/calendar")({
  component: CalendarPage,
});

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

/* ═══════════════ component ═══════════════ */
function CalendarPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [dialog, setDialog] = useState<
    | null
    | { mode: "create"; date: Date; start: string; end: string }
    | { mode: "edit"; event: SavedEvent }
  >(null);
  // popover: x/y are raw viewport coords (clientX/Y) so we can use position:fixed
  const [popover, setPopover] = useState<{
    occ: { start: Date; end: Date; ev: SavedEvent };
    x: number;
    y: number;
  } | null>(null);
  // drag-to-create state
  const [drag, setDrag] = useState<{
    day: Date;
    startMin: number;
    endMin: number;
    col: number;
  } | null>(null);
  const dragRef = useRef<{ day: Date; startMin: number; colEl: HTMLElement } | null>(null);
  // mirrors drag state so window listeners can read it without stale closures
  const dragStateRef = useRef<{ startMin: number; endMin: number; day: Date } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const me = useQuery(orpc.members.me.queryOptions());
  const workingHours = useQuery(orpc.availability.getWorkingHours.queryOptions({ input: {} }));
  const statuses = useQuery(orpc.availability.getForOrg.queryOptions());
  const leaves = useQuery(orpc.leave.listForMember.queryOptions());
  const savedEvents = useQuery(orpc.events.list.queryOptions());

  const invalidate = () => queryClient.invalidateQueries({ queryKey: orpc.events.list.key() });
  const createEvent = useMutation(
    orpc.events.create.mutationOptions({
      onSuccess: () => {
        invalidate();
        setDialog(null);
      },
    }),
  );
  const updateEvent = useMutation(
    orpc.events.update.mutationOptions({
      onSuccess: () => {
        invalidate();
        setDialog(null);
        setPopover(null);
      },
    }),
  );
  const deleteEvent = useMutation(
    orpc.events.delete.mutationOptions({
      onSuccess: () => {
        invalidate();
        setPopover(null);
      },
    }),
  );

  const meId = me.data?.id ?? null;
  const myStatus = statuses.data?.find((s) => s.memberId === meId) ?? null;

  const weekStart = useMemo(() => weekStartOf(anchor), [anchor]);
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => shift(weekStart, i)),
    [weekStart],
  );
  const today = new Date();

  /* ── visible range per view ── */
  const range: { start: Date; end: Date; label: string } = useMemo(() => {
    if (view === "day")
      return {
        start: anchor,
        end: anchor,
        label: anchor.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        }),
      };
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

  /* ── expand all events into occurrences over the visible range ── */
  const occurrences = useMemo(() => {
    const out: { ev: SavedEvent; start: Date; end: Date }[] = [];
    for (const ev of savedEvents.data ?? []) {
      for (const occ of expandOccurrences(
        {
          startTime: String(ev.startTime),
          endTime: String(ev.endTime),
          recurrence: (ev.recurrence ?? "none") as Recurrence,
          recurrenceDays: (ev.recurrenceDays ?? []) as number[],
          recurrenceInterval: (ev.recurrenceInterval ?? 1) as number,
          recurrenceUntil: ev.recurrenceUntil ? String(ev.recurrenceUntil) : null,
        },
        range.start,
        range.end,
      )) {
        out.push({ ev, start: occ.start, end: occ.end });
      }
    }
    return out.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [savedEvents.data, range.start, range.end]);

  /* ── rail: next up today + team pulse ── */
  const nextUp = useMemo(() => {
    const items: { time: string; sort: number; label: string; sub: string; color: string }[] = [];
    const wh = (workingHours.data ?? []).find(
      (h) => h.dayOfWeek === today.getDay() && h.isWorkingDay,
    );
    if (wh)
      items.push({
        time: wh.startTime,
        sort: parseHM(wh.startTime),
        label: "Working hours",
        sub: `until ${wh.endTime}`,
        color: "var(--status-available)",
      });
    for (const o of occurrences) {
      if (!sameDay(o.start, today)) continue;
      items.push({
        time: fmt12(o.start.getHours(), o.start.getMinutes()),
        sort: o.start.getHours() + o.start.getMinutes() / 60,
        label: o.ev.title,
        sub: `until ${fmt12(o.end.getHours(), o.end.getMinutes())}`,
        color: o.ev.color,
      });
    }
    return items.sort((a, b) => a.sort - b.sort).slice(0, 4);
  }, [occurrences, workingHours.data, today]);

  const teamPulse = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of statuses.data ?? []) counts[s.status] = (counts[s.status] ?? 0) + 1;
    const labels: Record<string, string> = {
      available: "Available",
      in_meeting: "In meetings",
      focus_time: "Focused",
      traveling: "Traveling",
      busy: "Busy",
      offline: "Away / leave",
    };
    return ["available", "in_meeting", "focus_time", "traveling", "busy", "offline"].map((k) => ({
      k,
      label: labels[k],
      n: counts[k] ?? 0,
      color: statusMeta(k).color,
    }));
  }, [statuses.data]);

  /* ── approved leave spans (all-day strip) ── */
  const leaveSpans = useMemo(() => {
    const spans: { id: string; label: string; startCol: number; endCol: number; days: Date[] }[] =
      [];
    const days = view === "month" ? [] : view === "day" ? [range.start] : weekDates;
    for (const lr of leaves.data ?? []) {
      if (lr.status !== "approved") continue;
      const visible = days.filter((d) => dayKey(d) >= lr.startDate && dayKey(d) <= lr.endDate);
      if (visible.length === 0) continue;
      spans.push({
        id: lr.id,
        label: `Leave · ${lr.type.charAt(0).toUpperCase()}${lr.type.slice(1)}`,
        startCol: days.indexOf(visible[0]),
        endCol: days.indexOf(visible[visible.length - 1]),
        days: visible,
      });
    }
    return { spans, days };
  }, [leaves.data, weekDates, view, range.start]);

  /* ── keyboard shortcuts ── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
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
      else if (k === "c" && me.data)
        setDialog({ mode: "create", date: range.start, start: "09:00", end: "10:00" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const isLoading =
    me.isLoading || statuses.isLoading || workingHours.isLoading || savedEvents.isLoading;
  const pageError = me.error || statuses.error || workingHours.error || savedEvents.error;

  const viewBtn = (v: View, label: string) => (
    <button type="button" key={v} onClick={() => setView(v)} className={view === v ? "on" : ""}>
      {label}
    </button>
  );

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden">
      {/* ══ Today rail ══ */}
      <aside
        aria-label="Today"
        className="hidden lg:flex flex-col w-[296px] shrink-0 border-r overflow-y-auto px-6 py-7"
        style={{ background: "var(--card)", borderColor: "var(--color-border)" }}
      >
        <span className="font-serif-display italic text-[13px]" style={{ color: "var(--ember)" }}>
          {today.toLocaleDateString("en-US", { weekday: "long", month: "long" })}
        </span>
        <div className="font-serif-display font-semibold text-[44px] leading-none mt-0.5">
          {today.getDate()}
        </div>
        <p className="text-[12.5px] mt-1" style={{ color: "var(--ink-muted)" }}>
          Week {isoWeek(today)} ·{" "}
          {(statuses.data ?? []).filter((s) => s.status === "available").length} of{" "}
          {(statuses.data ?? []).length} teammates available
        </p>

        <section className="mt-6">
          <h2 className="rail-label">Your status</h2>
          <div
            className="border p-3.5"
            style={{
              borderColor: "var(--color-border)",
              borderRadius: "var(--r-md, 12px)",
              background: "var(--paper)",
            }}
          >
            {myStatus ? (
              <>
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: statusMeta(myStatus.status).color }}
                  />
                  <span className="text-[13.5px] font-semibold">
                    {statusMeta(myStatus.status).label}
                  </span>
                </div>
                {myStatus.note && (
                  <p
                    className="font-serif-display italic text-[12.5px] mt-1.5"
                    style={{ color: "var(--ink-secondary)" }}
                  >
                    “{myStatus.note}”
                  </p>
                )}
              </>
            ) : (
              <p className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
                No status set
              </p>
            )}
            <Link
              to="/settings"
              className="inline-block mt-3 text-xs font-medium hover:underline"
              style={{ color: "var(--ember)" }}
            >
              Change status →
            </Link>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="rail-label">Next up today</h2>
          {nextUp.length === 0 ? (
            <p className="text-[12.5px] py-2" style={{ color: "var(--ink-muted)" }}>
              Nothing scheduled today.
            </p>
          ) : (
            nextUp.map((n, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: static/derived list, never reordered
                key={i}
                className="flex gap-3 py-2 border-b last:border-b-0"
                style={{ borderColor: "var(--color-border-subtle)" }}
              >
                <span className="w-[3px] rounded-sm shrink-0" style={{ background: n.color }} />
                <span
                  className="font-mono text-[10px] pt-1 shrink-0"
                  style={{ color: "var(--ink-muted)", width: 52 }}
                >
                  {n.time}
                </span>
                <div className="min-w-0">
                  <b className="block text-[12.5px] font-semibold">{n.label}</b>
                  <span className="text-[11.5px]" style={{ color: "var(--ink-muted)" }}>
                    {n.sub}
                  </span>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="mt-6 pb-4">
          <h2 className="rail-label">Team pulse</h2>
          {teamPulse.map((p) => (
            <div key={p.k} className="flex justify-between items-center py-1.5 text-[12.5px]">
              <span className="flex items-center gap-2" style={{ color: "var(--ink-secondary)" }}>
                <i className="w-2 h-2 rounded-full not-italic" style={{ background: p.color }} />
                {p.label}
              </span>
              <b className="font-mono text-[11.5px] font-normal">{p.n}</b>
            </div>
          ))}
        </section>
      </aside>

      {/* ══ main pane ══ */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* toolbar */}
        <div className="flex items-center gap-3 px-6 lg:px-7 pt-6 pb-4 shrink-0 flex-wrap">
          <h1 className="font-serif-display text-[23px] font-semibold m-0">
            {view === "month"
              ? anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" })
              : "Calendar"}
          </h1>
          <span className="font-mono text-[11px]" style={{ color: "var(--ink-muted)" }}>
            {range.label}
          </span>
          <div className="seg-views ml-auto">
            {viewBtn("day", "Day")}
            {viewBtn("week", "Week")}
            {viewBtn("month", "Month")}
            {viewBtn("schedule", "Schedule")}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous"
              onClick={() => navigate(-1)}
              className="wk-btn"
            >
              ‹
            </button>
            <button type="button" onClick={goToday} className="wk-today">
              Today
            </button>
            <button type="button" aria-label="Next" onClick={() => navigate(1)} className="wk-btn">
              ›
            </button>
          </div>
          <button
            type="button"
            onClick={() =>
              setDialog({
                mode: "create",
                date: view === "day" ? range.start : weekDates[0],
                start: "09:00",
                end: "10:00",
              })
            }
            className="btn-ember press-scale"
          >
            ＋ New event
          </button>
        </div>

        <div className="px-6 lg:px-7">
          <div className="kbd-hints">
            Shortcuts: <b>D</b>ay · <b>W</b>eek · <b>M</b>onth · <b>S</b>chedule · <b>T</b>oday ·{" "}
            <b>←</b>/<b>→</b> navigate · <b>C</b> create
          </div>
        </div>

        {pageError && !isLoading && (
          <div className="px-6 lg:px-7 pt-4">
            <ErrorStrip
              message="Couldn't load your calendar."
              onRetry={() =>
                [me, statuses, workingHours, savedEvents].forEach((q) => {
                  q.refetch();
                })
              }
            />
          </div>
        )}

        {isLoading ? (
          <div className="flex-1 px-6 lg:px-7 pb-8 space-y-4">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-[460px] w-full rounded-xl" />
          </div>
        ) : !me.data ? (
          <div
            className="flex-1 grid place-items-center text-sm"
            style={{ color: "var(--ink-muted)" }}
          >
            Make sure you're a member of an organization.
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-auto px-6 lg:px-7 pb-6">
            {/* ═══ DAY / WEEK ═══ */}
            {(view === "day" || view === "week") &&
              (() => {
                const days = view === "day" ? [range.start] : weekDates;
                const cols = days.length;
                return (
                  <div ref={gridRef} style={{ minWidth: cols === 1 ? 0 : 720 }}>
                    {/* all-day strip (leave) */}
                    {leaveSpans.spans.length > 0 && days.length > 1 && (
                      <div className="mb-2">
                        <div
                          className="grid"
                          style={{ gridTemplateColumns: `48px repeat(${cols}, 1fr)` }}
                        >
                          <span
                            className="font-mono text-[9px] pt-1"
                            style={{ color: "var(--ink-muted)" }}
                          >
                            all day
                          </span>
                          {days.map((_, i) => (
                            // biome-ignore lint/suspicious/noArrayIndexKey: static/derived list, never reordered
                            <div key={i} />
                          ))}
                        </div>
                        <div
                          className="grid relative"
                          style={{ gridTemplateColumns: `48px repeat(${cols}, 1fr)` }}
                        >
                          <span />
                          {days.map((_, i) => (
                            <div
                              // biome-ignore lint/suspicious/noArrayIndexKey: static/derived list, never reordered
                              key={i}
                              className="border-l h-6"
                              style={{ borderColor: "var(--color-border)" }}
                            />
                          ))}
                          {leaveSpans.spans.map((sp) => (
                            <div
                              key={sp.id}
                              className="absolute rounded-md border px-2 flex items-center text-[11px] font-medium z-10"
                              style={{
                                left: `calc(48px + ${(sp.startCol / cols) * 100}% + 4px)`,
                                width: `calc(${((sp.endCol - sp.startCol + 1) / cols) * 100}% - 8px)`,
                                top: 4,
                                height: 22,
                                background: "var(--tint-busy)",
                                borderColor: "var(--color-border)",
                                color: "var(--ink)",
                              }}
                            >
                              <i
                                className="inline-block w-[6px] h-[6px] rounded-full mr-1.5"
                                style={{ background: "var(--status-busy)" }}
                              />
                              {sp.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

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
                            style={{
                              color: sameDay(d, today) ? "var(--ember)" : "var(--ink-muted)",
                            }}
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
                      <div className="relative">
                        {Array.from(
                          { length: END_HOUR - START_HOUR },
                          (_, i) => START_HOUR + i,
                        ).map((h) => (
                          <span
                            key={h}
                            className="absolute right-2.5 -translate-y-1/2 font-mono text-[9.5px]"
                            style={{ top: (h - START_HOUR) * HOUR_H, color: "var(--ink-muted)" }}
                          >
                            {fmt12(h)}
                          </span>
                        ))}
                      </div>

                      {days.map((day, c) => {
                        const isToday = sameDay(day, today);
                        const weekend = day.getDay() === 0 || day.getDay() === 6;
                        const dayOccs = occurrences
                          .filter((o) => sameDay(o.start, day))
                          .map((o) => {
                            const s = o.start.getHours() + o.start.getMinutes() / 60;
                            const e = o.end.getHours() + o.end.getMinutes() / 60;
                            return { ...o, s, e: Math.max(e, s + 0.25) };
                          })
                          .sort((a, b) => a.s - b.s);

                        // my status block
                        if (myStatus && isToday) {
                          const wh = (workingHours.data ?? []).find(
                            (h) => h.dayOfWeek === day.getDay() && h.isWorkingDay,
                          );
                          const sh = wh ? parseHM(wh.startTime) : 9;
                          dayOccs.push({
                            ev: {
                              id: "__status",
                              title: statusMeta(myStatus.status).label,
                              startTime: "",
                              endTime: "",
                              color: "var(--ember)",
                              recurrence: "none",
                              recurrenceDays: [],
                              recurrenceInterval: 1,
                              recurrenceUntil: null,
                            },
                            start: day,
                            end: day,
                            s: Math.max(sh, nowDecimal()),
                            e: Math.min(nowDecimal() + 1.5, END_HOUR),
                          });
                        }

                        return (
                          // biome-ignore lint/a11y/noStaticElementInteractions: pointer-driven calendar grid
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
                              cursor: "crosshair",
                              userSelect: "none",
                            }}
                            onMouseDown={(e) => {
                              if (e.button !== 0) return;
                              if ((e.target as HTMLElement).closest("button[data-event]")) return;
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              const rawMin =
                                ((e.clientY - rect.top) / HOUR_H) * 60 + START_HOUR * 60;
                              const snapped = Math.round(rawMin / 30) * 30;
                              const startMin = Math.min(
                                Math.max(START_HOUR * 60, snapped),
                                END_HOUR * 60 - 30,
                              );
                              dragRef.current = {
                                day,
                                startMin,
                                colEl: e.currentTarget as HTMLElement,
                              };
                              const initial = { day, startMin, endMin: startMin + 60, col: c };
                              dragStateRef.current = initial;
                              setDrag(initial);
                              e.preventDefault();

                              const onMove = (me: MouseEvent) => {
                                if (!dragRef.current) return;
                                const r = dragRef.current.colEl.getBoundingClientRect();
                                const raw = ((me.clientY - r.top) / HOUR_H) * 60 + START_HOUR * 60;
                                const endMin = Math.min(
                                  Math.max(
                                    dragRef.current.startMin + 30,
                                    Math.round(raw / 30) * 30,
                                  ),
                                  END_HOUR * 60,
                                );
                                dragStateRef.current = {
                                  day,
                                  startMin: dragRef.current.startMin,
                                  endMin,
                                };
                                setDrag((d) => (d ? { ...d, endMin } : null));
                              };
                              const onUp = () => {
                                window.removeEventListener("mousemove", onMove);
                                window.removeEventListener("mouseup", onUp);
                                const ds = dragStateRef.current;
                                dragRef.current = null;
                                dragStateRef.current = null;
                                setDrag(null);
                                if (!ds) return;
                                setDialog({
                                  mode: "create",
                                  date: ds.day,
                                  start: `${String(Math.floor(ds.startMin / 60)).padStart(2, "0")}:${String(ds.startMin % 60).padStart(2, "0")}`,
                                  end: `${String(Math.floor(ds.endMin / 60)).padStart(2, "0")}:${String(ds.endMin % 60).padStart(2, "0")}`,
                                });
                              };
                              window.addEventListener("mousemove", onMove);
                              window.addEventListener("mouseup", onUp);
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

                            {isToday && (
                              <div
                                className="absolute left-0 right-0 z-20 pointer-events-none"
                                style={{ top: (nowDecimal() - START_HOUR) * HOUR_H }}
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

                            {/* drag-to-create ghost */}
                            {drag &&
                              sameDay(drag.day, day) &&
                              (() => {
                                const topPx = (drag.startMin / 60 - START_HOUR) * HOUR_H;
                                const heightPx = ((drag.endMin - drag.startMin) / 60) * HOUR_H;
                                const sh = drag.startMin;
                                const eh = drag.endMin;
                                return (
                                  <div
                                    className="absolute left-1 right-1.5 rounded-lg px-2.5 py-1.5 pointer-events-none z-30 border-2"
                                    style={{
                                      top: topPx + 3,
                                      height: Math.max(24, heightPx - 7),
                                      background: "var(--tint-focus)",
                                      borderColor: "var(--ember)",
                                      opacity: 0.85,
                                    }}
                                  >
                                    <span
                                      className="block font-mono text-[9.5px] font-semibold"
                                      style={{ color: "var(--ink-secondary)" }}
                                    >
                                      {fmt12(Math.floor(sh / 60), sh % 60)} –{" "}
                                      {fmt12(Math.floor(eh / 60), eh % 60)}
                                    </span>
                                  </div>
                                );
                              })()}

                            {dayOccs.map((o, i) => (
                              <button
                                type="button"
                                // biome-ignore lint/suspicious/noArrayIndexKey: static/derived list, never reordered
                                key={o.ev.id + String(o.start.getTime()) + i}
                                data-event="true"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (o.ev.id === "__status") return;
                                  setPopover({
                                    occ: { start: o.start, end: o.end, ev: o.ev },
                                    x: e.clientX,
                                    y: e.clientY,
                                  });
                                }}
                                className="absolute left-1 right-1.5 rounded-lg px-2.5 py-1.5 text-xs overflow-hidden border text-left hover:brightness-95"
                                style={{
                                  top: Math.max(0, (o.s - START_HOUR) * HOUR_H) + 3,
                                  height: Math.max(24, (o.e - o.s) * HOUR_H - 7),
                                  background:
                                    o.ev.id === "__status"
                                      ? "var(--ember-soft)"
                                      : tintFor(o.ev.color),
                                  borderColor: "var(--color-border)",
                                }}
                              >
                                <b className="block font-semibold">
                                  <i
                                    className="inline-block w-[7px] h-[7px] rounded-full mr-1.5 align-[1px]"
                                    style={{
                                      background:
                                        o.ev.id === "__status" ? "var(--ember)" : o.ev.color,
                                    }}
                                  />
                                  {o.ev.title}
                                </b>
                                <span
                                  className="block font-mono text-[9.5px] mt-px"
                                  style={{ color: "var(--ink-muted)" }}
                                >
                                  {fmt12(o.start.getHours(), o.start.getMinutes())}-
                                  {fmt12(o.end.getHours(), o.end.getMinutes())}
                                  {o.ev.recurrence !== "none" && ` · ${recurrenceLabel(o.ev)}`}
                                </span>
                              </button>
                            ))}
                          </div>
                        );
                      })}
                    </div>

                    {/* event detail popover — fixed to viewport so scrolling doesn't misalign it */}
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
                          className="fixed rounded-xl border shadow-lg p-4 w-64"
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
                                {fmt12(
                                  popover.occ.start.getHours(),
                                  popover.occ.start.getMinutes(),
                                )}{" "}
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
                          <div className="flex gap-2 mt-4">
                            <button
                              type="button"
                              className="btn-ink flex-1 justify-center"
                              style={{ padding: "8px 0" }}
                              onClick={() => setDialog({ mode: "edit", event: popover.occ.ev })}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="ghost-btn flex-1"
                              style={{ color: "var(--status-busy)" }}
                              onClick={() => deleteEvent.mutate({ id: popover.occ.ev.id })}
                            >
                              {deleteEvent.isPending ? "…" : "Delete"}
                            </button>
                          </div>
                          <p className="text-[10.5px] mt-3" style={{ color: "var(--ink-muted)" }}>
                            {popover.occ.ev.recurrence !== "none"
                              ? "Changes apply to the whole series."
                              : ""}
                          </p>
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
                  <div className="flex flex-col min-h-full">
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
                    <div
                      className="grid flex-1"
                      style={{
                        gridTemplateColumns: "repeat(7, 1fr)",
                        gridTemplateRows: "repeat(6, minmax(96px, 1fr))",
                      }}
                    >
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
                            className="border-b border-r p-1.5 cursor-pointer hover:bg-[var(--paper-deep)]"
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
            {view === "schedule" &&
              (() => {
                const groups = new Map<string, typeof occurrences>();
                for (const o of occurrences) {
                  const k = dayKey(o.start);
                  if (!groups.has(k)) groups.set(k, []);
                  groups.get(k)!.push(o);
                }
                const keys = [...groups.keys()].sort();
                if (keys.length === 0)
                  return (
                    <div
                      className="py-20 text-center text-sm"
                      style={{ color: "var(--ink-muted)" }}
                    >
                      No events in the next 60 days.
                    </div>
                  );
                return (
                  <div className="max-w-2xl">
                    {keys.map((k) => {
                      const list = groups.get(k)!;
                      const d = list[0].start;
                      return (
                        <div key={k} className="mb-7">
                          <div
                            className="flex items-baseline gap-3 border-b pb-2 mb-2"
                            style={{ borderColor: "var(--color-border-strong)" }}
                          >
                            <span
                              className="font-serif-display italic text-[13px]"
                              style={{ color: "var(--ember)" }}
                            >
                              {d.toLocaleDateString("en-US", { weekday: "long" })}
                            </span>
                            <span className="font-serif-display text-[15px] font-semibold">
                              {d.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                            </span>
                          </div>
                          {list.map((o, i) => (
                            <button
                              type="button"
                              // biome-ignore lint/suspicious/noArrayIndexKey: static/derived list, never reordered
                              key={i}
                              onClick={(e) => {
                                const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                const g = gridRef.current?.getBoundingClientRect();
                                setPopover({
                                  occ: o,
                                  x: r.left - (g?.left ?? 0),
                                  y: r.top - (g?.top ?? 0),
                                });
                              }}
                              className="flex items-center gap-3 w-full text-left py-2 px-2 rounded-lg hover:bg-[var(--paper-deep)]"
                            >
                              <span
                                className="font-mono text-[10px] w-20 shrink-0"
                                style={{ color: "var(--ink-muted)" }}
                              >
                                {fmt12(o.start.getHours(), o.start.getMinutes())}
                              </span>
                              <span
                                className="w-[3px] self-stretch rounded"
                                style={{ background: o.ev.color }}
                              />
                              <span>
                                <b className="block text-[12.5px] font-semibold">{o.ev.title}</b>
                                <span className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                                  until {fmt12(o.end.getHours(), o.end.getMinutes())}
                                  {o.ev.recurrence !== "none" ? ` · ${recurrenceLabel(o.ev)}` : ""}
                                </span>
                              </span>
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
          </div>
        )}
      </div>

      {/* ═══ create/edit dialog ═══ */}
      {dialog && me.data && (
        <EventDialog
          mode={dialog.mode}
          initial={
            dialog.mode === "edit"
              ? {
                  title: dialog.event.title,
                  start: new Date(dialog.event.startTime),
                  end: new Date(dialog.event.endTime),
                  color: dialog.event.color,
                  recurrence: dialog.event.recurrence,
                  recurrenceDays: dialog.event.recurrenceDays ?? [],
                  recurrenceInterval: dialog.event.recurrenceInterval ?? 1,
                  recurrenceUntil: dialog.event.recurrenceUntil
                    ? String(dialog.event.recurrenceUntil).slice(0, 10)
                    : "",
                }
              : undefined
          }
          prefill={
            dialog.mode === "create"
              ? { date: dialog.date, start: dialog.start, end: dialog.end }
              : undefined
          }
          pending={createEvent.isPending || updateEvent.isPending}
          error={(createEvent.error ?? updateEvent.error)?.message ?? null}
          onCancel={() => {
            setDialog(null);
            createEvent.reset();
            updateEvent.reset();
          }}
          onSubmit={(v) => {
            const payload = { ...v, recurrence: v.recurrence as Recurrence };
            if (dialog.mode === "edit") {
              updateEvent.mutate({ id: dialog.event.id, ...payload });
            } else {
              createEvent.mutate(payload);
            }
          }}
        />
      )}
    </div>
  );
}
