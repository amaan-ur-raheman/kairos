import { expandOccurrences, type Recurrence } from "@kairos/api/lib/recurrence";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { View } from "@/components/calendar/constants";
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
import { DayWeekView } from "@/components/calendar/day-week-view";
import { EventDialog } from "@/components/calendar/event-dialog";
import { EventPopover } from "@/components/calendar/event-popover";
import { MonthView } from "@/components/calendar/month-view";
import { type ScheduleOccurrence, ScheduleView } from "@/components/calendar/schedule-view";
import type { SavedEvent } from "@/components/calendar/types";
import { ErrorStrip, Skeleton } from "@/components/states";
import { weekStartOf } from "@/utils/dates";
import { orpc } from "@/utils/orpc";
import { statusMeta } from "@/utils/status";

export const Route = createFileRoute("/calendar")({
  validateSearch: (search: Record<string, unknown>): { view?: View; d?: string } => ({
    view: ["day", "week", "month", "schedule"].includes(search.view as string)
      ? (search.view as View)
      : undefined,
    d: typeof search.d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(search.d) ? search.d : undefined,
  }),
  component: CalendarPage,
});

/* ═══════════════ component ═══════════════ */
function CalendarPage() {
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const routeNavigate = Route.useNavigate();

  // View + anchor date live in the URL (?view=week&d=2026-08-24) so refresh/share preserve context
  const view: View = search.view ?? "week";
  const anchor = useMemo(() => {
    if (!search.d) return new Date();
    const [y, m, d] = search.d.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [search.d]);
  const setView = (v: View) =>
    routeNavigate({ search: (prev) => ({ ...prev, view: v }), replace: true });
  const setAnchor = (a: Date) =>
    routeNavigate({ search: (prev) => ({ ...prev, d: dayKey(a) }), replace: true });

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
  const [drag, _setDrag] = useState<{
    day: Date;
    startMin: number;
    endMin: number;
    col: number;
  } | null>(null);

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

  // Destructive action gets an undo window instead of a hard confirm
  const deleteWithUndo = (ev: SavedEvent) => {
    deleteEvent.mutate(
      { id: ev.id },
      {
        onSuccess: () => {
          toast("Event deleted", {
            description: ev.title,
            duration: 6000,
            action: {
              label: "Undo",
              onClick: () => {
                createEvent.mutate({
                  title: ev.title,
                  start:
                    typeof ev.startTime === "string"
                      ? ev.startTime
                      : (ev.startTime as Date).toISOString(),
                  end:
                    typeof ev.endTime === "string"
                      ? ev.endTime
                      : (ev.endTime as Date).toISOString(),
                  color: ev.color,
                  recurrence: ev.recurrence as Recurrence,
                  recurrenceDays: ev.recurrenceDays ?? [],
                  recurrenceInterval: ev.recurrenceInterval ?? 1,
                  recurrenceUntil: ev.recurrenceUntil
                    ? typeof ev.recurrenceUntil === "string"
                      ? ev.recurrenceUntil
                      : (ev.recurrenceUntil as Date).toISOString()
                    : undefined,
                });
              },
            },
          });
        },
      },
    );
  };

  const meId = me.data?.id ?? null;
  const myStatus = statuses.data?.find((s) => s.memberId === meId) ?? null;

  const weekStart = useMemo(() => weekStartOf(anchor), [anchor]);
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => shift(weekStart, i)),
    [weekStart],
  );
  const [today] = useState(() => new Date());
  const [nowTick, setNowTick] = useState(() => nowDecimal());
  useEffect(() => {
    const id = setInterval(() => setNowTick(nowDecimal()), 60_000);
    return () => clearInterval(id);
  }, []);
  const nowDecimalVal = nowTick;

  /* ── visible range per view ── */
  const range: { start: Date; end: Date; label: string } = useMemo(() => {
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
    setAnchor(shift(anchor, step));
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
      // Only events that haven't finished yet — the rail is "next up", not a diary
      const endDec = o.end.getHours() + o.end.getMinutes() / 60;
      if (endDec < nowDecimalVal) continue;
      items.push({
        time: fmt12(o.start.getHours(), o.start.getMinutes()),
        sort: o.start.getHours() + o.start.getMinutes() / 60,
        label: o.ev.title,
        sub: `until ${fmt12(o.end.getHours(), o.end.getMinutes())}`,
        color: o.ev.color,
      });
    }
    return items.sort((a, b) => a.sort - b.sort).slice(0, 4);
  }, [occurrences, workingHours.data, today, nowDecimalVal]);

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

  const scheduleLeaves = useMemo(() => {
    const from = dayKey(range.start);
    const to = dayKey(range.end);
    return (leaves.data ?? [])
      .filter((lr) => lr.status === "approved" && lr.endDate >= from && lr.startDate <= to)
      .map((lr) => ({
        id: lr.id,
        label: lr.type,
        startDate: lr.startDate < from ? from : lr.startDate,
        endDate: lr.endDate > to ? to : lr.endDate,
      }));
  }, [leaves.data, range.end, range.start]);

  /* ── keyboard shortcuts ── */
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyboard shortcuts use stable callbacks
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (dialog) {
          setDialog(null);
          return;
        }
        if (popover) {
          setPopover(null);
          return;
        }
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
      else if (k === "c" && me.data)
        setDialog({ mode: "create", date: range.start, start: "09:00", end: "10:00" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog, popover, me.data, range.start]);

  // Only block the grid on essential data; rail data (statuses/workingHours) can stream in
  const isLoading = me.isLoading || savedEvents.isLoading;
  const pageError = me.error || savedEvents.error;
  const railLoading = statuses.isLoading || workingHours.isLoading;

  // Dismiss popover when navigating views/dates
  // biome-ignore lint/correctness/useExhaustiveDependencies: setPopover is a stable setState
  useEffect(() => {
    setPopover(null);
  }, [view, anchor]);

  const viewBtn = (v: View, label: string) => (
    <button
      type="button"
      key={v}
      role="tab"
      aria-selected={view === v}
      onClick={() => setView(v)}
      className={view === v ? "on" : ""}
    >
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
        <span
          className="font-serif-display italic text-[13px]"
          style={{ color: "var(--ember)" }}
          suppressHydrationWarning
        >
          {today.toLocaleDateString("en-US", { weekday: "long", month: "long" })}
        </span>
        <div
          className="font-serif-display font-semibold text-[44px] leading-none mt-0.5"
          suppressHydrationWarning
        >
          {today.getDate()}
        </div>
        <p
          className="text-[12.5px] mt-1"
          style={{ color: "var(--ink-muted)" }}
          suppressHydrationWarning
        >
          Week {isoWeek(today)} ·{" "}
          {(statuses.data ?? []).filter((s) => s.status === "available").length} of{" "}
          {(statuses.data ?? []).length} teammates available
        </p>

        <section className="mt-6">
          <h2 className="rail-label">Your status</h2>
          {railLoading && !myStatus ? (
            <div
              className="border p-3.5"
              style={{
                borderColor: "var(--color-border)",
                borderRadius: "var(--r-md, 12px)",
                background: "var(--paper)",
              }}
            >
              <Skeleton className="h-4 w-24" />
            </div>
          ) : (
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
          )}
        </section>

        <section className="mt-6">
          <h2 className="rail-label">Next up today</h2>
          {nextUp.length === 0 ? (
            <p className="text-[12.5px] py-2" style={{ color: "var(--ink-muted)" }}>
              Nothing scheduled today.
            </p>
          ) : (
            nextUp.map((n) => (
              <div
                key={`${n.label}-${n.time}`}
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
        <div
          className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 lg:px-7 pt-4 sm:pt-6 pb-3 sm:pb-4 shrink-0 overflow-x-auto"
          title="Shortcuts: D day · W week · M month · S schedule · T today · ←/→ navigate · C create"
        >
          <h1 className="font-serif-display text-[19px] sm:text-[23px] font-semibold m-0 whitespace-nowrap">
            {view === "month"
              ? anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" })
              : "Calendar"}
          </h1>
          <span
            className="font-mono text-[11px] hidden sm:inline"
            style={{ color: "var(--ink-muted)" }}
          >
            {range.label}
          </span>
          <div className="seg-views ml-auto shrink-0" role="tablist" aria-label="Calendar view">
            {viewBtn("day", "Day")}
            {viewBtn("week", "Week")}
            {viewBtn("month", "Month")}
            {viewBtn("schedule", "Schedule")}
          </div>
          {view !== "schedule" && (
            <div className="hidden sm:flex items-center gap-2">
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
              <button
                type="button"
                aria-label="Next"
                onClick={() => navigate(1)}
                className="wk-btn"
              >
                ›
              </button>
            </div>
          )}
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
            className="btn-ember press-scale shrink-0 whitespace-nowrap"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">New event</span>
          </button>
        </div>

        {pageError && !isLoading && (
          <div className="px-6 lg:px-7 pt-4">
            <ErrorStrip
              message="Couldn't load your calendar."
              onRetry={() => {
                me.refetch();
                savedEvents.refetch();
              }}
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
            {(view === "day" || view === "week") && (
              <DayWeekView
                days={view === "day" ? [range.start] : weekDates}
                occurrences={occurrences}
                today={today}
                nowDecimal={nowDecimalVal}
                myStatus={myStatus}
                workingHours={workingHours.data ?? []}
                leaveSpans={leaveSpans}
                onEventClick={(occ, e) => setPopover({ occ, x: e.clientX, y: e.clientY })}
                onDragCreate={(day, start, end) =>
                  setDialog({ mode: "create", date: day, start, end })
                }
                drag={drag ? { day: drag.day, startMin: drag.startMin, endMin: drag.endMin } : null}
                statusMeta={statusMeta}
              />
            )}

            {/* ═══ MONTH ═══ */}
            {/* ═══ MONTH ═══ */}
            {view === "month" && (
              <MonthView
                anchor={anchor}
                today={today}
                occurrences={occurrences}
                onDayClick={(d) => {
                  setAnchor(d);
                  setView("day");
                }}
              />
            )}

            {/* ═══ SCHEDULE ═══ */}
            {view === "schedule" && (
              <ScheduleView
                occurrences={occurrences as ScheduleOccurrence[]}
                leaves={scheduleLeaves}
                onEventClick={(occ, e) => {
                  setPopover({
                    occ,
                    x: e.clientX,
                    y: e.clientY,
                  });
                }}
                emptyMessage="No events in the next 60 days."
              />
            )}
          </div>
        )}
      </div>

      {/* ═══ event detail popover (all views) ═══ */}
      {popover && (
        <EventPopover
          occ={popover.occ}
          x={popover.x}
          y={popover.y}
          deletePending={deleteEvent.isPending}
          onClose={() => setPopover(null)}
          onEdit={() => {
            setDialog({ mode: "edit", event: popover.occ.ev });
            setPopover(null);
          }}
          onDelete={() => deleteWithUndo(popover.occ.ev)}
        />
      )}

      {/* ═══ create/edit dialog ═══ */}
      {dialog && me.data && (
        <EventDialog
          key={
            dialog.mode === "edit"
              ? `edit-${dialog.event.id}`
              : `create-${dayKey(dialog.date)}-${dialog.start}`
          }
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
