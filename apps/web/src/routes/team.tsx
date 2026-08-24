import { useClerk } from "@clerk/tanstack-react-start";
import { Avatar, AvatarBadge, AvatarFallback } from "@kairos/ui/components/avatar";
import { Badge } from "@kairos/ui/components/badge";
import { Button, buttonVariants } from "@kairos/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@kairos/ui/components/empty";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@kairos/ui/components/table";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { ProfileIdentity } from "@/components/profile-identity";
import { ErrorStrip, Skeleton } from "@/components/states";
import { orpc } from "@/utils/orpc";
import { STATUS_ORDER, statusMeta } from "@/utils/status";

export const Route = createFileRoute("/team")({
  component: TeamPage,
});

const teamPageClass =
  "mx-auto w-full max-w-[920px] px-4 pb-[60px] pt-6 sm:px-[30px] sm:pb-[70px] sm:pt-[34px]";
const sectionRuleClass =
  "my-[34px] flex items-baseline gap-3 after:h-px after:flex-1 after:bg-[var(--color-border-strong)]";
const memberCardClass =
  "flex items-center gap-3.5 rounded-lg border border-[var(--color-border)] bg-[var(--card)] px-[17px] py-[15px] no-underline shadow-[var(--shadow-xs)] transition-transform hover:-translate-y-px hover:border-[var(--color-border-strong)]";

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
    <div role="status" aria-label="Loading team" className={teamPageClass}>
      <Skeleton className="h-2.5 w-40" />
      <Skeleton className="h-9 w-56 mt-2" />
      <Skeleton className="h-4 w-[56ch] max-w-full mt-3" />
      <Skeleton className="h-4 w-72 max-w-full mt-1.5" />
      <div className={sectionRuleClass}>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-16 ml-auto" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static/derived list, never reordered
          <div key={i} className={memberCardClass}>
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
      <div className={sectionRuleClass}>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-16 ml-auto" />
      </div>
      <div
        className="overflow-hidden rounded-lg border"
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
  const clerk = useClerk();
  return (
    <Empty className="frame-empty py-14">
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="mb-4 size-11 rounded-full border-[1.5px] border-dashed"
        >
          <span className="size-5 rounded-full" style={{ background: "var(--paper-deep)" }} />
        </EmptyMedia>
        <EmptyTitle className="font-serif-display text-[17px]">Nobody here yet</EmptyTitle>
        <EmptyDescription className="max-w-[36ch] text-[13px]">
          Invite teammates and their status will show up on this page automatically.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          type="button"
          variant="link"
          className="text-[13px] font-semibold hover:underline"
          style={{ color: "var(--ember)" }}
          onClick={() => clerk.openOrganizationProfile()}
        >
          Invite your first teammate →
        </Button>
      </EmptyContent>
    </Empty>
  );
}

