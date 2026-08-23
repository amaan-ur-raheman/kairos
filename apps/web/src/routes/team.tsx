import { useAuth } from "@clerk/tanstack-react-start";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { ErrorStrip, Skeleton } from "@/components/states";
import { orpc } from "@/utils/orpc";
import { STATUS_ORDER, statusMeta } from "@/utils/status";

export const Route = createFileRoute("/team")({
  component: TeamPage,
});

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function localTime(tz?: string | null) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: tz || undefined,
    }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(
      new Date(),
    );
  }
}

function utcOffset(tz?: string | null) {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz || undefined,
      timeZoneName: "shortOffset",
    });
    return (
      fmt
        .formatToParts(new Date())
        .find((p) => p.type === "timeZoneName")
        ?.value.replace("GMT", "UTC") ?? "UTC"
    );
  } catch {
    return "UTC";
  }
}

type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  jobRole: string | null;
  timezone: string;
  skills: string[];
};

function SkeletonRows() {
  return (
    <div role="status" aria-label="Loading team" className="page-team">
      <Skeleton className="h-2.5 w-40" />
      <Skeleton className="h-9 w-56 mt-2" />
      <Skeleton className="h-4 w-[56ch] max-w-full mt-3" />
      <Skeleton className="h-4 w-72 max-w-full mt-1.5" />
      <div className="section-rule">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-16 ml-auto" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static/derived list, never reordered
          <div key={i} className="member-card">
            <Skeleton className="w-[46px] h-[46px] rounded-full shrink-0" />
            <div className="flex-1 space-y-2 min-w-0">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="text-right space-y-1.5">
              <Skeleton className="h-4 w-14 ml-auto" />
              <Skeleton className="h-3 w-10 ml-auto" />
            </div>
          </div>
        ))}
      </div>
      <div className="section-rule">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-16 ml-auto" />
      </div>
      <div
        className="overflow-hidden rounded-xl border"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div
          className="flex gap-4 px-3 py-2 border-b"
          style={{ borderColor: "var(--color-border-strong)", background: "var(--paper-deep)" }}
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12 ml-6" />
          <Skeleton className="h-3 w-16 ml-auto" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static/derived list, never reordered
            key={i}
            className="flex items-center gap-4 px-3 py-3 border-b last:border-b-0"
            style={{ borderColor: "var(--color-border-subtle)" }}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0" style={{ width: "38%" }}>
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3.5 w-24 hidden sm:block" />
            <Skeleton className="h-3 w-20 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyTeam() {
  return (
    <div className="frame-empty text-center py-14">
      <div
        aria-hidden
        className="mx-auto mb-4 w-11 h-11 rounded-full border-[1.5px] border-dashed relative"
        style={{ borderColor: "var(--color-border-strong)" }}
      >
        <span
          className="absolute inset-3 rounded-full"
          style={{ background: "var(--paper-deep)" }}
        />
      </div>
      <h3 className="font-serif-display text-[17px] font-semibold">Nobody here yet</h3>
      <p
        className="text-[13px] mt-1 mb-4 mx-auto max-w-[36ch]"
        style={{ color: "var(--ink-muted)" }}
      >
        Invite teammates and their status will show up on this page automatically.
      </p>
      <button
        type="button"
        className="text-[13px] font-semibold hover:underline"
        style={{ color: "var(--ember)" }}
      >
        Invite your first teammate →
      </button>
    </div>
  );
}

