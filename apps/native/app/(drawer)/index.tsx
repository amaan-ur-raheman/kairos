import { Ionicons } from "@expo/vector-icons";
import { expandOccurrences, type Recurrence } from "@kairos/api/lib/recurrence";
import { dayKey, getWeekDates, isSameDay } from "@kairos/shared";
import { useQuery } from "@tanstack/react-query";
import { Spinner } from "heroui-native";
import { useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Container } from "@/components/container";
import { C, SERIF, statusMeta } from "@/lib/theme";
import { orpc } from "@/utils/orpc";

const HOUR_HEIGHT = 64;
const START_HOUR = 7;
const END_HOUR = 21;
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatTime(hour: number, minute = 0): string {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? "AM" : "PM";
  return minute === 0 ? `${h} ${ampm}` : `${h}:${String(minute).padStart(2, "0")} ${ampm}`;
}

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const meQuery = useQuery(orpc.members.me.queryOptions());
  const me = meQuery.data;
  const statusesQuery = useQuery(orpc.availability.getForOrg.queryOptions());
  const myHoursQuery = useQuery(
    orpc.availability.getWorkingHours.queryOptions({ input: {}, enabled: !!me }),
  );
  const eventsQuery = useQuery(orpc.events.list.queryOptions());
  const leavesQuery = useQuery(orpc.leave.listForMember.queryOptions());

  const statuses = statusesQuery.data ?? [];
  const myHours = myHoursQuery.data ?? [];
  const myStatus = statuses.find((s) => s.memberId === me?.id);

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const today = new Date();
  // DB convention: dayOfWeek 0 = Sunday — matches Date.getDay()
  const selectedDow = selectedDate.getDay();

  type Block = { label: string; color: string; bg: string; startHour: number; endHour: number };
  const blocks = useMemo<Block[]>(() => {
    const out: Block[] = [];
    const wh = myHours.find((h) => h.dayOfWeek === selectedDow);
    if (wh?.isWorkingDay) {
      const sh = parseInt(wh.startTime.split(":")[0], 10);
      const eh = parseInt(wh.endTime.split(":")[0], 10);
      out.push({
        label: "Working hours",
        color: C.stAvailable,
        bg: "#eaf3ea",
        startHour: sh,
        endHour: eh,
      });
    }

    const key = dayKey(selectedDate);
    const leave = (leavesQuery.data ?? []).find(
      (lr) => lr.status === "approved" && lr.startDate <= key && lr.endDate >= key,
    );
    if (leave) {
      out.push({
        label: `Leave · ${leave.type}`,
        color: C.stBusy,
        bg: "#faeceb",
        startHour: 9,
        endHour: 17,
      });
    }

    // Expand recurring series into concrete occurrences for the selected day,
    // same as the web calendar does via @kairos/api/lib/recurrence.
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    for (const ev of eventsQuery.data ?? []) {
      for (const occ of expandOccurrences(
        {
          startTime: String(ev.startTime),
          endTime: String(ev.endTime),
          recurrence: (ev.recurrence ?? "none") as Recurrence,
          recurrenceDays: (ev.recurrenceDays ?? []) as number[],
          recurrenceInterval: (ev.recurrenceInterval ?? 1) as number,
          recurrenceUntil: ev.recurrenceUntil ? String(ev.recurrenceUntil) : null,
        },
        dayStart,
        dayEnd,
      )) {
        out.push({
          label: ev.title,
          color: ev.color,
          bg: "#eef4fc",
          startHour: occ.start.getHours() + occ.start.getMinutes() / 60,
          endHour: occ.end.getHours() + occ.end.getMinutes() / 60,
        });
      }
    }

    if (myStatus && isSameDay(selectedDate, today)) {
      const nowH = today.getHours();
      out.push({
        label: myStatus.note
          ? `${statusMeta(myStatus.status).label} · ${myStatus.note}`
          : statusMeta(myStatus.status).label,
        color: C.ember,
        bg: C.emberSoft,
        startHour: Math.max(nowH, START_HOUR),
        endHour: Math.min(nowH + 2, END_HOUR),
      });
    }
    return out;
  }, [
    myStatus,
    myHours,
    eventsQuery.data,
    leavesQuery.data,
    selectedDate,
    selectedDow,
    today.getHours,
    today,
  ]);

  const availableNow = statuses.filter((s) => s.status === "available").length;

  const goToPrevWeek = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 7);
    setSelectedDate(d);
  };
  const goToNextWeek = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 7);
    setSelectedDate(d);
  };
  const goToToday = () => setSelectedDate(new Date());

  if (meQuery.isLoading || statusesQuery.isLoading) {
    return (
      <Container className="items-center justify-center">
        <Spinner size="lg" />
      </Container>
    );
  }

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  return (
    <Container isScrollable={false}>
      {/* Header */}
      <View className="px-4 pt-3 pb-2 flex-row items-baseline justify-between">
        <Text style={{ fontFamily: SERIF, fontSize: 24, fontWeight: "600", color: C.ink }}>
          Calendar
        </Text>
        <Text style={{ fontSize: 12, color: C.inkMuted }}>
          {availableNow} of {statuses.length} available
        </Text>
      </View>

      {/* Week selector */}
      <View className="px-4 pb-2">
        <View className="flex-row items-center justify-between mb-3">
          <TouchableOpacity
            onPress={goToPrevWeek}
            className="p-2"
            accessibilityLabel="Previous week"
          >
            <Ionicons name="chevron-back" size={20} color={C.inkMuted} />
          </TouchableOpacity>
          <Text style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 13, color: C.inkMuted }}>
            {weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            {" – "}
            {weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </Text>
          <View className="flex-row items-center gap-1">
            <TouchableOpacity onPress={goToNextWeek} className="p-2" accessibilityLabel="Next week">
              <Ionicons name="chevron-forward" size={20} color={C.inkMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={goToToday}
              className="px-3 py-1.5 rounded-lg border"
              style={{ borderColor: C.lineStrong }}
            >
              <Text style={{ fontSize: 12, color: C.inkBody }}>Today</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Day pills */}
        <View className="flex-row justify-between">
          {weekDates.map((date, i) => {
            const isToday = isSameDay(date, today);
            const isSelected = isSameDay(date, selectedDate);
            return (
              <TouchableOpacity
                // biome-ignore lint/suspicious/noArrayIndexKey: static/derived list, never reordered
                key={i}
                onPress={() => setSelectedDate(date)}
                className="items-center"
                accessibilityLabel={`Select ${DAY_NAMES[i]}`}
              >
                <Text
                  style={{
                    fontFamily: SERIF,
                    fontStyle: "italic",
                    fontSize: 11,
                    color: i === 3 && isSameDay(selectedDate, today) ? C.ember : C.inkMuted,
                  }}
                >
                  {DAY_NAMES[i]}
                </Text>
                <View
                  className="w-9 h-9 rounded-full items-center justify-center mt-1"
                  style={{
                    backgroundColor: isSelected
                      ? C.ember
                      : isToday
                        ? "rgba(194,65,12,0.12)"
                        : "transparent",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "monospace",
                      fontSize: 13,
                      color: isSelected ? "#fff" : C.inkMuted,
                    }}
                  >
                    {date.getDate()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Status quick row */}
      <View className="px-4 pb-2 flex-row items-center gap-2">
        <View
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: myStatus ? statusMeta(myStatus.status).color : C.stOffline }}
        />
        <Text style={{ fontSize: 12.5, color: C.inkBody }}>
          {myStatus ? statusMeta(myStatus.status).label : "No status set"}
        </Text>
      </View>

      {/* Time grid */}
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 80 }}>
        <View className="flex-row">
          <View className="w-14">
            {hours.map((hour) => (
              <View key={hour} style={{ height: HOUR_HEIGHT }} className="justify-start pt-0">
                <Text
                  className="text-[10px] -mt-1.5"
                  style={{ fontFamily: "monospace", color: C.inkMuted }}
                >
                  {formatTime(hour)}
                </Text>
              </View>
            ))}
          </View>

          <View className="flex-1 border-l" style={{ borderColor: C.line }}>
            {hours.map((hour) => (
              <View key={hour} style={{ height: HOUR_HEIGHT }} className="border-b" />
            ))}

            {/* Current time line */}
            {isSameDay(selectedDate, today) && (
              <View
                className="absolute left-0 right-0 z-10"
                style={{
                  top: (today.getHours() + today.getMinutes() / 60 - START_HOUR) * HOUR_HEIGHT,
                }}
              >
                <View className="flex-row items-center">
                  <View className="w-2 h-2 rounded-full" style={{ backgroundColor: C.ember }} />
                  <View className="flex-1 h-[2px]" style={{ backgroundColor: C.ember }} />
                </View>
              </View>
            )}

            {/* Event blocks */}
            {blocks.map((event, i) => {
              const top = Math.max(0, event.startHour - START_HOUR) * HOUR_HEIGHT + 2;
              const height = Math.max(30, (event.endHour - event.startHour) * HOUR_HEIGHT - 4);
              return (
                <View
                  // biome-ignore lint/suspicious/noArrayIndexKey: static/derived list, never reordered
                  key={i}
                  className="absolute left-1 right-1 rounded-lg px-2.5 py-1.5 border"
                  style={{
                    top,
                    height,
                    backgroundColor: event.bg,
                    borderColor: C.line,
                  }}
                >
                  <View className="flex-row items-center gap-1.5">
                    <View
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: event.color }}
                    />
                    <Text
                      className="text-xs font-medium"
                      numberOfLines={2}
                      style={{ color: C.ink }}
                    >
                      {event.label}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </Container>
  );
}