function TeamPage() {
  const location = useLocation();
  const members = useQuery(orpc.members.list.queryOptions());
  const statuses = useQuery(orpc.availability.getForOrg.queryOptions());

  // When viewing a member detail (/team/$id), render the child route instead of the list
  if (location.pathname !== "/team") {
    return <Outlet />;
  }

  if (members.error || statuses.error) {
    return (
      <div className={teamPageClass}>
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
      <div className={teamPageClass}>
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
    <p className="mt-2.5 max-w-[56ch] font-serif-display text-[16px] [&_b]:font-semibold [&_b]:text-[var(--status-available)]">
      <span style={{ color: "var(--st-available)", fontWeight: 600 }}>
        {available.length} {available.length === 1 ? "teammate is" : "teammates are"} available
      </span>
      {focused > 0 && (
        <>
          {" · "}
          <span style={{ color: "var(--status-in-meeting)", fontWeight: 600 }}>
            {focused} {focused === 1 ? "is" : "are"} focused
          </span>
        </>
      )}
      {rest.length > 0 && (
        <>
          {" · "}
          <span style={{ color: "var(--ink-muted)", fontWeight: 600 }}>
            {rest.length} {rest.length === 1 ? "is" : "are"} away
          </span>
        </>
      )}
    </p>
  );

  return (
    <div className={teamPageClass}>
      <span
        className="block font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ember)]"
        suppressHydrationWarning
      >
        {members.data?.[0]?.organizationId ? "Kairos" : "Your team"} ·{" "}
        {new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        })}
      </span>
      <h1 className="text-balance font-serif-display font-semibold text-[36px] tracking-[-0.015em] leading-[1.15] mt-1.5">
        Who's around?
      </h1>
      <div className="text-pretty">{lede}</div>

      {/* ── Available now ── */}
      {available.length > 0 && (
        <>
          <div className={sectionRuleClass}>
            <h2 className="font-serif-display text-[17px] font-semibold text-[var(--ink)]">
              Available now
            </h2>
            <span className="font-mono text-[11px] text-[var(--ink-muted)]">
              {available.length} PEOPLE
            </span>
          </div>
          <div className={`grid gap-3 ${available.length > 1 ? "md:grid-cols-2" : "max-w-2xl"}`}>
            {available.map((m) => (
              <MemberCard key={m.id} member={m} note={statusMap.get(m.id)?.note ?? null} />
            ))}
          </div>
        </>
      )}

      {/* ── Focused & away ── */}
      <div className={sectionRuleClass}>
        <h2 className="font-serif-display text-[17px] font-semibold text-[var(--ink)]">
          Focused &amp; away
        </h2>
        <span className="font-mono text-[11px] text-[var(--ink-muted)]">{rest.length} PEOPLE</span>
      </div>
      {rest.length > 0 ? (
        <div className="overflow-x-auto">
          <Table className="min-w-[480px]">
            <TableCaption className="sr-only">
              Teammates currently focused, busy, or away
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[38%] border-b border-[var(--color-border-strong)] px-2.5 py-[9px] font-mono text-left text-[9.5px] font-medium uppercase tracking-[0.13em] text-[var(--ink-muted)]">
                  Member
                </TableHead>
                <TableHead className="w-[24%] border-b border-[var(--color-border-strong)] px-2.5 py-[9px] font-mono text-left text-[9.5px] font-medium uppercase tracking-[0.13em] text-[var(--ink-muted)]">
                  Status
                </TableHead>
                <TableHead className="w-[22%] border-b border-[var(--color-border-strong)] px-2.5 py-[9px] font-mono text-left text-[9.5px] font-medium uppercase tracking-[0.13em] text-[var(--ink-muted)]">
                  Note
                </TableHead>
                <TableHead className="border-b border-[var(--color-border-strong)] px-2.5 py-[9px] font-mono text-left text-[9.5px] font-medium uppercase tracking-[0.13em] text-[var(--ink-muted)]">
                  Local time
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rest.map((m) => {
                const st = statusMeta(statusMap.get(m.id)?.status);
                const note = statusMap.get(m.id)?.note ?? null;
                return (
                  <TableRow key={m.id}>
                    <TableCell className="border-b border-[var(--color-border-subtle)] px-2.5 py-3 align-middle">
                      <Link
                        to="/team/$id"
                        params={{ id: m.id }}
                        className="flex items-center gap-[11px] text-inherit no-underline"
                      >
                        <Avatar
                          size="sm"
                          className="size-8 border border-[var(--color-border-strong)] bg-[var(--paper-deep)]"
                        >
                          <AvatarFallback className="text-[11px] font-semibold text-[var(--ink-secondary)]">
                            {initials(m.name)}
                          </AvatarFallback>
                          <AvatarBadge
                            className="size-2.5 bg-[var(--paper)] ring-2 ring-[var(--paper)]"
                            style={{ background: st.color }}
                          />
                        </Avatar>
                        <span className="min-w-0">
                          <span className="block text-[13px] font-semibold truncate">{m.name}</span>
                          <span
                            className="block text-[11.5px] truncate"
                            style={{ color: "var(--ink-muted)" }}
                          >
                            {m.jobRole ?? m.email}
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="border-b border-[var(--color-border-subtle)] px-2.5 py-3 align-middle">
                      <Badge variant="outline" className="gap-2 text-[12.5px] font-medium">
                        <i className="w-2 h-2 rounded-full" style={{ background: st.color }} />
                        {st.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="border-b border-[var(--color-border-subtle)] px-2.5 py-3 align-middle">
                      <span
                        className="font-serif-display italic text-[12.5px]"
                        style={{ color: "var(--ink-muted)" }}
                      >
                        {note ?? ""}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-[11.5px] text-[var(--ink-secondary)]">
                      {localTime(m.timezone)} · {utcOffset(m.timezone)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 py-4">
          <p className="m-0 text-[13px]" style={{ color: "var(--ink-muted)" }}>
            Everyone's available right now.
          </p>
          <Link to="/calendar" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Open calendar
          </Link>
        </div>
      )}
    </div>
  );
}

function MemberCard({ member: m, note }: { member: Member; note: string | null }) {
  return (
    <Link to="/team/$id" params={{ id: m.id }} className={memberCardClass}>
      <ProfileIdentity
        name={m.name}
        secondary={m.jobRole ?? m.email}
        tertiary={note}
        statusColor="var(--st-available)"
        avatarClassName="border border-[var(--color-border-strong)] bg-[var(--paper-deep)]"
        fallbackClassName="text-[var(--ink-secondary)]"
        className="flex-1"
      />
      <span className="text-right shrink-0">
        <b className="block font-mono text-[12.5px] font-normal">{localTime(m.timezone)}</b>
        <span className="text-[10.5px] font-mono" style={{ color: "var(--ink-muted)" }}>
          {utcOffset(m.timezone)}
        </span>
      </span>
    </Link>
  );
}
