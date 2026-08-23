import {
  type AvailabilityStatus,
  normalizeStatus,
  STATUS_LABELS,
  STATUS_ORDER,
} from "@kairos/shared";
import { Platform } from "react-native";

/** Ember palette — mirrors apps/web/src/index.css */
export const C = {
  paper: "#faf7f2",
  paperDeep: "#f3efe6",
  card: "#fffdf9",
  line: "#e8e2d6",
  lineStrong: "#d8d0c0",
  ink: "#2b2620",
  inkBody: "#57503f",
  inkMuted: "#6f6754",
  ember: "#c2410c",
  emberDeep: "#9a3412",
  emberSoft: "#fbe9dd",
  white: "#fffdf9",
  stAvailable: "#3f9142",
  stBusy: "#c93c37",
  stMeeting: "#b98212",
  stFocus: "#3b6fb5",
  stTraveling: "#7d55b5",
  stOffline: "#8a8271",
} as const;

/** Editorial serif for headings. Georgia on iOS, generic serif on Android.
 *  Upgrade path: load Source Serif 4 via @expo-google-fonts + expo-font. */
export const SERIF = Platform.OS === "ios" ? "Georgia" : "serif";

const STATUS_COLORS: Record<AvailabilityStatus, string> = {
  available: C.stAvailable,
  busy: C.stBusy,
  in_meeting: C.stMeeting,
  focus_time: C.stFocus,
  traveling: C.stTraveling,
  offline: C.stOffline,
};

export const STATUS_META: Record<AvailabilityStatus, { label: string; color: string }> =
  Object.fromEntries(
    Object.entries(STATUS_LABELS).map(([k, label]) => [
      k,
      { label, color: STATUS_COLORS[k as AvailabilityStatus] },
    ]),
  ) as Record<AvailabilityStatus, { label: string; color: string }>;

export { STATUS_ORDER };

/** Safe lookup with "offline" fallback for unknown status values. */
export function statusMeta(status: string | null | undefined) {
  return STATUS_META[normalizeStatus(status)];
}
