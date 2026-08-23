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

export const STATUS_META: Record<string, { label: string; color: string }> = {
  available: { label: "Available", color: C.stAvailable },
  busy: { label: "Busy", color: C.stBusy },
  in_meeting: { label: "In a Meeting", color: C.stMeeting },
  focus_time: { label: "Focus Time", color: C.stFocus },
  traveling: { label: "Traveling", color: C.stTraveling },
  offline: { label: "Offline", color: C.stOffline },
};

export const STATUS_ORDER = [
  "available",
  "in_meeting",
  "focus_time",
  "busy",
  "traveling",
  "offline",
];
