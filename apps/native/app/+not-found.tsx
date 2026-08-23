import { Link, Stack } from "expo-router";
import { Button, Surface } from "heroui-native";
import { Text, View } from "react-native";

import { Container } from "@/components/container";
import { C, SERIF } from "@/lib/theme";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <Container>
        <View className="flex-1 justify-center items-center p-4">
          <Surface variant="secondary" className="items-center p-6 max-w-sm rounded-lg">
            <View
              className="w-11 h-11 rounded-full border-[1.5px] border-dashed mb-3 items-center justify-center"
              style={{ borderColor: C.lineStrong }}
            >
              <View className="w-5 h-5 rounded-full" style={{ backgroundColor: C.paperDeep }} />
            </View>
            <Text
              style={{
                fontFamily: SERIF,
                fontWeight: "600",
                fontSize: 18,
                color: C.ink,
                marginBottom: 4,
              }}
            >
              Page Not Found
            </Text>
            <Text style={{ color: C.inkMuted, textAlign: "center", marginBottom: 16 }}>
              The page you're looking for doesn't exist.
            </Text>
            <Link href="/" asChild>
              <Button size="sm">Go Home</Button>
            </Link>
          </Surface>
        </View>
      </Container>
    </>
  );
}
