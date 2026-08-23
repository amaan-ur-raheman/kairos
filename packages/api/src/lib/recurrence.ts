/**
 * Recurrence expansion for calendar events.
 * Pure functions — no DB/env imports — so both API and web can use them.
 *
 * Model:
 *  - recurrence: none | daily | weekdays | weekly | monthly | yearly
 *  - recurrenceDays: 0=Sun..6=Sat, used by weekly patterns
 *  - recurrenceInterval: every N weeks (weekly patterns; 1 = every week)
 *  - recurrenceUntil: ISO date string, null = forever
 */

export type Recurrence = "none" | "daily" | "weekdays" | "weekly" | "monthly" | "yearly";

export interface EventDef {
  startTime: string; // ISO
  endTime: string; // ISO
  recurrence: Recurrence;
  recurrenceDays: number[];
  recurrenceInterval: number;
  recurrenceUntil: string | null;
}

export interface Occurrence {
  start: Date;
  end: Date;
}

const DAY_MS = 86_400_000;

function mondayOf(d: Date): Date {
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}

/** Expands an event definition into concrete occurrences overlapping [rangeStart, rangeEnd]. */
export function expandOccurrences(ev: EventDef, rangeStart: Date, rangeEnd: Date): Occurrence[] {
  const start = new Date(ev.startTime);
  const end = new Date(ev.endTime);
  const durationMs = Math.max(0, end.getTime() - start.getTime());
  const rec = ev.recurrence ?? "none";

  if (rec === "none") {
    return start <= rangeEnd && end >= rangeStart ? [{ start, end }] : [];
  }

  const until = ev.recurrenceUntil
    ? new Date(`${ev.recurrenceUntil.slice(0, 10)}T23:59:59`)
    : rangeEnd;
  const hardEnd = until < rangeEnd ? until : rangeEnd;
  if (hardEnd < rangeStart) return [];

  const anchor = new Date(start);
  anchor.setHours(0, 0, 0, 0);
  const anchorWeek = mondayOf(anchor).getTime();
  const interval = Math.max(1, ev.recurrenceInterval ?? 1);
  const days = ev.recurrenceDays ?? [];

  const out: Occurrence[] = [];
  // Start scanning at the query window, not the anchor — otherwise old daily/weekly
  // events burn iterations on years before anyone is looking. Clamping to the Monday
  // of the window's first week keeps weekly interval math aligned with the anchor.
  const cursor = new Date(Math.max(anchor.getTime(), mondayOf(rangeStart).getTime()));
  // ponytail: guard is now a safety net (window-clamped), not a correctness limit
  const lastDay = new Date(hardEnd);
  lastDay.setHours(23, 59, 59, 999);

  let guard = 0;
  while (cursor <= lastDay && guard < 2000) {
    guard += 1;
    const dow = cursor.getDay();
    let match = false;

    switch (rec) {
      case "daily":
        match = true;
        break;
      case "weekdays":
        match = dow >= 1 && dow <= 5;
        break;
      case "weekly": {
        const inDays = days.length === 0 ? dow === start.getDay() : days.includes(dow);
        const weekDiff = Math.round((mondayOf(cursor).getTime() - anchorWeek) / (7 * DAY_MS));
        match = inDays && weekDiff >= 0 && weekDiff % interval === 0;
        break;
      }
      case "monthly":
        match = cursor.getDate() === start.getDate();
        break;
      case "yearly":
        match = cursor.getDate() === start.getDate() && cursor.getMonth() === start.getMonth();
        break;
    }

    if (match) {
      const occStart = new Date(cursor);
      occStart.setHours(start.getHours(), start.getMinutes(), 0, 0);
      const occEnd = new Date(occStart.getTime() + durationMs);
      if (occEnd >= rangeStart && occStart <= rangeEnd) {
        out.push({ start: occStart, end: occEnd });
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return out;
}

/** Human label for a recurrence definition, e.g. "Weekly on Mon, Wed". */
export interface LooseRecurrence {
  recurrence: string;
  recurrenceDays?: number[] | null;
  recurrenceInterval?: number | null;
}
export function recurrenceLabel(ev: LooseRecurrence): string {
  const rec = ev.recurrence as Recurrence;
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days = (ev.recurrenceDays ?? [])
    .slice()
    .sort()
    .map((d) => names[d]);
  switch (rec) {
    case "daily":
      return "Daily";
    case "weekdays":
      return "Weekdays (Mon–Fri)";
    case "weekly": {
      if (days.length) {
        const every =
          (ev.recurrenceInterval ?? 1) > 1
            ? `every ${ev.recurrenceInterval} weeks on `
            : "Weekly on ";
        return `${every}${days.join(", ")}`;
      }
      return "Weekly";
    }
    case "monthly":
      return "Monthly";
    case "yearly":
      return "Yearly";
    default:
      return "Does not repeat";
  }
}
