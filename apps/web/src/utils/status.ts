/**
 * Shared availability-status metadata for the web app.
 *
 * The status enum lives in the DB schema (@kairos/db/schema/availability);
 * these constants mirror it for display. Keep both in sync when adding a status.
 */

export type AvailabilityStatus =
  | "available"
  | "busy"
  | "in_meeting"
  | "focus_time"
  | "traveling"
  | "offline";

export const STATUS_META: Record<AvailabilityStatus, { label: string; color: string }> = {
  available: { label: "Available", color: "var(--status-available)" },
  busy: { label: "Busy", color: "var(--status-busy)" },
  in_meeting: { label: "In a Meeting", color: "var(--status-in-meeting)" },
  focus_time: { label: "Focus Time", color: "var(--status-focus-time)" },
  traveling: { label: "Traveling", color: "var(--status-traveling)" },
  offline: { label: "Offline", color: "var(--status-offline)" },
};

/** Display order: most available first, least available last. */
export const STATUS_ORDER: AvailabilityStatus[] = [
  "available",
  "in_meeting",
  "focus_time",
  "busy",
  "traveling",
  "offline",
];

export function statusMeta(status: string | null | undefined) {
  return STATUS_META[(status ?? "offline") as AvailabilityStatus] ?? STATUS_META.offline;
}
