import { Button } from "@kairos/ui/components/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@kairos/ui/components/dialog";
import { Input } from "@kairos/ui/components/input";
import { Label } from "@kairos/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@kairos/ui/components/select";
import { useState } from "react";
import { TIME_OPTIONS } from "./constants";
import { compose, parseHM, shift } from "./date-utils";

export type DialogValues = {
  title: string;
  start: Date;
  end: Date;
  color: string;
  recurrence: string;
  recurrenceDays: number[];
  recurrenceInterval: number;
  recurrenceUntil: string;
};

export function EventDialog({
  mode,
  initial,
  prefill,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  mode: "create" | "edit";
  initial?: DialogValues;
  prefill?: { date: Date; start: string; end: string };
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (
    v: Omit<DialogValues, "start" | "end" | "recurrenceUntil"> & {
      start: string;
      end: string;
      recurrenceUntil: string | undefined;
    },
  ) => void;
}) {
  const toLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [dateStr, setDateStr] = useState(
    toLocalDateStr(initial?.start ?? prefill?.date ?? new Date()),
  );
  const [start, setStart] = useState(
    initial
      ? `${String(new Date(initial.start).getHours()).padStart(2, "0")}:${String(initial.start.getMinutes()).padStart(2, "0")}`
      : (prefill?.start ?? "09:00"),
  );
  const [end, setEnd] = useState(
    initial
      ? `${String(new Date(initial.end).getHours()).padStart(2, "0")}:${String(initial.end.getMinutes()).padStart(2, "0")}`
      : (prefill?.end ?? "10:00"),
  );
  const [color, setColor] = useState(initial?.color ?? "#3b6fb5");
  const [recurrence, setRecurrence] = useState<string>(initial?.recurrence ?? "none");
  const [recDays, setRecDays] = useState<number[]>(
    initial?.recurrenceDays ?? [
      (initial ? new Date(initial.start) : (prefill?.date ?? new Date())).getDay(),
    ],
  );
  const [recInterval, setRecInterval] = useState(initial?.recurrenceInterval ?? 1);
  const [recUntil, setRecUntil] = useState(initial?.recurrenceUntil ?? "");
  const invalid =
    !title.trim() ||
    parseHM(end) <= parseHM(start) ||
    (recurrence === "weekly" && recDays.length === 0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (invalid || pending) return;
    onSubmit({
      title: title.trim(),
      start: compose(dateStr ? new Date(`${dateStr}T00:00:00`) : new Date(), start).toISOString(),
      end: compose(dateStr ? new Date(`${dateStr}T00:00:00`) : new Date(), end).toISOString(),
      color,
      recurrence,
      recurrenceDays:
        recurrence === "weekly" ? recDays : recurrence === "weekdays" ? [1, 2, 3, 4, 5] : [],
      recurrenceInterval: recurrence === "weekly" ? recInterval : 1,
      recurrenceUntil: recUntil ? new Date(`${recUntil}T23:59:59`).toISOString() : undefined,
    });
  }

  const dayToggle = (n: number, label: string) => (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][n]}
      aria-pressed={recDays.includes(n)}
      onClick={() =>
        setRecDays((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]))
      }
      className="h-8 w-8 rounded-full border text-[11px] font-semibold transition-transform active:scale-[.97]"
      style={
        recDays.includes(n)
          ? { background: "var(--ember)", color: "#fff", borderColor: "var(--ember)" }
          : {
              background: "var(--card)",
              color: "var(--ink-secondary)",
              borderColor: "var(--color-border-strong)",
            }
      }
    >
      {label}
    </Button>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        className="max-h-[90vh] max-w-md overflow-y-auto rounded-lg border p-6"
        style={{ background: "var(--card)", borderColor: "var(--color-border)" }}
        showCloseButton={false}
      >
        <form onSubmit={submit}>
          <DialogHeader className="mb-5">
            <DialogTitle className="font-serif-display text-lg font-semibold">
              {mode === "edit" ? "Edit event" : "New event"}
            </DialogTitle>
          </DialogHeader>

          <Label
            className="mb-1.5 block text-xs font-semibold text-[var(--ink-secondary)]"
            htmlFor="ev-title"
          >
            Title
          </Label>
          <Input
            autoFocus
            id="ev-title"
            className="mb-4 w-full rounded-lg border-[var(--color-border-strong)] bg-[var(--card)] text-[13.5px] focus-visible:border-[var(--ember)] focus-visible:ring-[var(--ember-soft)]"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="College — Monday class…"
          />

          <Label
            className="mb-1.5 block text-xs font-semibold text-[var(--ink-secondary)]"
            htmlFor="ev-date"
          >
            Date
          </Label>
          <Input
            id="ev-date"
            type="date"
            className="mb-4 w-full rounded-lg border-[var(--color-border-strong)] bg-[var(--card)] text-[13.5px] focus-visible:border-[var(--ember)] focus-visible:ring-[var(--ember-soft)]"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <Label
                className="mb-1.5 block text-xs font-semibold text-[var(--ink-secondary)]"
                htmlFor="ev-start"
              >
                Start
              </Label>
              <Select value={start} onValueChange={(value) => value && setStart(value)}>
                <SelectTrigger
                  id="ev-start"
                  className="w-full rounded-lg border-[var(--color-border-strong)] bg-[var(--card)] text-[13.5px] focus-visible:border-[var(--ember)] focus-visible:ring-[var(--ember-soft)]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label
                className="mb-1.5 block text-xs font-semibold text-[var(--ink-secondary)]"
                htmlFor="ev-end"
              >
                End
              </Label>
              <Select value={end} onValueChange={(value) => value && setEnd(value)}>
                <SelectTrigger
                  id="ev-end"
                  className="w-full rounded-lg border-[var(--color-border-strong)] bg-[var(--card)] text-[13.5px] focus-visible:border-[var(--ember)] focus-visible:ring-[var(--ember-soft)]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {parseHM(end) <= parseHM(start) && (
            <p className="text-xs mb-3" style={{ color: "var(--status-busy)" }}>
              End must be after start.
            </p>
          )}

          {/* recurrence */}
          <Label
            className="mb-1.5 block text-xs font-semibold text-[var(--ink-secondary)]"
            htmlFor="ev-recurrence"
          >
            Repeats
          </Label>
          <Select value={recurrence} onValueChange={(value) => value && setRecurrence(value)}>
            <SelectTrigger
              id="ev-recurrence"
              className="mb-3 w-full rounded-lg border-[var(--color-border-strong)] bg-[var(--card)] text-[13.5px] focus-visible:border-[var(--ember)] focus-visible:ring-[var(--ember-soft)]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                ["none", "Does not repeat"],
                ["daily", "Daily"],
                ["weekdays", "Every weekday (Mon-Fri)"],
                ["weekly", "Weekly"],
                ["monthly", "Monthly"],
                ["yearly", "Yearly"],
              ].map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {recurrence === "weekly" && (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                  Every
                </span>
                <Select
                  value={String(recInterval)}
                  onValueChange={(value) => value && setRecInterval(Number(value))}
                >
                  <SelectTrigger className="w-[70px] rounded-lg border-[var(--color-border-strong)] bg-[var(--card)] px-2.5 py-[5px] text-[13.5px] focus-visible:border-[var(--ember)] focus-visible:ring-[var(--ember-soft)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 6].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                  {recInterval === 1 ? "week on" : "weeks on"}
                </span>
              </div>
              <div className="flex gap-1.5">
                {["S", "M", "T", "W", "T", "F", "S"].map((label, n) => dayToggle(n, label))}
              </div>
            </div>
          )}

          <Label
            className="mb-1.5 block text-xs font-semibold text-[var(--ink-secondary)]"
            htmlFor="ev-ends"
          >
            Ends
          </Label>
          <div className="flex items-center gap-2 mb-4">
            <Select
              value={recUntil ? "on" : "never"}
              onValueChange={(value) => {
                if (value === "never") setRecUntil("");
                else setRecUntil(toLocalDateStr(shift(new Date(), 90)));
              }}
            >
              <SelectTrigger
                id="ev-ends"
                className="w-[110px] rounded-lg border-[var(--color-border-strong)] bg-[var(--card)] text-[13.5px] focus-visible:border-[var(--ember)] focus-visible:ring-[var(--ember-soft)]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Forever</SelectItem>
                <SelectItem value="on">On date</SelectItem>
              </SelectContent>
            </Select>
            {recUntil && (
              <Input
                type="date"
                className="w-full rounded-lg border-[var(--color-border-strong)] bg-[var(--card)] text-[13.5px] focus-visible:border-[var(--ember)] focus-visible:ring-[var(--ember-soft)]"
                value={recUntil}
                onChange={(e) => setRecUntil(e.target.value)}
              />
            )}
          </div>

          <fieldset
            className="flex items-center gap-2 mb-6 border-0 p-0 m-0"
            aria-label="Event color"
          >
            {(
              [
                ["#c93c37", "Red"],
                ["#b98212", "Amber"],
                ["#3f9142", "Green"],
                ["#3b6fb5", "Blue"],
                ["#7d55b5", "Purple"],
                ["#2b2620", "Ink"],
              ] as const
            ).map(([c, name]) => (
              <Button
                key={c}
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`${name} color`}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
                className="h-6 w-6 rounded-full transition-transform active:scale-[.97]"
                style={{
                  background: c,
                  boxShadow:
                    color === c ? "0 0 0 2px var(--paper), 0 0 0 4px var(--ember)" : "none",
                }}
              />
            ))}
          </fieldset>

          {error && (
            <p className="text-xs mb-3" style={{ color: "var(--status-busy)" }}>
              {error}
            </p>
          )}
          {recurrence !== "none" && (
            <p className="text-[11px] mb-3" style={{ color: "var(--ink-muted)" }}>
              {mode === "edit"
                ? "Edits apply to every occurrence in the series."
                : "One entry — Kairos expands the series automatically."}
            </p>
          )}

          <div className="flex justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              className="border border-[var(--color-border-strong)] bg-transparent text-[var(--ink-secondary)] hover:bg-[var(--paper-deep)]"
              style={{
                background: "transparent",
                color: "var(--ink-secondary)",
                border: "1px solid var(--color-border-strong)",
              }}
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[var(--ember)] text-white hover:bg-[var(--ember-deep)]"
              disabled={invalid || pending}
              style={{ opacity: invalid || pending ? 0.5 : 1 }}
            >
              {pending ? "Saving…" : mode === "edit" ? "Save changes" : "Create event"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
