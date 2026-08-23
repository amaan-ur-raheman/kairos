export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton-kai rounded-lg ${className}`} />;
}

export function ErrorStrip({ message, onRetry }: { message?: string | null; onRetry: () => void }) {
  return (
    <div role="alert" className="error-strip">
      <span aria-hidden>⚠</span>
      <span>
        <b>{message ?? "Something went wrong."}</b> Check your connection and try again.
      </span>
      <button type="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

export function SaveBarError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="save-bar-fixed" role="alert">
      <span className="dirty-note" style={{ color: "#f3b8ad" }}>
        Saving failed. Nothing was changed.
      </span>
      <button type="button" className="discard-btn" onClick={onRetry}>
        Dismiss
      </button>
      <button type="button" className="save-btn-ember" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
