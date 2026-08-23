/** Calendar-local date/time formatting helpers. Shared day helpers live in @kairos/shared. */

import { isSameDay as sharedIsSameDay } from "@kairos/shared";

export { dayKey, isSameDay } from "@kairos/shared";
export const fmt12 = (h: number, m = 0) => {
  const hh = h % 12 || 12;
  return m === 0
    ? `${hh} ${h < 12 ? "AM" : "PM"}`
    : `${hh}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

export const parseHM = (v: string) => {
  const [h, m] = v.split(":").map(Number);
  return h + m / 60;
};

export const compose = (day: Date, hm: string) => {
  const [h, m] = hm.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
};

export const shift = (d: Date, days: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};

// Local aliases so call sites read the same as before the extraction.
export const sameDay = sharedIsSameDay;

export function fmtRange(a: Date, b: Date) {
  const o = { month: "short", day: "numeric" } as const;
  return a.getMonth() === b.getMonth()
    ? `${a.toLocaleDateString("en-US", o)}-${b.getDate()}, ${b.getFullYear()}`
    : `${a.toLocaleDateString("en-US", o)} - ${b.toLocaleDateString("en-US", o)}, ${b.getFullYear()}`;
}

export const nowDecimal = () => {
  const n = new Date();
  return n.getHours() + n.getMinutes() / 60;
};

export const isoWeek = (d: Date) => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};
