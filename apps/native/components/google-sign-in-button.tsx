import { useSignInWithGoogle } from "@clerk/expo/google";
import { useRouter } from "expo-router";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { C } from "@/lib/theme";

type GoogleSignInButtonProps = {
  label?: string;
};

export function GoogleSignInButton({ label = "Continue with Google" }: GoogleSignInButtonProps) {
  const { startGoogleAuthenticationFlow } = useSignInWithGoogle();
  const router = useRouter();

  if (Platform.OS !== "ios" && Platform.OS !== "android") return null;

  const handlePress = async () => {
    try {
      const { createdSessionId, setActive } = await startGoogleAuthenticationFlow();

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace("/");
      }
    } catch (error: unknown) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : undefined;

      if (code === "SIGN_IN_CANCELLED" || code === "-5") return;

      const message = error instanceof Error ? error.message : "Google sign-in failed.";
      Alert.alert("Unable to sign in", message);
    }
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={handlePress}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <View style={styles.mark}>
          <Text style={styles.markText}>G</Text>
        </View>
        <Text style={styles.buttonText}>{label}</Text>
      </Pressable>
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: C.card,
    borderColor: C.lineStrong,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pressed: { opacity: 0.7 },
  mark: {
    alignItems: "center",
    backgroundColor: "#4285F4",
    borderRadius: 10,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  markText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  buttonText: { color: C.inkBody, fontSize: 15, fontWeight: "600" },
  divider: { alignItems: "center", flexDirection: "row", gap: 10, marginVertical: 18 },
  dividerLine: { backgroundColor: C.line, flex: 1, height: 1 },
  dividerText: { color: C.inkMuted, fontSize: 11, fontWeight: "600" },
});
