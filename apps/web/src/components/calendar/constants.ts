/** Grid constants and tint tables shared by the calendar page and its dialogs. */

export const START_HOUR = 7;
export const END_HOUR = 21;
export const HOUR_H = 72;
export const CALENDAR_GRID_MIN_WIDTH = 960;
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DAY_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
export const VIEW_ORDER = ["day", "week", "month", "schedule"] as const;
export type View = (typeof VIEW_ORDER)[number];

export const EVENT_TINTS: Record<string, string> = {
  "#c93c37": "var(--tint-busy)",
  "#f4511e": "var(--tint-meeting)",
  "#b98212": "var(--tint-meeting)",
  "#3f9142": "var(--tint-available)",
  "#3b6fb5": "var(--tint-focus)",
  "#2b2620": "var(--tint-focus)",
  "#7d55b5": "var(--tint-traveling)",
  "#e67c73": "var(--tint-busy)",
  "#3f51b5": "var(--tint-focus)",
};
export const tintFor = (c: string) => EVENT_TINTS[c] ?? "var(--tint-focus)";

export const TIME_OPTIONS: string[] = [];
for (let h = 6; h <= 22; h++)
  for (const m of [0, 30]) {
    if (h === 22 && m === 30) continue;
    TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:${m === 0 ? "00" : "30"}`);
  }
