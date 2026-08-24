import { useClerk } from "@clerk/tanstack-react-start";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@kairos/ui/components/alert-dialog";
import { Button } from "@kairos/ui/components/button";
import { Input } from "@kairos/ui/components/input";
import { Label } from "@kairos/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@kairos/ui/components/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@kairos/ui/components/select";
import { Switch } from "@kairos/ui/components/switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ProfileIdentity } from "@/components/profile-identity";
import { SaveBarError, Skeleton } from "@/components/states";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DEFAULT_HOURS = [
  { dayOfWeek: 0, startTime: "00:00", endTime: "00:00", isWorkingDay: false },
  ...[1, 2, 3, 4, 5].map((d) => ({
    dayOfWeek: d,
    startTime: "09:00",
    endTime: "17:00",
    isWorkingDay: true,
  })),
  { dayOfWeek: 6, startTime: "00:00", endTime: "00:00", isWorkingDay: false },
];

const STATUS_OPTIONS = [
  {
    value: "available",
    label: "Available",
    desc: "open for chats & calls",
    dot: "var(--st-available)",
  },
  { value: "busy", label: "Busy", desc: "do not disturb", dot: "var(--status-busy)" },
  {
    value: "in_meeting",
    label: "In a Meeting",
    desc: "back after this one",
    dot: "var(--status-in-meeting)",
  },
  {
    value: "focus_time",
    label: "Focus Time",
    desc: "heads-down, async only",
    dot: "var(--status-focus-time)",
  },
  {
    value: "traveling",
    label: "Traveling",
    desc: "reaching me is slow",
    dot: "var(--status-traveling)",
  },
  { value: "offline", label: "Offline", desc: "away from work", dot: "var(--status-offline)" },
] as const;