function TeamPage() {
  const location = useLocation();
  const { orgId } = useAuth();
  const members = useQuery(orpc.members.list.queryOptions());
  const statuses = useQuery(orpc.availability.getForOrg.queryOptions());

  // When viewing a member detail (/team/$id), render the child route instead of the list
  if (location.pathname !== "/team") {
    return <Outlet />;
  }

  if (members.error || statuses.error) {
    return (
      <div className="page-team">
        <h1 className="font-serif-display font-semibold text-[34px] tracking-[-0.015em]">
          Who's around?
        </h1>
        <div className="frame-round mt-6 px-0">
          <ErrorStrip
            message="Couldn't load the team."
            onRetry={() =>
              [members, statuses].forEach((q) => {
                q.refetch();
              })
            }
          />
        </div>
      </div>
    );
  }

  if (members.isLoading || statuses.isLoading) {
    return <SkeletonRows />;
  }

  const list = members.data ?? [];
  if (members.data && list.length === 0) {
    return (
      <div className="page-team">
        <h1 className="font-serif-display text-[30px] font-semibold">Who's around?</h1>
        <div className="frame-round mt-6">
          <EmptyTeam />
        </div>
      </div>
    );
  }

  const statusMap = new Map((statuses.data ?? []).map((s) => [s.memberId, s]));
  const sorted = [...list].sort(
    (a, b) =>
      STATUS_ORDER.indexOf(statusMap.get(a.id)?.status ?? "offline") -
      STATUS_ORDER.indexOf(statusMap.get(b.id)?.status ?? "offline"),
  );

  const available = sorted.filter((m) => statusMap.get(m.id)?.status === "available");
  const rest = sorted.filter((m) => statusMap.get(m.id)?.status !== "available");
  const focused = rest.filter((m) =>
    ["focus_time", "in_meeting"].includes(statusMap.get(m.id)?.status ?? ""),
  ).length;

  const lede = (
    <p
      className="lede font-serif-display text-[16px] mt-2.5 max-w-[56ch]"
      style={{ color: "var(--ink-secondary)" }}
    >
      <b style={{ color: "var(--st-available)", fontWeight: 600 }}>
        {available.length} {available.length === 1 ? "teammate is" : "teammates are"} available
        right now.
      </b>{" "}
      {focused > 0 &&
        `${focused} ${focused === 1 ? "is" : "are"} heads-down in focus or meetings. `}
      {rest.length > 0 && `${rest.length} ${rest.length === 1 ? "is" : "are"} away.`}
    </p>
  );

  return (
    <div className="page-team">
      <span className="kicker">
        {orgId ? "Your workspace" : "Kairos"} ·{" "}
        {new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        })}
      </span>
      <h1 className="font-serif-display font-semibold text-[36px] tracking-[-0.015em] leading-[1.15] mt-1.5">
        Who's around?
      </h1>
      {lede}

      {/* ── Available now ── */}
      {available.length > 0 && (
        <>
          <div className="section-rule">
            <h2>Available now</h2>
            <span>{available.length} PEOPLE</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {available.map((m) => (
              <MemberCard key={m.id} member={m} note={statusMap.get(m.id)?.note ?? null} />
            ))}
          </div>
        </>
      )}

      {/* ── Focused & away ── */}
      {rest.length > 0 && (
        <>
          <div className="section-rule">
            <h2>Focused &amp; away</h2>
            <span>{rest.length} PEOPLE</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <caption className="sr-only">Teammates currently focused, busy, or away</caption>
              <thead>
                <tr>
                  <th scope="col" style={{ width: "38%" }}>
                    Member
                  </th>
                  <th scope="col" style={{ width: "24%" }}>
                    Status
                  </th>
                  <th scope="col" style={{ width: "22%" }}>
                    Note
                  </th>
                  <th scope="col">Local time</th>
                </tr>
              </thead>
              <tbody>
                {rest.map((m) => {
                  const st = statusMeta(statusMap.get(m.id)?.status);
                  const note = statusMap.get(m.id)?.note ?? null;
                  return (
                    <tr key={m.id}>
                      <td>
                        <Link to="/team/$id" params={{ id: m.id }} className="cell-person">
                          <span className="avatar-sm" style={{ background: st.color }}>
                            {initials(m.name)}
                            <i className="st-dot" style={{ background: st.color }} />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[13px] font-semibold truncate">
                              {m.name}
                            </span>
                            <span
                              className="block text-[11.5px] truncate"
                              style={{ color: "var(--ink-muted)" }}
                            >
                              {m.jobRole ?? m.email}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-2 text-[12.5px] font-medium">
                          <i className="w-2 h-2 rounded-full" style={{ background: st.color }} />
                          {st.label}
                        </span>
                      </td>
                      <td>
                        <span
                          className="font-serif-display italic text-[12.5px]"
                          style={{ color: "var(--ink-muted)" }}
                        >
                          {note ?? ""}
                        </span>
                      </td>
                      <td className="tz-cell">
                        {localTime(m.timezone)} · {utcOffset(m.timezone)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function MemberCard({ member: m, note }: { member: Member; note: string | null }) {
  return (
    <Link to="/team/$id" params={{ id: m.id }} className="member-card">
      <span className="avatar-lg relative shrink-0">
        {initials(m.name)}
        <i className="live-dot" style={{ background: "var(--st-available)" }} />
      </span>
      <span className="flex-1 min-w-0">
        <b className="block text-sm font-semibold">{m.name}</b>
        <span className="block text-xs truncate" style={{ color: "var(--ink-muted)" }}>
          {m.jobRole ?? m.email}
        </span>
        {note && (
          <span
            className="block font-serif-display italic text-xs mt-0.5 truncate"
            style={{ color: "var(--ink-muted)" }}
          >
            {note}
          </span>
        )}
      </span>
      <span className="text-right shrink-0">
        <b className="block font-mono text-[12.5px] font-normal">{localTime(m.timezone)}</b>
        <span className="text-[10.5px] font-mono" style={{ color: "var(--ink-muted)" }}>
          {utcOffset(m.timezone)}
        </span>
      </span>
    </Link>
  );
}
