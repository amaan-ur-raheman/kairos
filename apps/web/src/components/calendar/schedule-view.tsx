import { recurrenceLabel } from "@kairos/api/lib/recurrence";
import { Button } from "@kairos/ui/components/button";
import { dayKey, fmt12 } from "@/components/calendar/date-utils";
import type { Occurrence } from "@/components/calendar/types";

export type ScheduleOccurrence = Occurrence;

type LeaveSpan = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
};

type Props = {
  occurrences: ScheduleOccurrence[];
  leaves?: LeaveSpan[];
  /** When provided, event rows become clickable buttons. When omitted, rows are read-only divs. */
  onEventClick?: (occ: ScheduleOccurrence, e: React.MouseEvent) => void;
  emptyMessage?: string;
};

const MAX_LEAVE_WALK_DAYS = 366 * 2;

function DayHeading({
  d,
  isLeaveDay,
  eventCount,
}: {
  d: Date;
  isLeaveDay: boolean;
  eventCount: number;
}) {
  const isToday = dayKey(d) === dayKey(new Date());
  return (
    <div
      className="sticky top-0 z-10 mb-3 flex items-baseline gap-3 border-b bg-[var(--paper)] py-2.5"
      style={{ borderColor: "var(--color-border)" }}
    >
      <span
        className="font-serif-display italic text-[13px]"
        style={{ color: isToday ? "var(--ember)" : "var(--ink-muted)" }}
      >
        {d.toLocaleDateString(undefined, { weekday: "long" })}
      </span>
      <span className="font-serif-display text-[16px] font-semibold">
        {d.toLocaleDateString(undefined, { month: "long", day: "numeric" })}
      </span>
      {eventCount > 0 && (
        <span className="font-mono text-[10px] text-[var(--ink-muted)]">
          {eventCount} {eventCount === 1 ? "event" : "events"}
        </span>
      )}
      {isToday && (
        <span
          className="text-[9.5px] font-mono px-1.5 py-0.5 rounded-full"
          style={{ background: "var(--ember)", color: "#fff" }}
        >
          today
        </span>
      )}
      {isLeaveDay && (
        <span
          className="text-[10px] font-mono px-1.5 py-0.5 rounded-lg"
          style={{
            background: "var(--tint-leave, var(--tint-busy))",
            color: "var(--status-busy)",
          }}
        >
          Leave
        </span>
      )}
    </div>
  );
}

export function ScheduleView({ occurrences, leaves, onEventClick, emptyMessage }: Props) {
  // Group occurrences by day
  const groups = new Map<string, ScheduleOccurrence[]>();
  for (const o of occurrences) {
    const k = dayKey(o.start);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(o);
  }
  const keys = [...groups.keys()].sort();

  // Build a set of day keys that fall within an approved leave span (capped walk)
  const leaveDayKeys = new Set<string>();
  for (const lr of leaves ?? []) {
    if (lr.startDate > lr.endDate) continue;
    const cursor = new Date(`${lr.startDate}T00:00:00`);
    const end = new Date(`${lr.endDate}T00:00:00`);
    let guard = 0;
    while (cursor <= end && guard < MAX_LEAVE_WALK_DAYS) {
      guard += 1;
      leaveDayKeys.add(dayKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  if (keys.length === 0 && leaveDayKeys.size === 0) {
    return (
      <div className="py-20 text-center">
        <p className="font-serif-display text-[15px] italic" style={{ color: "var(--ink-muted)" }}>
          {emptyMessage ?? "No events in the next 60 days."}
        </p>
      </div>
    );
  }

  const renderRow = (o: ScheduleOccurrence, k: string, i: number) => {
    const inner = (
      <>
        <span
          className="font-mono text-[11px] w-[72px] shrink-0 pt-0.5"
          style={{ color: "var(--ink-muted)" }}
        >
          {fmt12(o.start.getHours(), o.start.getMinutes())}
        </span>
        <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: o.ev.color }} />
        <div className="min-w-0 flex-1">
          <b className="block text-[13px] font-semibold truncate">{o.ev.title}</b>
          <span className="text-[11.5px]" style={{ color: "var(--ink-muted)" }}>
            {fmt12(o.start.getHours(), o.start.getMinutes())}–
            {fmt12(o.end.getHours(), o.end.getMinutes())}
            {o.ev.recurrence !== "none" && <span className="ml-1">· {recurrenceLabel(o.ev)}</span>}
          </span>
        </div>
      </>
    );
    return onEventClick ? (
      <Button
        type="button"
        variant="ghost"
        key={`${k}-${o.ev.id}-${i}`}
        onClick={(e) => onEventClick(o, e)}
        aria-label={`${o.ev.title}, ${fmt12(o.start.getHours(), o.start.getMinutes())} to ${fmt12(o.end.getHours(), o.end.getMinutes())}`}
        className="flex h-auto min-h-0 w-full items-start justify-start gap-3 rounded-lg px-2.5 py-2.5 text-left whitespace-normal transition-colors duration-150 hover:bg-[var(--paper-deep)]"
      >
        {inner}
      </Button>
    ) : (
      <div
        key={`${k}-${o.ev.id}-${i}`}
        className="flex w-full items-start gap-3 rounded-lg px-2.5 py-2.5 text-left"
      >
        {inner}
      </div>
    );
  };

  return (
    <div className="w-full">
      {keys.map((k) => {
        const list = groups.get(k)!;
        const d = list[0].start;

        return (
          <div key={k} className="mb-8">
            <DayHeading d={d} eventCount={list.length} isLeaveDay={leaveDayKeys.has(k)} />
            <div className="space-y-0.5">{list.map((o, i) => renderRow(o, k, i))}</div>
          </div>
        );
      })}

      {/* Leave days with no events */}
      {[...leaveDayKeys]
        .filter((k) => !groups.has(k))
        .sort()
        .map((k) => {
          const [y, m, d] = k.split("-").map(Number);
          const dt = new Date(y, m - 1, d);
          return (
            <div key={k} className="mb-8">
              <DayHeading d={dt} eventCount={0} isLeaveDay />
              <p
                className="text-[12.5px] py-2.5 px-2.5 italic"
                style={{ color: "var(--ink-muted)" }}
              >
                No events — on leave
              </p>
            </div>
          );
        })}
    </div>
  );
}
