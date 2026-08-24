import { useEffect, useRef, useState } from "react";
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
  const titleRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  // Capture the trigger element once on open, focus the title
  useEffect(() => {
    prevFocusRef.current = document.activeElement as HTMLElement | null;
    titleRef.current?.focus();
  }, []);

  // Restore focus to the trigger on close
  useEffect(
    () => () => {
      prevFocusRef.current?.focus?.();
    },
    [],
  );

  // Escape closes
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  // Focus trap — keep Tab cycling inside the dialog
  function trapTab(e: React.KeyboardEvent) {
    if (e.key !== "Tab" || !overlayRef.current) return;
    const focusables = overlayRef.current.querySelectorAll<HTMLElement>(
      'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

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
    <button
      type="button"
      aria-label={["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][n]}
      aria-pressed={recDays.includes(n)}
      onClick={() =>
        setRecDays((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]))
      }
      className={`w-8 h-8 rounded-full text-[11px] font-semibold border press-scale`}
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
    </button>
  );

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 grid place-items-center p-4"
      style={{ background: "rgba(43,38,32,.35)", overscrollBehavior: "contain" }}
      role="dialog"
      aria-modal
      aria-label={mode === "edit" ? "Edit event" : "New event"}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      onKeyDown={trapTab}
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation prevents overlay click-away dismiss */}
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-xl border p-6 max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--card)", borderColor: "var(--color-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-serif-display text-lg font-semibold mb-5">
          {mode === "edit" ? "Edit event" : "New event"}
        </h2>

        <label className="field-label" htmlFor="ev-title">
          Title
        </label>
        <input
          ref={titleRef}
          id="ev-title"
          className="input-paper mb-4"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="College — Monday class…"
        />

        <label className="field-label" htmlFor="ev-date">
          Date
        </label>
        <input
          id="ev-date"
          type="date"
          className="input-paper mb-4"
          value={dateStr}
          onChange={(e) => setDateStr(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="field-label" htmlFor="ev-start">
              Start
            </label>
            <select
              id="ev-start"
              className="input-paper"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="ev-end">
              End
            </label>
            <select
              id="ev-end"
              className="input-paper"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {parseHM(end) <= parseHM(start) && (
          <p className="text-xs mb-3" style={{ color: "var(--status-busy)" }}>
            End must be after start.
          </p>
        )}

        {/* recurrence */}
        <label className="field-label" htmlFor="ev-recurrence">
          Repeats
        </label>
        <select
          id="ev-recurrence"
          className="input-paper mb-3"
          value={recurrence}
          onChange={(e) => setRecurrence(e.target.value)}
        >
          <option value="none">Does not repeat</option>
          <option value="daily">Daily</option>
          <option value="weekdays">Every weekday (Mon-Fri)</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>

        {recurrence === "weekly" && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                Every
              </span>
              <select
                className="input-paper"
                style={{ width: 70, padding: "5px 10px" }}
                value={recInterval}
                onChange={(e) => setRecInterval(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 6].map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? "1" : n}
                  </option>
                ))}
              </select>
              <span className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                {recInterval === 1 ? "week on" : "weeks on"}
              </span>
            </div>
            <div className="flex gap-1.5">
              {["S", "M", "T", "W", "T", "F", "S"].map((label, n) => dayToggle(n, label))}
            </div>
          </div>
        )}

        <label className="field-label" htmlFor="ev-ends">
          Ends
        </label>
        <div className="flex items-center gap-2 mb-4">
          <select
            id="ev-ends"
            className="input-paper"
            style={{ width: 110 }}
            value={recUntil ? "on" : "never"}
            onChange={(e) => {
              if (e.target.value === "never") setRecUntil("");
              else setRecUntil(toLocalDateStr(shift(new Date(), 90)));
            }}
          >
            <option value="never">Forever</option>
            <option value="on">On date</option>
          </select>
          {recUntil && (
            <input
              type="date"
              className="input-paper"
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
            <button
              key={c}
              type="button"
              aria-label={`${name} color`}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              className="w-6 h-6 rounded-full press-scale"
              style={{
                background: c,
                boxShadow: color === c ? "0 0 0 2px var(--paper), 0 0 0 4px var(--ember)" : "none",
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
          <button
            type="button"
            className="btn-ink"
            style={{
              background: "transparent",
              color: "var(--ink-secondary)",
              border: "1px solid var(--color-border-strong)",
            }}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-ember"
            disabled={invalid || pending}
            style={{ opacity: invalid || pending ? 0.5 : 1 }}
          >
            {pending ? "Saving…" : mode === "edit" ? "Save changes" : "Create event"}
          </button>
        </div>
      </form>
    </div>
  );
}
