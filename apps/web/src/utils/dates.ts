import { startOfWeek } from "date-fns";

/** Monday-based start of the week containing `date` (correct across Sundays). */
export function weekStartOf(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}
