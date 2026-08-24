import { Button } from "@kairos/ui/components/button";
import { Skeleton as SkeletonPrimitive } from "@kairos/ui/components/skeleton";

export function Skeleton({ className = "" }: { className?: string }) {
  return <SkeletonPrimitive className={`skeleton-kai rounded-lg ${className}`} />;
}

export function ErrorStrip({ message, onRetry }: { message?: string | null; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="my-3.5 flex items-center gap-[11px] rounded-lg border border-[#e5c4bd] bg-[#faeceb] px-3.5 py-2.5 text-[12.5px] text-[#8f2d28]"
    >
      <span aria-hidden>⚠</span>
      <span>
        <b className="font-semibold">{message ?? "Something went wrong."}</b> Check your connection
        and try again.
      </span>
      <Button
        type="button"
        variant="ghost"
        className="ml-auto p-0 text-[12.5px] font-semibold text-[var(--ember)] hover:underline"
        onClick={onRetry}
      >
        Retry
      </Button>
    </div>
  );
}

export function SaveBarError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-full bg-[var(--ink)] px-3 py-2 pl-[22px] pb-[max(0.5rem,env(safe-area-inset-bottom))] text-[var(--paper)] shadow-[0_12px_40px_rgba(43,38,32,0.35)] max-sm:left-4 max-sm:right-4 max-sm:translate-x-0 max-sm:justify-center max-sm:rounded-lg"
      role="alert"
    >
      <span className="font-serif-display text-[13px] italic text-[#f3b8ad]">
        Saving failed. Nothing was changed.
      </span>
      <Button
        type="button"
        variant="ghost"
        className="text-[12.5px] text-[#b8ad9e] hover:text-[var(--paper)]"
        onClick={onRetry}
      >
        Dismiss
      </Button>
      <Button
        type="button"
        className="rounded-full bg-[var(--ember)] px-5 py-[9px] text-[13px] font-semibold text-white hover:bg-[var(--ember-deep)]"
        onClick={onRetry}
      >
        Try again
      </Button>
    </div>
  );
}
