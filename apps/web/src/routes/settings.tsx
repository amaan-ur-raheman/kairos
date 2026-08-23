import { useClerk } from "@clerk/tanstack-react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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

const TIMEZONES = [
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Australia/Sydney",
];

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

function initials(name?: string | null) {
  return (
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?"
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
  useEffect(() => {
    if (myStatus) {
      setStatus(myStatus.status);
      setNote(myStatus.note ?? "");
    }
  }, [myStatus]);

  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  useEffect(() => {
    if (me?.skills) setSkills(me.skills);
  }, [me?.skills]);

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
  const skillsDirty = !!me && JSON.stringify(skills) !== JSON.stringify(me.skills ?? []);
  const hoursDirty = savedHours
    ? JSON.stringify(hours) !== JSON.stringify(savedHours)
    : JSON.stringify(hours) !== JSON.stringify(DEFAULT_HOURS);
  const statusChanged =
    !!myStatus &&
    (status !== myStatus.status || note !== (myStatus.note ?? "") || expiry !== "never");
  const anyDirty = profileDirty || skillsDirty || hoursDirty || statusChanged;

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
    if (profileDirty || skillsDirty) {
      chain = chain.then(() =>
        updateProfile.mutateAsync({
          id: me!.id,
          jobRole: jobRole.trim() || undefined,
          timezone,
          skills,
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
    setStatus(myStatus?.status ?? "available");
    setNote(myStatus?.note ?? "");
    setExpiry("never");
    if (me) {
      setJobRole(me.jobRole ?? "");
      setTimezone(me.timezone ?? "UTC");
    }
    setSkills(me?.skills ?? []);
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

  function addSkill() {
    const v = newSkill.trim();
    if (!v || skills.includes(v)) return;
    setSkills([...skills, v]);
    setNewSkill("");
  }

  if (meQuery.isLoading) {
    return (
      <div className="sheet-wrap">
        <div className="sheet" aria-label="Loading settings" role="status">
          <header className="page-head">
            <Skeleton className="h-[10px] w-36" />
            <Skeleton className="h-[34px] w-32 mt-2" />
          </header>

          {/* Profile skeleton */}
          <section className="section">
            <div className="section-head">
              <Skeleton className="h-5 w-20" />
            </div>
            <div className="row">
              <div className="row-label">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-28 mt-2" />
              </div>
              <div className="tz-line">
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
            <div className="row">
              <div className="row-label">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-24 mt-2" />
              </div>
              <Skeleton className="h-10 w-full max-w-[280px]" />
            </div>
            <div className="row">
              <div className="row-label">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-28 mt-2" />
              </div>
              <Skeleton className="h-10 w-full max-w-[280px]" />
            </div>
          </section>

          {/* Status skeleton */}
          <section className="section">
            <div className="section-head">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-3 w-36 ml-auto" />
            </div>
            <div className="row">
              <div className="row-label">
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
          <section className="section">
            <div className="section-head">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-40 ml-auto" />
            </div>
            <div className="row">
              <div className="row-label">
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

          {/* Skills skeleton */}
          <section className="section">
            <div className="section-head">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-3 w-44 ml-auto" />
            </div>
            <div className="row">
              <div className="row-label">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-28 mt-2" />
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex gap-2">
                  <Skeleton className="h-7 w-20 rounded-full" />
                  <Skeleton className="h-7 w-24 rounded-full" />
                  <Skeleton className="h-7 w-16 rounded-full" />
                </div>
                <div className="flex gap-2 max-w-[380px]">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 w-16" />
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
      <div className="sheet-wrap">
        <div
          className="sheet grid place-items-center text-sm min-h-[50vh]"
          style={{ color: "var(--ink-muted)" }}
        >
          Make sure you're a member of an organization.
        </div>
      </div>
    );
  }

  return (
    <div className="sheet-wrap">
      <div className="sheet">
        <header className="page-head">
          <span className="kicker">
            Fieldnote Studio · <span className="capitalize">{me.role}</span>
          </span>
          <h1 className="page-title">Settings</h1>
        </header>

        {/* ═══ Profile ═══ */}
        <section className="section">
          <div className="section-head">
            <h2>Profile</h2>
          </div>

          <div className="row">
            <div className="row-label">
              <b>Name &amp; email</b>
              <p>How you appear on the team page.</p>
            </div>
            <div className="tz-line">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span
                  className="w-11 h-11 rounded-full grid place-items-center font-serif-display font-semibold text-[15px] text-white shrink-0"
                  style={{ background: "var(--ember)" }}
                >
                  {initials(me.name)}
                </span>
                <div className="min-w-0">
                  <b className="block text-[14.5px] font-semibold truncate">{me.name}</b>
                  <span
                    className="block text-xs mt-0.5 truncate"
                    style={{ color: "var(--ink-muted)" }}
                    title={`${me.email} · managed by Clerk`}
                  >
                    {me.email} · managed by Clerk
                  </span>
                </div>
              </div>
              <button type="button" className="ghost-btn" onClick={() => clerk.openUserProfile()}>
                Edit profile
              </button>
            </div>
          </div>

          <div className="row">
            <label htmlFor="jobrole" className="row-label">
              <b>Job role</b>
              <p>Shown next to your name.</p>
            </label>
            <input
              id="jobrole"
              type="text"
              className="max-w-[280px]"
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
              placeholder="Backend Engineer"
            />
          </div>

          <div className="row">
            <label htmlFor="tz" className="row-label">
              <b>Time zone</b>
              <p>Dates and local times follow this.</p>
            </label>
            <select
              id="tz"
              className="max-w-[280px]"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {[...new Set([timezone, ...TIMEZONES])].filter(Boolean).map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* ═══ Status ═══ */}
        <section className="section">
          <div className="section-head">
            <h2>Status</h2>
            <span className="hint">shown live on the team page</span>
          </div>

          <div className="row">
            <div className="row-label">
              <b>Current status</b>
              <p>One tap away from the calendar rail too.</p>
            </div>
            <div>
              <div className="status-list" role="radiogroup" aria-label="Your status">
                {STATUS_OPTIONS.map((opt) => {
                  const on = status === opt.value;
                  return (
                    // biome-ignore lint/a11y/useSemanticElements: custom styled radiogroup with full keyboard support
                    <div
                      key={opt.value}
                      role="radio"
                      aria-checked={on}
                      tabIndex={0}
                      className={`st-opt ${on ? "on" : ""}`}
                      onClick={() => setStatus(opt.value)}
                      onKeyDown={(e) =>
                        (e.key === " " || e.key === "Enter") && setStatus(opt.value)
                      }
                    >
                      <span className="radio" />
                      <i className="st-dot" style={{ background: opt.dot }} />
                      <span className="st-name">{opt.label}</span>
                      <span className="st-desc">{opt.desc}</span>
                    </div>
                  );
                })}
              </div>

              <div className="note-group">
                <input
                  type="text"
                  value={note}
                  placeholder="Add a note (optional)"
                  onChange={(e) => setNote(e.target.value)}
                />
                <label className="expiry">
                  clears
                  <select value={expiry} onChange={(e) => setExpiry(e.target.value)}>
                    <option value="today">today · 5:00 PM</option>
                    <option value="2h">in 2 hours</option>
                    <option value="tomorrow">tomorrow · 9:00 AM</option>
                    <option value="never">never</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ Working hours ═══ */}
        <section className="section">
          <div className="section-head">
            <h2>Working hours</h2>
            <span className="hint">drives your calendar's shaded blocks</span>
          </div>

          <div className="row">
            <div className="row-label">
              <b>Weekly schedule</b>
              <p>Your typical week. Teammates planning around you see this.</p>
            </div>
            <div>
              <div className="hours-strip" aria-hidden>
                {DAY_NAMES.map((d, i) => {
                  const h = hours.find((x) => x.dayOfWeek === i)!;
                  return (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static/derived list, never reordered
                    <div key={i} className="hs-day">
                      <div className="hs-bar">
                        {h.isWorkingDay && <span className="hs-fill full" />}
                      </div>
                      <span className="hs-lbl">{d[0]}</span>
                    </div>
                  );
                })}
              </div>

              <div className="hours">
                {DAY_NAMES.map((d, i) => {
                  const h = hours.find((x) => x.dayOfWeek === i)!;
                  return (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static/derived list, never reordered
                    <div key={i} className={`hrow ${h.isWorkingDay ? "" : "off"}`}>
                      <span className="hday">{d}</span>
                      <button
                        type="button"
                        className={`switch ${h.isWorkingDay ? "on" : ""}`}
                        role="switch"
                        aria-checked={h.isWorkingDay}
                        aria-label={`Work ${["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"][i]}`}
                        onClick={() =>
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
                          <select
                            className="time-box"
                            value={h.startTime}
                            onChange={(e) =>
                              setHours((prev) =>
                                prev.map((x) =>
                                  x.dayOfWeek === i ? { ...x, startTime: e.target.value } : x,
                                ),
                              )
                            }
                          >
                            {TIME_OPTIONS.map((t) => (
                              <option key={t}>{t}</option>
                            ))}
                          </select>
                          <span className="sep">to</span>
                          <select
                            className="time-box"
                            value={h.endTime}
                            onChange={(e) =>
                              setHours((prev) =>
                                prev.map((x) =>
                                  x.dayOfWeek === i ? { ...x, endTime: e.target.value } : x,
                                ),
                              )
                            }
                          >
                            {TIME_OPTIONS.map((t) => (
                              <option key={t}>{t}</option>
                            ))}
                          </select>
                        </>
                      ) : (
                        <span className="off-label">Day off</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <button type="button" className="copy-hint" onClick={copyMonday}>
                Copy Monday's hours to Tue-Fri
              </button>
            </div>
          </div>
        </section>

        {/* ═══ Skills ═══ */}
        <section className="section">
          <div className="section-head">
            <h2>Skills</h2>
            <span className="hint">helps teammates find the right person</span>
          </div>

          <div className="row">
            <div className="row-label">
              <b>What you can help with</b>
              <p>Shows on your team-page profile.</p>
            </div>
            <div>
              <div className="skills-wrap">
                {skills.map((s) => (
                  <span key={s} className="skill-pill">
                    {s}
                    <button
                      type="button"
                      aria-label={`Remove ${s}`}
                      onClick={() => setSkills(skills.filter((x) => x !== s))}
                    >
                      ✕
                    </button>
                  </span>
                ))}
                {skills.length === 0 && (
                  <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                    No skills yet.
                  </span>
                )}
              </div>
              <div className="skill-row">
                <input
                  type="text"
                  placeholder="Add a skill…"
                  aria-label="Add a skill"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                />
                <button type="button" className="btn-add" onClick={addSkill}>
                  Add
                </button>
              </div>
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
          <div className="save-bar-fixed" role="alertdialog" aria-label="Unsaved changes">
            <span className="dirty-note">Unsaved changes</span>
            <button type="button" className="discard-btn" onClick={discard}>
              Discard
            </button>
            <button
              type="button"
              className="save-btn-ember"
              onClick={handleSave}
              disabled={
                updateProfile.isPending || saveHours.isPending || setStatusMutation.isPending
              }
            >
              {updateProfile.isPending || saveHours.isPending || setStatusMutation.isPending
                ? "Saving…"
                : "Save"}
            </button>
          </div>
        )
      )}
    </div>
  );
}
