import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { Spinner } from "heroui-native";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { Container } from "@/components/container";
import { C, SERIF, STATUS_META, STATUS_ORDER } from "@/lib/theme";
import { orpc } from "@/utils/orpc";

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

export default function TeamScreen() {
  const members = useQuery(orpc.members.list.queryOptions());
  const statuses = useQuery(orpc.availability.getForOrg.queryOptions());

  if (members.isLoading || statuses.isLoading) {
    return (
      <Container className="items-center justify-center">
        <Spinner size="lg" />
      </Container>
    );
  }

  const list = members.data ?? [];
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

  return (
    <Container>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
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
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </Text>
          <Text
            style={{
              fontFamily: SERIF,
              fontSize: 30,
              fontWeight: "600",
              color: C.ink,
              marginTop: 6,
            }}
          >
            Who's around?
          </Text>
          <Text
            style={{
              fontFamily: SERIF,
              fontSize: 15,
              color: C.inkBody,
              marginTop: 8,
              lineHeight: 22,
            }}
          >
            <Text style={{ color: C.stAvailable, fontWeight: "600" }}>
              {available.length} {available.length === 1 ? "teammate is" : "teammates are"}{" "}
              available right now.
            </Text>
            {focused > 0 && ` ${focused} ${focused === 1 ? "is" : "are"} heads-down.`}
            {rest.length > 0 && ` ${rest.length} ${rest.length === 1 ? "is" : "are"} away.`}
          </Text>
        </View>

        {list.length === 0 ? (
          <View className="items-center py-16 px-6">
            <Text style={{ fontFamily: SERIF, fontSize: 17, fontWeight: "600", color: C.ink }}>
              Nobody here yet
            </Text>
            <Text className="text-center text-sm mt-1" style={{ color: C.inkMuted }}>
              Invite teammates and their status will show up here automatically.
            </Text>
          </View>
        ) : (
          <>
            {available.length > 0 && (
              <>
                <View
                  className="flex-row items-baseline gap-2 px-4 mt-7 mb-3 border-b pb-2"
                  style={{ borderColor: C.lineStrong }}
                >
                  <Text
                    style={{ fontFamily: SERIF, fontSize: 16, fontWeight: "600", color: C.ink }}
                  >
                    Available now
                  </Text>
                  <Text style={{ fontFamily: "monospace", fontSize: 11, color: C.inkMuted }}>
                    {available.length}
                  </Text>
                </View>
                {available.map((m) => {
                  const note = statusMap.get(m.id)?.note ?? null;
                  return (
                    <Link
                      key={m.id}
                      href={{ pathname: "/team/[id]", params: { id: m.id } }}
                      asChild
                    >
                      <TouchableOpacity activeOpacity={0.7}>
                        <View
                          className="mx-4 mb-2.5 flex-row items-center gap-3.5 px-4 py-3.5 rounded-xl border"
                          style={{ backgroundColor: C.card, borderColor: C.line }}
                        >
                          <View className="relative">
                            <View
                              className="w-[46px] h-[46px] rounded-full items-center justify-center"
                              style={{ backgroundColor: C.ember }}
                            >
                              <Text
                                style={{
                                  fontFamily: SERIF,
                                  fontSize: 15,
                                  fontWeight: "600",
                                  color: "#fff",
                                }}
                              >
                                {initials(m.name)}
                              </Text>
                            </View>
                            <View
                              className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                              style={{ backgroundColor: C.stAvailable, borderColor: C.card }}
                            />
                          </View>
                          <View className="flex-1 min-w-0">
                            <Text
                              className="text-sm font-semibold"
                              numberOfLines={1}
                              style={{ color: C.ink }}
                            >
                              {m.name}
                            </Text>
                            <Text
                              className="text-xs"
                              numberOfLines={1}
                              style={{ color: C.inkMuted }}
                            >
                              {m.jobRole ?? m.email}
                            </Text>
                            {note && (
                              <Text
                                style={{
                                  fontFamily: SERIF,
                                  fontStyle: "italic",
                                  fontSize: 12,
                                  color: C.inkMuted,
                                }}
                              >
                                {note}
                              </Text>
                            )}
                          </View>
                          <View className="items-end">
                            <Text style={{ fontFamily: "monospace", fontSize: 12.5, color: C.ink }}>
                              {localTime(m.timezone)}
                            </Text>
                            <Text className="text-[10px]" style={{ color: C.inkMuted }}>
                              local
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    </Link>
                  );
                })}
              </>
            )}

            {rest.length > 0 && (
              <>
                <View
                  className="flex-row items-baseline gap-2 px-4 mt-6 mb-1 border-b pb-2"
                  style={{ borderColor: C.lineStrong }}
                >
                  <Text
                    style={{ fontFamily: SERIF, fontSize: 16, fontWeight: "600", color: C.ink }}
                  >
                    Focused & away
                  </Text>
                  <Text style={{ fontFamily: "monospace", fontSize: 11, color: C.inkMuted }}>
                    {rest.length}
                  </Text>
                </View>
                {rest.map((m) => {
                  const st = STATUS_META[statusMap.get(m.id)?.status ?? "offline"];
                  const note = statusMap.get(m.id)?.note ?? null;
                  return (
                    <Link
                      key={m.id}
                      href={{ pathname: "/team/[id]", params: { id: m.id } }}
                      asChild
                    >
                      <TouchableOpacity
                        activeOpacity={0.7}
                        className="px-4 py-3 border-b"
                        style={{ borderColor: "#efeae0" }}
                      >
                        <View className="flex-row items-center gap-3">
                          <View className="relative">
                            <View
                              className="w-8 h-8 rounded-full items-center justify-center"
                              style={{ backgroundColor: C.paperDeep }}
                            >
                              <Text
                                style={{
                                  fontFamily: "monospace",
                                  fontSize: 10.5,
                                  fontWeight: "500",
                                  color: C.ink,
                                }}
                              >
                                {initials(m.name)}
                              </Text>
                            </View>
                            <View
                              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                              style={{ backgroundColor: st.color, borderColor: C.paper }}
                            />
                          </View>
                          <View className="flex-1 min-w-0">
                            <Text
                              className="text-[13px] font-semibold"
                              numberOfLines={1}
                              style={{ color: C.ink }}
                            >
                              {m.name}
                            </Text>
                            <Text
                              className="text-[11.5px]"
                              numberOfLines={1}
                              style={{ color: C.inkMuted }}
                            >
                              {m.jobRole ?? m.email}
                            </Text>
                          </View>
                          <View className="items-end">
                            <View className="flex-row items-center gap-1.5">
                              <View
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: st.color }}
                              />
                              <Text
                                className="text-[12px] font-medium"
                                style={{ color: C.inkBody }}
                              >
                                {st.label}
                              </Text>
                            </View>
                            <Text
                              style={{ fontFamily: "monospace", fontSize: 10, color: C.inkMuted }}
                            >
                              {localTime(m.timezone)}
                            </Text>
                          </View>
                        </View>
                        {note && (
                          <Text
                            className="text-xs mt-1 ml-[44px]"
                            style={{ fontFamily: SERIF, fontStyle: "italic", color: C.inkMuted }}
                          >
                            {note}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </Link>
                  );
                })}
              </>
            )}
          </>
        )}
      </ScrollView>
    </Container>
  );
}
