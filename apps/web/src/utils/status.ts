/**
 * Web-specific status metadata: colors map to CSS variables defined in index.css.
 * Keys/labels/order come from @kairos/shared (single source shared with native).
 */

import {
  type AvailabilityStatus,
  normalizeStatus,
  STATUS_LABELS,
  STATUS_ORDER,
} from "@kairos/shared";

export const STATUS_META: Record<AvailabilityStatus, { label: string; color: string }> = {
  available: { label: STATUS_LABELS.available, color: "var(--status-available)" },
  busy: { label: STATUS_LABELS.busy, color: "var(--status-busy)" },
  in_meeting: { label: STATUS_LABELS.in_meeting, color: "var(--status-in-meeting)" },
  focus_time: { label: STATUS_LABELS.focus_time, color: "var(--status-focus-time)" },
  traveling: { label: STATUS_LABELS.traveling, color: "var(--status-traveling)" },
  offline: { label: STATUS_LABELS.offline, color: "var(--status-offline)" },
};

export { STATUS_ORDER };

export function statusMeta(status: string | null | undefined) {
  return STATUS_META[normalizeStatus(status)];
}
