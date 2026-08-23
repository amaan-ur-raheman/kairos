import { useAuth, useUser } from "@clerk/expo";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Spinner, Surface } from "heroui-native";
import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

import { Container } from "@/components/container";
import { SignOutButton } from "@/components/sign-out-button";
import { C, SERIF, STATUS_META } from "@/lib/theme";
import { orpc } from "@/utils/orpc";

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
  { value: "available", label: "Available", desc: "open for chats & calls" },
  { value: "busy", label: "Busy", desc: "do not disturb" },
  { value: "in_meeting", label: "In a Meeting", desc: "back after this one" },
  { value: "focus_time", label: "Focus Time", desc: "heads-down, async only" },
  { value: "traveling", label: "Traveling", desc: "reaching me is slow" },
  { value: "offline", label: "Offline", desc: "away from work" },
] as const;

function formatTimeDisplay(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const hour12 = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  return m === 0 ? `${hour12} ${ampm}` : `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function SectionHead({ title, hint }: { title: string; hint?: string }) {
  return (
    <View
      className="flex-row items-baseline justify-between mt-8 mb-3 border-b pb-2.5"
      style={{ borderColor: C.lineStrong }}
    >
      <Text style={{ fontFamily: SERIF, fontSize: 19, fontWeight: "600", color: C.ink }}>
        {title}
      </Text>
      {hint && (
        <Text style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 12, color: C.inkMuted }}>
          {hint}
        </Text>
      )}
    </View>
  );
}

export default function SettingsScreen() {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { userId } = useAuth();

  const meQuery = useQuery(orpc.members.me.queryOptions());
  const me = meQuery.data;
  const statuses = useQuery(orpc.availability.getForOrg.queryOptions());
  const myStatus = statuses.data?.find((s) => s.memberId === me?.id);

  const hoursQuery = useQuery(
    orpc.availability.getWorkingHours.queryOptions({ input: {}, enabled: !!me }),
  );
  const savedHours = hoursQuery.data ?? [];

  const [hours, setHours] = useState(DEFAULT_HOURS);
  useEffect(() => {
    if (savedHours.length > 0) setHours(savedHours.map((h) => ({ ...h })));
  }, [savedHours.map, savedHours.length]);

  const [status, setStatus] = useState("available");
  const [note, setNote] = useState("");
  const [statusDirty, setStatusDirty] = useState(false);
  useEffect(() => {
    if (myStatus && !statusDirty) {
      setStatus(myStatus.status);
      setNote(myStatus.note ?? "");
    }
  }, [myStatus, statusDirty]);

  const setStatusMutation = useMutation(
    orpc.availability.setStatus.mutationOptions({
      onSuccess: () => {
        setStatusDirty(false);
        queryClient.invalidateQueries({ queryKey: orpc.availability.getForOrg.key() });
        Alert.alert("Saved", "Status updated.");
      },
      onError: (error) => Alert.alert("Error", error.message),
    }),
  );

  const saveHours = useMutation(
    orpc.availability.setWorkingHours.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.availability.getWorkingHours.key() });
        Alert.alert("Saved", "Working hours updated.");
      },
      onError: (error) => Alert.alert("Error", error.message),
    }),
  );

  const hoursDirty =
    JSON.stringify(hours) !== JSON.stringify(savedHours.length > 0 ? savedHours : DEFAULT_HOURS);

  function handleSaveStatus() {
    setStatusMutation.mutate({
      status: status as
        | "available"
        | "busy"
        | "in_meeting"
        | "focus_time"
        | "traveling"
        | "offline",
      note: note.trim() || undefined,
    });
  }

  function updateDay(dayOfWeek: number, field: string, value: unknown) {
    setHours((prev) => prev.map((h) => (h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h)));
  }

  if (meQuery.isLoading) {
    return (
      <Container className="items-center justify-center">
        <Spinner size="lg" />
      </Container>
    );
  }

  return (
    <Container>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Header */}
        <View className="px-4 pt-4">
          <Text
            style={{
              fontFamily: "monospace",
              fontSize: 10,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: C.ember,
            }}
          >
            SETTINGS · {me?.name ?? "…"}
          </Text>
          <Text
            style={{
              fontFamily: SERIF,
              fontSize: 28,
              fontWeight: "600",
              color: C.ink,
              marginTop: 6,
            }}
          >
            Your corner of Kairos
          </Text>
        </View>

        {/* Profile */}
        <View className="px-4 mt-6">
          <Surface
            variant="secondary"
            className="p-4 rounded-xl flex-row items-center gap-3.5"
            style={{ backgroundColor: C.card }}
          >
            <View
              className="w-12 h-12 rounded-full items-center justify-center"
              style={{ backgroundColor: C.ember }}
            >
              <Text style={{ fontFamily: SERIF, fontSize: 15, fontWeight: "600", color: "#fff" }}>
                {me?.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() ?? "?"}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-[14.5px] font-semibold" style={{ color: C.ink }}>
                {me?.name ?? user?.fullName ?? "User"}
              </Text>
              <Text className="text-xs mt-0.5" style={{ color: C.inkMuted }}>
                {me?.email ?? user?.emailAddresses?.[0]?.emailAddress}
                {me?.jobRole ? ` · ${me.jobRole}` : ""}
              </Text>
            </View>
            <View className="rounded-full px-3 py-1" style={{ backgroundColor: C.emberSoft }}>
              <Text
                className="text-[10px] font-semibold uppercase"
                style={{ fontFamily: "monospace", color: C.ember }}
              >
                {me?.role ?? "member"}
              </Text>
            </View>
          </Surface>
        </View>

        {/* Status */}
        <SectionHead title="Status" hint="shown live on the team page" />
        <View className="px-4">
          {STATUS_OPTIONS.map((opt) => {
            const on = status === opt.value;
            const meta = STATUS_META[opt.value];
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => {
                  setStatus(opt.value);
                  setStatusDirty(true);
                }}
                className="flex-row items-center gap-3 px-3 py-2.5 rounded-lg"
                style={{
                  backgroundColor: on ? C.emberSoft : "transparent",
                  marginLeft: -12,
                  marginRight: -12,
                }}
              >
                <View
                  className="w-4 h-4 rounded-full items-center justify-center"
                  style={{ borderWidth: 1.5, borderColor: on ? C.ember : C.lineStrong }}
                >
                  {on && (
                    <View className="w-2 h-2 rounded-full" style={{ backgroundColor: C.ember }} />
                  )}
                </View>
                <View
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: meta.color }}
                />
                <Text
                  className={`text-[13px] flex-1`}
                  style={{ fontWeight: on ? "600" : "500", color: C.ink }}
                >
                  {opt.label}
                </Text>
                <Text className="text-xs" style={{ color: C.inkMuted }}>
                  {opt.desc}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TextInput
            value={note}
            onChangeText={(t) => {
              setNote(t);
              setStatusDirty(true);
            }}
            placeholder="Add a note (optional)"
            placeholderTextColor={C.inkMuted}
            className="mt-3 rounded-lg px-3.5 py-2.5 text-sm border"
            style={{ backgroundColor: C.card, borderColor: C.lineStrong, color: C.ink }}
          />

          {statusDirty && (
            <TouchableOpacity
              onPress={handleSaveStatus}
              disabled={setStatusMutation.isPending}
              className="mt-3 self-start rounded-full px-5 py-2"
              style={{ backgroundColor: C.ember, opacity: setStatusMutation.isPending ? 0.6 : 1 }}
            >
              <Text className="text-[12.5px] font-semibold text-white">
                {setStatusMutation.isPending ? "Saving…" : "Update status"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Working hours */}
        <SectionHead title="Working hours" hint="drives your calendar blocks" />
        <View className="px-4">
          {/* week strip */}
          <View className="flex-row gap-1 mb-4">
            {DAY_NAMES.map((d, i) => {
              const h = hours.find((x) => x.dayOfWeek === i)!;
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: static/derived list, never reordered
                <View key={i} className="flex-1 items-center">
                  <View
                    className="w-full h-8 rounded-lg justify-center overflow-hidden"
                    style={{ backgroundColor: C.paperDeep }}
                  >
                    {h.isWorkingDay && (
                      <View
                        className="mx-0.5 rounded"
                        style={{ height: 28, backgroundColor: C.ember, opacity: 0.85 }}
                      />
                    )}
                  </View>
                  <Text
                    style={{
                      fontFamily: "monospace",
                      fontSize: 9.5,
                      color: C.inkMuted,
                      marginTop: 3,
                    }}
                  >
                    {d[0]}
                  </Text>
                </View>
              );
            })}
          </View>

          {DAY_NAMES.map((d, i) => {
            const h = hours.find((x) => x.dayOfWeek === i)!;
            const isWeekend = i === 0 || i === 6;
            return (
              <View
                // biome-ignore lint/suspicious/noArrayIndexKey: static/derived list, never reordered
                key={i}
                className="flex-row items-center py-2 gap-3"
                style={{ opacity: h.isWorkingDay ? 1 : 0.5 }}
              >
                <Text
                  className="w-10"
                  style={{
                    fontFamily: SERIF,
                    fontStyle: "italic",
                    fontSize: 13.5,
                    color: h.isWorkingDay ? C.inkBody : C.inkMuted,
                  }}
                >
                  {d}
                </Text>
                <TouchableOpacity
                  accessibilityLabel={`Work ${d}days`}
                  accessibilityState={{ checked: h.isWorkingDay }}
                  onPress={() => {
                    const turningOn = !h.isWorkingDay;
                    updateDay(i, "isWorkingDay", turningOn);
                    if (turningOn && h.startTime === "00:00") {
                      updateDay(i, "startTime", "09:00");
                      updateDay(i, "endTime", "17:00");
                    }
                  }}
                  className="w-[42px] h-6 rounded-full px-0.5 flex-row items-center"
                  style={{
                    backgroundColor: h.isWorkingDay ? C.ember : C.lineStrong,
                    justifyContent: h.isWorkingDay ? "flex-end" : "flex-start",
                  }}
                >
                  <View className="w-5 h-5 rounded-full" style={{ backgroundColor: C.card }} />
                </TouchableOpacity>
                {h.isWorkingDay ? (
                  <Text
                    className="flex-1 text-right"
                    style={{ fontFamily: "monospace", fontSize: 11.5, color: C.ink }}
                  >
                    {formatTimeDisplay(h.startTime)} to {formatTimeDisplay(h.endTime)}
                  </Text>
                ) : (
                  <Text
                    className="flex-1 text-right"
                    style={{
                      fontFamily: SERIF,
                      fontStyle: "italic",
                      fontSize: 12.5,
                      color: C.inkMuted,
                    }}
                  >
                    Day off
                  </Text>
                )}
                {isWeekend && !h.isWorkingDay ? null : null}
              </View>
            );
          })}
        </View>

        {/* Save hours */}
        {hoursDirty && (
          <View className="px-4 mt-4">
            <TouchableOpacity
              onPress={() => saveHours.mutate({ hours })}
              disabled={saveHours.isPending}
              className="rounded-full py-3 items-center"
              style={{ backgroundColor: C.ink, opacity: saveHours.isPending ? 0.6 : 1 }}
            >
              <Text className="text-[13px] font-semibold" style={{ color: C.paper }}>
                {saveHours.isPending ? "Saving…" : "Save working hours"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Skills */}
        <SectionHead title="Skills" hint="helps teammates find you" />
        <View className="px-4">
          {(me?.skills?.length ?? 0) > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {me!.skills.map((s) => (
                <View
                  key={s}
                  className="px-3.5 py-1.5 rounded-full border"
                  style={{ backgroundColor: C.card, borderColor: C.line }}
                >
                  <Text className="text-xs font-medium" style={{ color: C.inkBody }}>
                    {s}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-xs" style={{ color: C.inkMuted }}>
              No skills yet — add them from the web app.
            </Text>
          )}
          {userId && me && (
            <Text className="text-[11px] mt-2" style={{ color: C.inkMuted }}>
              Signed in as {me.email}
            </Text>
          )}
        </View>

        {/* Sign out */}
        <View className="px-4 mt-10">
          <SignOutButton />
        </View>
      </ScrollView>
    </Container>
  );
}
