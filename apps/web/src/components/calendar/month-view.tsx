import { Button } from "@kairos/ui/components/button";
import { CALENDAR_GRID_MIN_WIDTH, DAYS } from "@/components/calendar/constants";
import { dayKey, sameDay, shift } from "@/components/calendar/date-utils";
import type { SavedEvent } from "@/components/calendar/types";
import { weekStartOf } from "@/utils/dates";

type Occ = { ev: SavedEvent; start: Date; end: Date };

export function MonthView({
  anchor,
  today,
  occurrences,
  onDayClick,
}: {
  anchor: Date;
  today: Date;
  occurrences: Occ[];
  onDayClick: (day: Date) => void;
}) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = weekStartOf(first);
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  const rowCount = Math.ceil((((first.getDay() + 6) % 7) + daysInMonth) / 7);
  const cells = Array.from({ length: rowCount * 7 }, (_, i) => shift(gridStart, i));

  return (
    <div className="flex min-h-full flex-col" style={{ minWidth: CALENDAR_GRID_MIN_WIDTH }}>
      {/* weekday headers */}
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

      {/* day cells */}
      <div
        className="grid flex-1 border-l border-t"
        style={{
          gridTemplateColumns: "repeat(7, 1fr)",
          gridTemplateRows: `repeat(${rowCount}, minmax(96px, 1fr))`,
          borderColor: "var(--color-border)",
        }}
      >
        {cells.map((d) => {
          const inMonth = d.getMonth() === anchor.getMonth();
          const isToday = sameDay(d, today);
          const occs = occurrences.filter((o) => sameDay(o.start, d));
          return (
            <Button
              type="button"
              variant="ghost"
              key={dayKey(d)}
              onClick={() => onDayClick(d)}
              aria-label={`${d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}${occs.length > 0 ? `, ${occs.length} event${occs.length === 1 ? "" : "s"}` : ""}`}
              className="h-full w-full flex-col items-start justify-start rounded-none border-b border-r p-1.5 text-left hover:bg-[var(--paper-deep)] focus-visible:outline-2 focus-visible:outline-[var(--ring)] focus-visible:-outline-offset-2"
              style={{
                borderColor: "var(--color-border)",
                background: isToday
                  ? "var(--ember-soft)"
                  : !inMonth
                    ? "var(--paper-deep)"
                    : undefined,
              }}
            >
              {/* date number */}
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

              {/* event titles — compact representation */}
              {occs.length > 0 && (
                <div className="mt-1 flex w-full min-w-0 flex-col gap-1 text-left">
                  {occs.slice(0, 4).map((o) => (
                    <span
                      key={`${o.ev.id}-${o.start.getTime()}`}
                      className="block w-full min-w-0 truncate border-l-2 pl-1.5 font-sans text-[10px] font-medium leading-4 text-[var(--ink-secondary)]"
                      style={{ borderLeftColor: o.ev.color }}
                      title={o.ev.title}
                    >
                      {o.ev.title}
                    </span>
                  ))}
                  {occs.length > 4 && (
                    <span
                      className="font-mono text-[9px] leading-4 text-[var(--ink-muted)]"
                      style={{ color: "var(--ink-muted)" }}
                    >
                      +{occs.length - 4} more
                    </span>
                  )}
                </div>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