const TIME_OPTIONS: string[] = [];
for (let h = 0; h <= 23; h++) {
  for (const m of [0, 30]) {
    if ((h === 0 && m === 0) || (h === 23 && m === 30)) continue;
    TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:${m === 0 ? "00" : "30"}`);
  }
}

const TIMEZONES: string[] = (() => {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    // Fallback for browsers without Intl.supportedValuesOf
    return [
      "UTC",
      "Europe/London",
      "Europe/Berlin",
      "America/New_York",
      "America/Chicago",
      "America/Los_Angeles",
      "Asia/Dubai",
      "Asia/Kolkata",
      "Asia/Singapore",
      "Asia/Tokyo",
      "Australia/Sydney",
    ];
  }
})();

function expiryToDate(choice: string): string | undefined {
  const now = new Date();
  if (choice === "today") {
    const d = new Date(now);
    d.setHours(17, 0, 0, 0);
    if (d <= now) d.setDate(d.getDate() + 1);
    return d.toISOString();
  }
  if (choice === "2h") return new Date(now.getTime() + 2 * 3600_000).toISOString();
  if (choice === "tomorrow") {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.toISOString();
  }
  return undefined;
}

function TimeSelect({
  value,
  onValueChange,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(next) => next && onValueChange(next)}>
      <SelectTrigger
        className={
          className ??
          "w-[92px] rounded-lg border-[var(--color-border-strong)] bg-[var(--card)] text-[12px] text-[var(--ink-secondary)] hover:bg-[var(--paper-deep)]"
        }
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TIME_OPTIONS.map((time) => (
          <SelectItem key={time} value={time}>
            {time}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SettingsPage() {
  const queryClient = useQueryClient();
  const clerk = useClerk();

  const meQuery = useQuery(orpc.members.me.queryOptions());
  const me = meQuery.data;
  const hoursQuery = useQuery(
    orpc.availability.getWorkingHours.queryOptions({ input: {}, enabled: !!me }),
  );
  const statuses = useQuery(orpc.availability.getForOrg.queryOptions());
  const myStatus = statuses.data?.find((s) => s.memberId === me?.id);

  /* ── draft state ── */
  const savedHours = useMemo(() => {
    const rows = hoursQuery.data ?? [];
    return rows.length > 0 ? rows : null;
  }, [hoursQuery.data]);

  const [hours, setHours] = useState(DEFAULT_HOURS);
  useEffect(() => {
    if (savedHours) setHours(savedHours.map((h) => ({ ...h })));
  }, [savedHours]);

  const [jobRole, setJobRole] = useState("");
  const [timezone, setTimezone] = useState("");
  const [seededProfile, setSeededProfile] = useState(false);
  useEffect(() => {
    if (me && !seededProfile) {
      setJobRole(me.jobRole ?? "");
      setTimezone(me.timezone ?? "UTC");
      setSeededProfile(true);
    }
  }, [me, seededProfile]);

  const [status, setStatus] = useState("available");
  const [note, setNote] = useState("");
  const [expiry, setExpiry] = useState("never");
  const [discardOpen, setDiscardOpen] = useState(false);
  useEffect(() => {
    if (myStatus) {
      setStatus(myStatus.status);
      setNote(myStatus.note ?? "");
    }
  }, [myStatus]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: orpc.members.me.key() });
    queryClient.invalidateQueries({ queryKey: orpc.availability.getWorkingHours.key() });
    queryClient.invalidateQueries({ queryKey: orpc.availability.getForOrg.key() });
  };

  const updateProfile = useMutation(
    orpc.members.updateProfile.mutationOptions({
      onSuccess: () => {
        toast.success("Profile saved");
        invalidateAll();
      },
    }),
  );
  const saveHours = useMutation(
    orpc.availability.setWorkingHours.mutationOptions({
      onSuccess: () => {
        toast.success("Working hours updated");
        invalidateAll();
      },
    }),
  );
  const setStatusMutation = useMutation(
    orpc.availability.setStatus.mutationOptions({
      onSuccess: () => {
        toast.success("Status updated");
        invalidateAll();
        setExpiry("never"); // expiry is consumed once saved
      },
    }),
  );

  const profileDirty =
    !!me && (jobRole !== (me.jobRole ?? "") || timezone !== (me.timezone ?? "UTC"));
  const hoursDirty = savedHours
    ? JSON.stringify(hours) !== JSON.stringify(savedHours)
    : JSON.stringify(hours) !== JSON.stringify(DEFAULT_HOURS);
  const statusChanged =
    !!myStatus &&
    (status !== myStatus.status || note !== (myStatus.note ?? "") || expiry !== "never");
  const anyDirty = profileDirty || hoursDirty || statusChanged;

  const saveError = updateProfile.error ?? saveHours.error ?? setStatusMutation.error;

  function handleSave() {
    let chain: Promise<unknown> = Promise.resolve();
    if (statusChanged) {
      chain = chain.then(() =>
        setStatusMutation.mutateAsync({
          status: status as
            | "available"
            | "busy"
            | "in_meeting"
            | "focus_time"
            | "traveling"
            | "offline",
          note: note.trim() || undefined,
          expiresAt: expiryToDate(expiry),
        }),
      );
    }
    if (profileDirty) {
      chain = chain.then(() =>
        updateProfile.mutateAsync({
          id: me!.id,
          jobRole: jobRole.trim() || undefined,
          timezone,
        }),
      );
    }
    if (hoursDirty) {
      chain = chain.then(() => saveHours.mutateAsync({ hours }));
    }
    void chain
      .then(() => {
        // reseed drafts from what the server now says
        queryClient.invalidateQueries({ queryKey: orpc.members.me.key() });
        queryClient.invalidateQueries({ queryKey: orpc.availability.getWorkingHours.key() });
        queryClient.invalidateQueries({ queryKey: orpc.availability.getForOrg.key() });
        setSeededProfile(false);
      })
      .catch(() => {});
  }

  function discard() {
    setDiscardOpen(true);
  }

  function confirmDiscard() {
    setDiscardOpen(false);
    setStatus(myStatus?.status ?? "available");
    setNote(myStatus?.note ?? "");
    setExpiry("never");
    if (me) {
      setJobRole(me.jobRole ?? "");
      setTimezone(me.timezone ?? "UTC");
    }
    if (savedHours) setHours(savedHours.map((h) => ({ ...h })));
    else setHours(DEFAULT_HOURS);
    [setStatusMutation, updateProfile, saveHours].forEach((m) => {
      m.reset();
    });
  }

  function copyMonday() {
    const mon = hours.find((x) => x.dayOfWeek === 1);
    if (!mon) return;
    setHours((prev) =>
      prev.map((x) =>
        [2, 3, 4, 5].includes(x.dayOfWeek)
          ? { ...x, startTime: mon.startTime, endTime: mon.endTime, isWorkingDay: true }
          : x,
      ),
    );
  }

  if (meQuery.isLoading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div
          className="mx-auto max-w-[730px] px-4 pb-[100px] pt-6 sm:px-8 sm:pb-[140px] sm:pt-11"
          aria-label="Loading settings"
          role="status"
        >
          <header className="mb-9 sm:mb-[52px]">
            <Skeleton className="h-[10px] w-36" />
            <Skeleton className="h-[34px] w-32 mt-2" />
          </header>

          {/* Profile skeleton */}
          <section className="mt-10 border-t border-[var(--color-border-subtle)] pt-6 sm:mt-16 sm:pt-8">
            <div className="mb-1 flex items-baseline gap-3.5 border-b border-[var(--color-border-strong)] pb-3.5">
              <Skeleton className="h-5 w-20" />
            </div>
            <div className="grid grid-cols-1 items-start gap-2.5 border-b border-[var(--color-border-subtle)] px-0 py-4 sm:grid-cols-[200px_1fr] sm:gap-7 sm:px-1 sm:py-[22px]">
              <div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-28 mt-2" />
              </div>
              <div className="flex w-full flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Skeleton className="w-11 h-11 rounded-full shrink-0" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <Skeleton className="h-8 w-[88px] rounded-lg shrink-0" />
              </div>
            </div>
            <div className="grid grid-cols-1 items-start gap-2.5 border-b border-[var(--color-border-subtle)] px-0 py-4 sm:grid-cols-[200px_1fr] sm:gap-7 sm:px-1 sm:py-[22px]">
              <div>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-24 mt-2" />
              </div>
              <Skeleton className="h-10 w-full max-w-[280px]" />
            </div>
            <div className="grid grid-cols-1 items-start gap-2.5 border-b border-[var(--color-border-subtle)] px-0 py-4 sm:grid-cols-[200px_1fr] sm:gap-7 sm:px-1 sm:py-[22px]">
              <div>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-28 mt-2" />
              </div>
              <Skeleton className="h-10 w-full max-w-[280px]" />
            </div>
          </section>

          {/* Status skeleton */}
          <section className="mt-10 border-t border-[var(--color-border-subtle)] pt-6 sm:mt-16 sm:pt-8">
            <div className="mb-1 flex items-baseline gap-3.5 border-b border-[var(--color-border-strong)] pb-3.5">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-3 w-36 ml-auto" />
            </div>
            <div className="grid grid-cols-1 items-start gap-2.5 border-b border-[var(--color-border-subtle)] px-0 py-4 sm:grid-cols-[200px_1fr] sm:gap-7 sm:px-1 sm:py-[22px]">
              <div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-28 mt-2" />
              </div>
              <div className="flex-1 space-y-2">
                {[...Array(6)].map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: static/derived list, never reordered
                  <div key={i} className="flex items-center gap-3 py-1">
                    <Skeleton className="w-4 h-4 rounded-full shrink-0" />
                    <Skeleton className="w-[9px] h-[9px] rounded-full shrink-0" />
                    <Skeleton className="h-4 w-[110px]" />
                    <Skeleton className="h-3 w-28 ml-2" />
                  </div>
                ))}
                <div className="flex gap-2 pt-3">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 w-36" />
                </div>
              </div>
            </div>
          </section>

          {/* Working hours skeleton */}
          <section className="mt-10 border-t border-[var(--color-border-subtle)] pt-6 sm:mt-16 sm:pt-8">
            <div className="mb-1 flex items-baseline gap-3.5 border-b border-[var(--color-border-strong)] pb-3.5">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-40 ml-auto" />
            </div>
            <div className="grid grid-cols-1 items-start gap-2.5 border-b border-[var(--color-border-subtle)] px-0 py-4 sm:grid-cols-[200px_1fr] sm:gap-7 sm:px-1 sm:py-[22px]">
              <div>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-36 mt-2" />
              </div>
              <div className="flex-1">
                <div className="flex gap-1 mb-4">
                  {[...Array(7)].map((_, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static/derived list, never reordered
                    <div key={i} className="flex-1 space-y-1">
                      <Skeleton className="h-[34px] w-full rounded-lg" />
                      <Skeleton className="h-3 w-4 mx-auto" />
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {[...Array(7)].map((_, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static/derived list, never reordered
                    <div key={i} className="flex items-center gap-4 py-1">
                      <Skeleton className="h-4 w-10" />
                      <Skeleton className="w-10 h-6 rounded-full" />
                      <Skeleton className="h-7 w-16" />
                      <Skeleton className="h-3 w-4" />
                      <Skeleton className="h-7 w-16" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div
          className="mx-auto grid min-h-[50vh] max-w-[730px] place-items-center px-4 pb-[100px] pt-6 text-sm sm:px-8 sm:pb-[140px] sm:pt-11"
          style={{ color: "var(--ink-muted)" }}
        >
          Make sure you're a member of an organization.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[730px] px-4 pb-[100px] pt-6 sm:px-8 sm:pb-[140px] sm:pt-11">
        <header className="mb-9 sm:mb-[52px]">
          <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ember)]">
            Kairos · <span className="capitalize">{me.role}</span>
          </span>
          <h1 className="mt-2 font-serif-display text-[34px] font-semibold leading-[1.1] tracking-[-0.015em]">
            Settings
          </h1>
          <p className="mt-3 max-w-[48ch] text-pretty text-[13px] leading-5 text-[var(--ink-muted)]">
            Shape how teammates see you, when you are available, and how your calendar behaves.
          </p>
        </header>

        {/* ═══ Profile ═══ */}
        <section className="mt-10 border-t border-[var(--color-border-subtle)] pt-6 first:mt-0 first:border-t-0 first:pt-0 sm:mt-16 sm:pt-8">
          <div className="mb-1 flex items-baseline gap-3.5 border-b border-[var(--color-border-strong)] pb-3.5">
            <h2 className="m-0 text-balance font-serif-display text-xl font-semibold tracking-[-0.01em]">
              Profile
            </h2>
          </div>

          <div className="grid grid-cols-1 items-start gap-2.5 border-b border-[var(--color-border-subtle)] px-0 py-4 sm:grid-cols-[200px_1fr] sm:gap-7 sm:px-1 sm:py-[22px] last:border-b-0">
            <div>
              <b className="block text-[13.5px] font-semibold tracking-[-0.005em]">
                Name &amp; email
              </b>
              <p className="mt-[3px] max-w-[24ch] text-[12.5px] text-[var(--ink-muted)] max-sm:max-w-none">
                How you appear on the team page.
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center justify-between gap-4 sm:flex-nowrap">
              <ProfileIdentity
                name={me.name}
                secondary={`${me.email} · managed by Clerk`}
                statusColor={STATUS_OPTIONS.find((option) => option.value === status)?.dot}
                avatarClassName="border border-[var(--color-border-strong)] bg-[var(--paper-deep)]"
                fallbackClassName="text-[var(--ink-secondary)]"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full shrink-0 whitespace-nowrap border-[var(--color-border-strong)] bg-[var(--card)] text-[var(--ink-secondary)] hover:bg-[var(--paper-deep)] sm:w-auto"
                title="Opens Clerk profile editor"
                onClick={() => clerk.openUserProfile()}
              >
                Edit profile
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 items-start gap-2.5 border-b border-[var(--color-border-subtle)] px-0 py-4 sm:grid-cols-[200px_1fr] sm:gap-7 sm:px-1 sm:py-[22px] last:border-b-0">
            <Label htmlFor="jobrole">
              <b className="block text-[13.5px] font-semibold tracking-[-0.005em]">Job role</b>
              <p className="mt-[3px] max-w-[24ch] text-[12.5px] text-[var(--ink-muted)] max-sm:max-w-none">
                Shown next to your name.
              </p>
            </Label>
            <Input
              id="jobrole"
              type="text"
              className="w-full max-w-[280px]"
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
              placeholder="Backend Engineer"
            />
          </div>

          <div className="grid grid-cols-1 items-start gap-2.5 border-b border-[var(--color-border-subtle)] px-0 py-4 sm:grid-cols-[200px_1fr] sm:gap-7 sm:px-1 sm:py-[22px] last:border-b-0">
            <Label htmlFor="tz">
              <b className="block text-[13.5px] font-semibold tracking-[-0.005em]">Time zone</b>
              <p className="mt-[3px] max-w-[24ch] text-[12.5px] text-[var(--ink-muted)] max-sm:max-w-none">
                Dates and local times follow this.
              </p>
            </Label>
            <Select value={timezone} onValueChange={(value) => value && setTimezone(value)}>
              <SelectTrigger id="tz" className="w-full max-w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...new Set([timezone, ...TIMEZONES])].filter(Boolean).map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* ═══ Status ═══ */}
        <section className="mt-10 border-t border-[var(--color-border-subtle)] pt-6 sm:mt-16 sm:pt-8">
          <div className="mb-1 flex items-baseline gap-3.5 border-b border-[var(--color-border-strong)] pb-3.5">
            <h2 className="m-0 text-balance font-serif-display text-xl font-semibold tracking-[-0.01em]">
              Status
            </h2>
            <span className="ml-auto font-serif-display text-xs italic text-[var(--ink-muted)] max-sm:hidden">
              shown live on the team page
            </span>
          </div>

          <div className="grid grid-cols-1 items-start gap-2.5 border-b border-[var(--color-border-subtle)] px-0 py-4 sm:grid-cols-[200px_1fr] sm:gap-7 sm:px-1 sm:py-[22px] last:border-b-0">
            <div>
              <b className="block text-[13.5px] font-semibold tracking-[-0.005em]">
                Current status
              </b>
              <p className="mt-[3px] max-w-[24ch] text-[12.5px] text-[var(--ink-muted)] max-sm:max-w-none">
                One tap away from the calendar rail too.
              </p>
            </div>
            <div>
              <RadioGroup
                value={status}
                onValueChange={setStatus}
                className="flex flex-col gap-0.5"
                aria-label="Your status"
              >
                {STATUS_OPTIONS.map((opt) => {
                  const on = status === opt.value;
                  return (
                    <Label
                      key={opt.value}
                      className={`group flex cursor-pointer items-center gap-[11px] rounded-lg px-3 py-2 transition-transform hover:bg-[var(--paper-deep)] ${on ? "font-semibold" : ""}`}
                    >
                      <RadioGroupItem
                        value={opt.value}
                        id={`status-${opt.value}`}
                        className="size-4 shrink-0"
                      />
                      <i
                        className="block h-[9px] w-[9px] shrink-0 rounded-full"
                        style={{ background: opt.dot }}
                      />
                      <span className="w-[110px] text-left text-[13.5px] font-medium max-sm:w-auto max-sm:flex-1">
                        {opt.label}
                      </span>
                      <span className="text-xs text-[var(--ink-muted)] max-sm:hidden">
                        {opt.desc}
                      </span>
                    </Label>
                  );
                })}
              </RadioGroup>

              <div className="mt-3.5 flex flex-col gap-2 sm:flex-row sm:gap-2.5">
                <Input
                  type="text"
                  value={note}
                  placeholder="Add a note (optional)"
                  onChange={(e) => setNote(e.target.value)}
                />
                <Label className="flex items-center gap-2 whitespace-nowrap text-xs text-[var(--ink-muted)]">
                  clears
                  <Select value={expiry} onValueChange={(value) => value && setExpiry(value)}>
                    <SelectTrigger className="h-auto border-0 p-0 shadow-none ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">today · 5:00 PM</SelectItem>
                      <SelectItem value="2h">in 2 hours</SelectItem>
                      <SelectItem value="tomorrow">tomorrow · 9:00 AM</SelectItem>
                      <SelectItem value="never">never</SelectItem>
                    </SelectContent>
                  </Select>
                </Label>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ Working hours ═══ */}
        <section className="mt-10 border-t border-[var(--color-border-subtle)] pt-6 sm:mt-16 sm:pt-8">
          <div className="mb-1 flex items-baseline gap-3.5 border-b border-[var(--color-border-strong)] pb-3.5">
            <h2 className="m-0 text-balance font-serif-display text-xl font-semibold tracking-[-0.01em]">
              Working hours
            </h2>
            <span className="ml-auto font-serif-display text-xs italic text-[var(--ink-muted)] max-sm:hidden">
              drives your calendar's shaded blocks
            </span>
          </div>

          <div className="grid grid-cols-1 items-start gap-2.5 border-b border-[var(--color-border-subtle)] px-0 py-4 sm:grid-cols-[200px_1fr] sm:gap-7 sm:px-1 sm:py-[22px] last:border-b-0">
            <div>
              <b className="block text-[13.5px] font-semibold tracking-[-0.005em]">
                Weekly schedule
              </b>
              <p className="mt-[3px] max-w-[24ch] text-[12.5px] text-[var(--ink-muted)] max-sm:max-w-none">
                Your typical week. Teammates planning around you see this.
              </p>
            </div>
            <div>
              <div className="mb-4 flex gap-1" aria-hidden>
                {DAY_NAMES.map((d, i) => {
                  const h = hours.find((x) => x.dayOfWeek === i)!;
                  return (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static/derived list, never reordered
                    <div key={i} className="flex-1 text-center">
                      <div className="relative h-[34px] overflow-hidden rounded-lg bg-[var(--paper-deep)]">
                        {h.isWorkingDay && (
                          <span className="absolute inset-y-[3px] left-[3%] right-[3%] block rounded-lg bg-[var(--ember)] opacity-85" />
                        )}
                      </div>
                      <span className="mt-1 block font-mono text-[9.5px] text-[var(--ink-muted)]">
                        {d[0]}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div>
                {DAY_NAMES.map((d, i) => {
                  const h = hours.find((x) => x.dayOfWeek === i)!;
                  return (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static/derived list, never reordered
                    <div key={i} className="flex flex-wrap items-center gap-2 py-2 sm:gap-[18px]">
                      <span className="w-10 font-serif-display text-[13px] italic text-[var(--ink-body)] sm:w-[46px] sm:text-[14.5px]">
                        {d}
                      </span>
                      <Switch
                        checked={h.isWorkingDay}
                        className="shrink-0"
                        aria-label={`Work ${["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"][i]}`}
                        onCheckedChange={() =>
                          setHours((prev) =>
                            prev.map((x) =>
                              x.dayOfWeek === i
                                ? {
                                    ...x,
                                    isWorkingDay: !x.isWorkingDay,
                                    startTime:
                                      !x.isWorkingDay && x.startTime === "00:00"
                                        ? "09:00"
                                        : x.startTime,
                                    endTime:
                                      !x.isWorkingDay && x.endTime === "00:00"
                                        ? "17:00"
                                        : x.endTime,
                                  }
                                : x,
                            ),
                          )
                        }
                      />
                      {h.isWorkingDay ? (
                        <>
                          <TimeSelect
                            value={h.startTime}
                            onValueChange={(value) =>
                              setHours((prev) =>
                                prev.map((x) =>
                                  x.dayOfWeek === i ? { ...x, startTime: value } : x,
                                ),
                              )
                            }
                          />
                          <span className="text-xs text-[var(--ink-muted)]">to</span>
                          <TimeSelect
                            value={h.endTime}
                            onValueChange={(value) =>
                              setHours((prev) =>
                                prev.map((x) => (x.dayOfWeek === i ? { ...x, endTime: value } : x)),
                              )
                            }
                          />
                        </>
                      ) : (
                        <span className="font-serif-display text-[12.5px] italic text-[var(--ink-secondary)]">
                          Day off
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <Button
                type="button"
                variant="link"
                className="mt-2.5 px-0 text-xs text-[var(--ember)]"
                onClick={copyMonday}
              >
                Copy Monday's hours to other weekdays
              </Button>
            </div>
          </div>
        </section>
      </div>

      {/* floating dirty-state save bar */}
      {saveError ? (
        <SaveBarError
          onRetry={() => {
            [setStatusMutation, updateProfile, saveHours].forEach((m) => {
              m.reset();
            });
            handleSave();
          }}
        />
      ) : (
        anyDirty && (
          <div
            className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-full bg-[var(--ink)] px-3 py-2 pl-[22px] pb-[max(0.5rem,env(safe-area-inset-bottom))] text-[var(--paper)] shadow-[0_12px_40px_rgba(43,38,32,0.35)] max-sm:left-4 max-sm:right-4 max-sm:translate-x-0 max-sm:justify-center max-sm:rounded-lg"
            role="alertdialog"
            aria-label="Unsaved changes"
          >
            <span className="font-serif-display text-[13px] italic text-[#d9c9b8]">
              Unsaved changes
            </span>
            <Button
              type="button"
              variant="ghost"
              className="text-[12.5px] text-[#b8ad9e] hover:text-[var(--paper)]"
              onClick={discard}
            >
              Discard
            </Button>
            <Button
              type="button"
              className="rounded-full bg-[var(--ember)] px-5 py-[9px] text-[13px] font-semibold text-white hover:bg-[var(--ember-deep)]"
              onClick={handleSave}
              disabled={
                updateProfile.isPending || saveHours.isPending || setStatusMutation.isPending
              }
            >
              {updateProfile.isPending || saveHours.isPending || setStatusMutation.isPending
                ? "Saving…"
                : "Save"}
            </Button>
          </div>
        )
      )}

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your profile, status, or working-hours edits will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDiscard}>
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
