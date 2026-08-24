import { recurrenceLabel } from "@kairos/api/lib/recurrence";
import { useState } from "react";
import { DAY_FULL, END_HOUR, HOUR_H, START_HOUR, tintFor } from "@/components/calendar/constants";
import { dayKey, fmt12, parseHM, sameDay } from "@/components/calendar/date-utils";
import type { SavedEvent } from "@/components/calendar/types";

type Occ = { ev: SavedEvent; start: Date; end: Date };
type WorkingHour = { dayOfWeek: number; isWorkingDay: boolean; startTime: string; endTime: string };
type LeaveSpan = { id: string; label: string; startCol: number; endCol: number; days: Date[] };

export function DayWeekView({
  days,
  occurrences,
  today,
  nowDecimal,
  myStatus,
  workingHours,
  leaveSpans,
  onEventClick,
  onDragCreate,
  drag,
  statusMeta,
}: {
  days: Date[];
  occurrences: Occ[];
  today: Date;
  nowDecimal: number;
  myStatus: { status: string; note?: string | null } | null;
  workingHours: WorkingHour[];
  leaveSpans: { spans: LeaveSpan[]; days: Date[] };
  onEventClick: (occ: Occ, e: React.MouseEvent) => void;
  onDragCreate: (day: Date, start: string, end: string) => void;
  drag: { day: Date; startMin: number; endMin: number } | null;
  statusMeta: (s: string) => { label: string; color: string };
}) {
  const cols = days.length;
  // local preview so the box appears while dragging — parent `drag` was never set ( _setDrag )
  const [localDrag, setLocalDrag] = useState<{
    day: Date;
    startMin: number;
    endMin: number;
  } | null>(null);
  const activeDrag = localDrag ?? drag;

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, day: Date) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button[data-event]")) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const rawMin = ((e.clientY - rect.top) / HOUR_H) * 60 + START_HOUR * 60;
    const snapped = Math.round(rawMin / 30) * 30;
    const startMin = Math.min(Math.max(START_HOUR * 60, snapped), END_HOUR * 60 - 30);

    const colEl = e.currentTarget as HTMLElement;
    let currentEndMin = startMin + 60;
    setLocalDrag({ day, startMin, endMin: currentEndMin });

    const onMove = (me: MouseEvent) => {
      const r = colEl.getBoundingClientRect();
      const raw = ((me.clientY - r.top) / HOUR_H) * 60 + START_HOUR * 60;
      currentEndMin = Math.min(Math.max(startMin + 30, Math.round(raw / 30) * 30), END_HOUR * 60);
      setLocalDrag({ day, startMin, endMin: currentEndMin });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setLocalDrag(null);
      const sh = `${String(Math.floor(startMin / 60)).padStart(2, "0")}:${String(startMin % 60).padStart(2, "0")}`;
      const eh = `${String(Math.floor(currentEndMin / 60)).padStart(2, "0")}:${String(currentEndMin % 60).padStart(2, "0")}`;
      onDragCreate(day, sh, eh);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    e.preventDefault();
  };

  return (
    <div className="relative" style={{ minWidth: cols === 1 ? 0 : 720 }}>
      {/* mobile scroll hint */}
      {cols > 1 && (
        <div
          className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none sm:hidden z-10"
          style={{
            background: "linear-gradient(to right, transparent, var(--paper))",
          }}
        />
      )}
      {/* all-day strip (leave) */}
      {leaveSpans.spans.length > 0 && days.length > 1 && (
        <div className="mb-2">
          <div className="grid" style={{ gridTemplateColumns: `48px repeat(${cols}, 1fr)` }}>
            <span className="font-mono text-[9px] pt-1" style={{ color: "var(--ink-muted)" }}>
              all day
            </span>
            {days.map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static/derived list
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
                // biome-ignore lint/suspicious/noArrayIndexKey: static/derived list
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

      {/* column headers */}
      <div
        className="grid pb-2.5 sticky top-0 z-10 bg-[var(--paper)]"
        style={{ gridTemplateColumns: `48px repeat(${cols}, 1fr)` }}
      >
        <span />
        {days.map((d) => (
          <div key={dayKey(d)} className="text-center">
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

      {/* time grid */}
      <div
        className="grid relative border-t"
        style={{
          gridTemplateColumns: `48px repeat(${cols}, 1fr)`,
          borderColor: "var(--color-border)",
        }}
      >
        {/* hour labels */}
        <div className="relative">
          {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i).map((h) => (
            <span
              key={h}
              className="absolute right-2.5 -translate-y-1/2 font-mono text-[9.5px]"
              style={{ top: (h - START_HOUR) * HOUR_H, color: "var(--ink-muted)" }}
            >
              {fmt12(h)}
            </span>
          ))}
        </div>

        {/* day columns */}
        {days.map((day) => {
          const isToday = sameDay(day, today);
          const weekend = day.getDay() === 0 || day.getDay() === 6;
          const dayOccs = occurrences
            .filter((o) => sameDay(o.start, day))
            .map((o) => {
              const s = o.start.getHours() + o.start.getMinutes() / 60;
              const e = o.end.getHours() + o.end.getMinutes() / 60;
              return { ...o, s, e: Math.max(e, s + 0.25), lane: 0 };
            })
            .sort((a, b) => a.s - b.s);

          // my status block
          if (myStatus && isToday) {
            const wh = workingHours.find((h) => h.dayOfWeek === day.getDay() && h.isWorkingDay);
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
              s: Math.max(sh, nowDecimal),
              e: Math.min(nowDecimal + 1.5, END_HOUR),
              lane: 0,
            });
          }

          // Greedy lane packing
          dayOccs.sort((a, b) => a.s - b.s || a.e - b.e);
          const laneEnds: number[] = [];
          for (const o of dayOccs) {
            let lane = laneEnds.findIndex((end) => end <= o.s + 1e-9);
            if (lane === -1) {
              laneEnds.push(o.e);
              lane = laneEnds.length - 1;
            } else {
              laneEnds[lane] = o.e;
            }
            o.lane = lane;
          }
          const laneCount = Math.max(1, laneEnds.length);

          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: pointer-driven calendar grid
            <div
              key={dayKey(day)}
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
              onMouseDown={(e) => handleMouseDown(e, day)}
            >
              {/* hour lines */}
              {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i).map((h) => (
                <div
                  key={h}
                  className="border-b"
                  style={{ height: HOUR_H, borderColor: "var(--color-border-subtle)" }}
                />
              ))}

              {/* now indicator */}
              {isToday && (
                <div
                  className="absolute left-0 right-0 z-20 pointer-events-none"
                  style={{ top: (nowDecimal - START_HOUR) * HOUR_H }}
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
              {activeDrag &&
                sameDay(activeDrag.day, day) &&
                (() => {
                  const topPx = (activeDrag.startMin / 60 - START_HOUR) * HOUR_H;
                  const heightPx = ((activeDrag.endMin - activeDrag.startMin) / 60) * HOUR_H;
                  const sh = activeDrag.startMin;
                  const eh = activeDrag.endMin;
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

              {/* event blocks */}
              {dayOccs.map((o) => (
                <button
                  type="button"
                  key={`${o.ev.id}-${o.start.getTime()}-${o.lane}`}
                  data-event="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (o.ev.id === "__status") return;
                    onEventClick({ ev: o.ev, start: o.start, end: o.end }, e);
                  }}
                  className="ev-block absolute rounded-lg px-2.5 py-1.5 text-xs overflow-hidden border text-left"
                  style={{
                    top: Math.max(0, (o.s - START_HOUR) * HOUR_H) + 3,
                    height: Math.max(24, (o.e - o.s) * HOUR_H - 7),
                    left: `calc(${(o.lane / laneCount) * 100}% + ${o.lane === 0 ? 4 : 2}px)`,
                    width: `calc(${(1 / laneCount) * 100}% - ${laneCount > 1 ? 4 : 10}px)`,
                    background: o.ev.id === "__status" ? "var(--ember-soft)" : tintFor(o.ev.color),
                    borderColor: "var(--color-border)",
                  }}
                >
                  <b className="block font-semibold">
                    <i
                      className="inline-block w-[7px] h-[7px] rounded-full mr-1.5 align-[1px]"
                      style={{
                        background: o.ev.id === "__status" ? "var(--ember)" : o.ev.color,
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

              {/* empty state */}
              {dayOccs.length === 0 && isToday && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p
                    className="text-[12px] font-serif-display italic"
                    style={{ color: "var(--ink-muted)" }}
                  >
                    No events today
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
