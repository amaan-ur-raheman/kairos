import { DAYS } from "@/components/calendar/constants";
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
    <div className="flex flex-col min-h-full">
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
        className="grid flex-1"
        style={{
          gridTemplateColumns: "repeat(7, 1fr)",
          gridTemplateRows: `repeat(${rowCount}, minmax(72px, 1fr))`,
        }}
      >
        {cells.map((d) => {
          const inMonth = d.getMonth() === anchor.getMonth();
          const isToday = sameDay(d, today);
          const occs = occurrences.filter((o) => sameDay(o.start, d));
          return (
            <button
              type="button"
              key={dayKey(d)}
              onClick={() => onDayClick(d)}
              aria-label={`${d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}${occs.length > 0 ? `, ${occs.length} event${occs.length === 1 ? "" : "s"}` : ""}`}
              className="text-left border-b border-r p-1.5 cursor-pointer hover:bg-[var(--paper-deep)] focus-visible:outline-2 focus-visible:outline-[var(--ring)] focus-visible:-outline-offset-2"
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

              {/* event dots — compact representation */}
              {occs.length > 0 && (
                <div className="flex flex-wrap gap-[3px]">
                  {occs.slice(0, 5).map((o) => (
                    <span
                      key={`${o.ev.id}-${o.start.getTime()}`}
                      className="block w-[7px] h-[7px] rounded-full"
                      style={{ background: o.ev.color }}
                      title={o.ev.title}
                    />
                  ))}
                  {occs.length > 5 && (
                    <span
                      className="text-[8px] font-mono leading-none pt-[1px]"
                      style={{ color: "var(--ink-muted)" }}
                    >
                      +{occs.length - 5}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
