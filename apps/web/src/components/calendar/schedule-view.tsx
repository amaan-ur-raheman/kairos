import { recurrenceLabel } from "@kairos/api/lib/recurrence";
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

function DayHeading({ d, isLeaveDay }: { d: Date; isLeaveDay: boolean }) {
  const isToday = dayKey(d) === dayKey(new Date());
  return (
    <div
      className="flex items-baseline gap-3 border-b pb-2.5 mb-3"
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
          className="text-[10px] font-mono px-1.5 py-0.5 rounded"
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
        <span
          className="w-[3px] self-stretch rounded-sm shrink-0"
          style={{ background: o.ev.color }}
        />
        <div className="min-w-0 flex-1">
          <b className="block text-[13px] font-semibold truncate">{o.ev.title}</b>
          <span className="text-[11.5px]" style={{ color: "var(--ink-muted)" }}>
            until {fmt12(o.end.getHours(), o.end.getMinutes())}
            {o.ev.recurrence !== "none" && <span className="ml-1">· {recurrenceLabel(o.ev)}</span>}
          </span>
        </div>
      </>
    );
    return onEventClick ? (
      <button
        type="button"
        key={`${k}-${o.ev.id}-${i}`}
        onClick={(e) => onEventClick(o, e)}
        className="flex items-start gap-3 w-full text-left py-2.5 px-2.5 rounded-lg hover:bg-[var(--paper-deep)] transition-colors duration-150"
      >
        {inner}
      </button>
    ) : (
      <div
        key={`${k}-${o.ev.id}-${i}`}
        className="flex items-start gap-3 w-full text-left py-2.5 px-2.5 rounded-lg"
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
            <DayHeading d={d} isLeaveDay={leaveDayKeys.has(k)} />
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
              <DayHeading d={dt} isLeaveDay />
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
