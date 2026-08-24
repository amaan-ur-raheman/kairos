import { recurrenceLabel } from "@kairos/api/lib/recurrence";
import { fmt12 } from "@/components/calendar/date-utils";
import type { Occurrence } from "@/components/calendar/types";

/**
 * Event detail popover — fixed to the viewport, clamped so it never renders
 * off-screen. Single shared instance for every calendar view.
 */
export function EventPopover({
  occ,
  x,
  y,
  deletePending,
  onClose,
  onEdit,
  onDelete,
}: {
  occ: Occurrence;
  x: number;
  y: number;
  deletePending: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: click-away backdrop overlay
    <div
      className="fixed inset-0 z-40"
      role="presentation"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-popover-panel]")) return;
        onClose();
      }}
    >
      <div
        data-popover-panel
        role="dialog"
        aria-label={`Details for ${occ.ev.title}`}
        className="fixed rounded-xl border p-4 w-56 sm:w-64"
        style={{
          background: "var(--card)",
          borderColor: "var(--color-border)",
          boxShadow: "var(--shadow-lg)",
          left: Math.max(8, Math.min(x, window.innerWidth - (window.innerWidth < 640 ? 240 : 280))),
          top: Math.max(8, Math.min(y + 8, window.innerHeight - 200)),
        }}
      >
        <div className="flex items-start gap-2">
          <i
            className="inline-block w-2.5 h-2.5 rounded-full mt-1 shrink-0"
            style={{ background: occ.ev.color }}
          />
          <div>
            <b className="block font-serif-display text-[15px] font-semibold">{occ.ev.title}</b>
            <span className="text-xs block mt-1" style={{ color: "var(--ink-secondary)" }}>
              {occ.start.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}{" "}
              · {fmt12(occ.start.getHours(), occ.start.getMinutes())} –{" "}
              {fmt12(occ.end.getHours(), occ.end.getMinutes())}
            </span>
            {occ.ev.recurrence !== "none" && (
              <span className="text-xs block mt-1" style={{ color: "var(--ink-muted)" }}>
                ↻ {recurrenceLabel(occ.ev)}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            className="btn-ink flex-1 justify-center"
            style={{ padding: "8px 0" }}
            onClick={onEdit}
          >
            Edit
          </button>
          <button
            type="button"
            className="ghost-btn flex-1"
            style={{ color: "var(--status-busy)" }}
            onClick={onDelete}
          >
            {deletePending ? "…" : "Delete"}
          </button>
        </div>
        {occ.ev.recurrence !== "none" && (
          <p className="text-[10.5px] mt-3" style={{ color: "var(--ink-muted)" }}>
            Changes apply to the whole series.
          </p>
        )}
      </div>
    </div>
  );
}
