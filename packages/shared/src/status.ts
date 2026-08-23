/**
 * Availability status domain constants.
 *
 * The status enum lives in the DB schema (@kairos/db/schema/availability);
 * this module is the single shared source for keys, labels and display order
 * across web, native, and API. Platform-specific colors stay in each app
 * (CSS variables on web, hex values on native).
 */

export const AVAILABILITY_STATUSES = [
  "available",
  "busy",
  "in_meeting",
  "focus_time",
  "traveling",
  "offline",
] as const;

export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

/** Display order: most available first, least available last. */
export const STATUS_ORDER: readonly AvailabilityStatus[] = [
  "available",
  "in_meeting",
  "focus_time",
  "busy",
  "traveling",
  "offline",
];

export const STATUS_LABELS: Record<AvailabilityStatus, string> = {
  available: "Available",
  busy: "Busy",
  in_meeting: "In a Meeting",
  focus_time: "Focus Time",
  traveling: "Traveling",
  offline: "Offline",
};

export function isAvailabilityStatus(v: unknown): v is AvailabilityStatus {
  return typeof v === "string" && (AVAILABILITY_STATUSES as readonly string[]).includes(v);
}

/**
 * Normalizes an arbitrary value (e.g. a DB varchar) to a known status,
 * falling back to "offline" — mirrors the web app's previous `statusMeta` fallback.
 */
export function normalizeStatus(status: string | null | undefined): AvailabilityStatus {
  return isAvailabilityStatus(status) ? status : "offline";
}

export function statusLabel(status: string | null | undefined): string {
  return STATUS_LABELS[normalizeStatus(status)];
}
