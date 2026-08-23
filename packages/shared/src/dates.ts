/**
 * Shared date helpers — pure, dependency-free, safe in React Native.
 * Kept identical across web/native by living here instead of per-app copies.
 */

/** `YYYY-MM-DD` local-date key. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

/** Monday-based start of the week containing `date` (correct across Sundays). */
export function weekStartOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/** The 7 dates (Mon..Sun) of the week containing `date`. */
export function getWeekDates(date: Date): Date[] {
  const monday = weekStartOf(date);
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    return dt;
  });
}

/** New date shifted by `days`, preserving time of day. */
export function shiftDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
