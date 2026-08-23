import { useQuery } from "@tanstack/react-query";
import { Link, useLocalSearchParams } from "expo-router";
import { Spinner } from "heroui-native";
import { ScrollView, Text, View } from "react-native";

import { Container } from "@/components/container";
import { C, SERIF } from "@/lib/theme";
import { orpc } from "@/utils/orpc";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MemberPage() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const member = useQuery(orpc.members.getById.queryOptions({ input: { id: id ?? "" } }));
  const workingHours = useQuery(
    orpc.availability.getWorkingHours.queryOptions({
      input: { memberId: id ?? "" },
      enabled: !!id,
    }),
  );

  if (member.isLoading) {
    return (
      <Container className="items-center justify-center">
        <Spinner size="lg" />
      </Container>
    );
  }

  const m = member.data;
  if (!m) {
    return (
      <Container className="items-center justify-center">
        <Text style={{ fontFamily: SERIF, fontSize: 20, fontWeight: "600", color: C.ink }}>
          Member not found
        </Text>
        <Link href="/(drawer)/team" asChild>
          <Text style={{ color: C.ember, marginTop: 10 }}>← Back to team</Text>
        </Link>
      </Container>
    );
  }

  const initials = m.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const hours = [...(workingHours.data ?? [])].sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  return (
    <Container>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <View className="px-4 pt-4">
          <Link href="/(drawer)/team" asChild>
            <Text style={{ color: C.ember, fontSize: 13, fontWeight: "600" }}>← Team</Text>
          </Link>
        </View>

        <View className="px-4 mt-5 flex-row items-center gap-4">
          <View
            className="w-16 h-16 rounded-full items-center justify-center"
            style={{ backgroundColor: C.ember }}
          >
            <Text style={{ fontFamily: SERIF, fontSize: 20, fontWeight: "600", color: "#fff" }}>
              {initials}
            </Text>
          </View>
          <View className="flex-1">
            <Text style={{ fontFamily: SERIF, fontSize: 24, fontWeight: "600", color: C.ink }}>
              {m.name}
            </Text>
            <Text className="text-sm mt-0.5" style={{ color: C.inkMuted }}>
              {m.jobRole ?? "Team member"} · {m.email}
            </Text>
          </View>
        </View>

        {(m.skills?.length ?? 0) > 0 && (
          <>
            <View
              className="flex-row items-baseline justify-between px-4 mt-8 mb-3 border-b pb-2.5"
              style={{ borderColor: C.lineStrong }}
            >
              <Text style={{ fontFamily: SERIF, fontSize: 18, fontWeight: "600", color: C.ink }}>
                Skills
              </Text>
            </View>
            <View className="px-4 flex-row flex-wrap gap-2">
              {m.skills.map((s) => (
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
          </>
        )}

        <View
          className="flex-row items-baseline justify-between px-4 mt-8 mb-3 border-b pb-2.5"
          style={{ borderColor: C.lineStrong }}
        >
          <Text style={{ fontFamily: SERIF, fontSize: 18, fontWeight: "600", color: C.ink }}>
            Working hours
          </Text>
          <Text
            style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: 2, color: C.inkMuted }}
          >
            THEIR WEEK
          </Text>
        </View>
        <View
          className="mx-4 rounded-xl border overflow-hidden"
          style={{ backgroundColor: C.card, borderColor: C.line }}
        >
          {hours.length === 0 ? (
            <Text className="px-4 py-5 text-[13px]" style={{ color: C.inkMuted }}>
              No working hours set yet.
            </Text>
          ) : (
            hours.map((h) => (
              <View
                key={h.id ?? h.dayOfWeek}
                className="flex-row items-center gap-4 px-4 py-3 border-b last:border-b-0"
                style={{ borderColor: "#efeae0", opacity: h.isWorkingDay ? 1 : 0.55 }}
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
                  {DAY_NAMES[h.dayOfWeek]}
                </Text>
                {h.isWorkingDay ? (
                  <Text style={{ fontFamily: "monospace", fontSize: 12, color: C.ink }}>
                    {h.startTime} to {h.endTime}
                  </Text>
                ) : (
                  <Text
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
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </Container>
  );
}
