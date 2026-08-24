/** Shared calendar event shapes used by the route, grid views, and schedule view. */

export type SavedEvent = {
  id: string;
  title: string;
  startTime: string | Date;
  endTime: string | Date;
  color: string;
  recurrence: string;
  recurrenceDays: number[] | null;
  recurrenceInterval: number | null;
  recurrenceUntil: string | Date | null;
};

export type Occurrence = {
  ev: SavedEvent;
  start: Date;
  end: Date;
};
