import { useSignIn } from "@clerk/expo";
import { type Href, Link, useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { C, SERIF } from "@/lib/theme";

function pushDecoratedUrl(
  router: ReturnType<typeof useRouter>,
  decorateUrl: (url: string) => string,
  href: string,
) {
  const url = decorateUrl(href);
  const nextHref = url.startsWith("http") ? new URL(url).pathname : url;
  router.push(nextHref as Href);
}

export default function Page() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const emailCodeFactor = signIn.supportedSecondFactors.find(
    (factor) => factor.strategy === "email_code",
  );
  const requiresEmailCode =
    signIn.status === "needs_client_trust" ||
    (signIn.status === "needs_second_factor" && !!emailCodeFactor);

  const handleSubmit = async () => {
    setStatusMessage(null);

    const { error } = await signIn.password({
      emailAddress,
      password,
    });

    if (error) {
      setStatusMessage(error.longMessage ?? "Unable to sign in. Please try again.");
      return;
    }

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) return;
          pushDecoratedUrl(router, decorateUrl, "/");
        },
      });
    } else if (signIn.status === "needs_second_factor" || signIn.status === "needs_client_trust") {
      if (emailCodeFactor) {
        await signIn.mfa.sendEmailCode();
        setStatusMessage(`We sent a verification code to ${emailCodeFactor.safeIdentifier}.`);
      } else {
        setStatusMessage(
          "A second factor is required, but this screen only supports email codes right now.",
        );
      }
    } else {
      setStatusMessage("Sign-in could not be completed. Please try again.");
    }
  };

  const handleVerify = async () => {
    setStatusMessage(null);

    await signIn.mfa.verifyEmailCode({ code });

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) return;
          pushDecoratedUrl(router, decorateUrl, "/");
        },
      });
    } else {
      setStatusMessage("That code did not complete sign-in. Please try again.");
    }
  };

  const styles = makeStyles();

  if (requiresEmailCode) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Verify your account</Text>
        {statusMessage && <Text style={styles.helper}>{statusMessage}</Text>}
        <TextInput
          style={styles.input}
          value={code}
          placeholder="Enter your verification code"
          placeholderTextColor={C.inkMuted}
          onChangeText={(value) => setCode(value)}
          keyboardType="numeric"
        />
        {errors.fields.code && <Text style={styles.error}>{errors.fields.code.message}</Text>}
        <Pressable
          style={({ pressed }) => [
            styles.button,
            fetchStatus === "fetching" && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleVerify}
          disabled={fetchStatus === "fetching"}
        >
          <Text style={styles.buttonText}>Verify</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
          onPress={() => signIn.mfa.sendEmailCode()}
        >
          <Text style={styles.secondaryButtonText}>I need a new code</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <View style={styles.logoMark}>
          <Text style={styles.logoMarkText}>K</Text>
        </View>
        <Text style={styles.brandName}>kairos</Text>
      </View>

      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Sign in to see your team's day.</Text>

      <GoogleSignInButton />

      {statusMessage && <Text style={styles.helper}>{statusMessage}</Text>}

      <Text style={styles.label}>Email address</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        value={emailAddress}
        placeholder="you@fieldnote.studio"
        placeholderTextColor={C.inkMuted}
        onChangeText={(value) => setEmailAddress(value)}
        keyboardType="email-address"
      />
      {errors.fields.identifier && (
        <Text style={styles.error}>{errors.fields.identifier.message}</Text>
      )}

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        value={password}
        placeholder="Your password"
        placeholderTextColor={C.inkMuted}
        secureTextEntry
        onChangeText={(value) => setPassword(value)}
      />
      {errors.fields.password && <Text style={styles.error}>{errors.fields.password.message}</Text>}

      <Pressable
        style={({ pressed }) => [
          styles.button,
          (!emailAddress || !password || fetchStatus === "fetching") && styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}
        onPress={handleSubmit}
        disabled={!emailAddress || !password || fetchStatus === "fetching"}
      >
        <Text style={styles.buttonText}>Sign in</Text>
      </Pressable>

      <View style={styles.linkContainer}>
        <Text style={styles.linkPrompt}>New here? </Text>
        <Link href="/sign-up">
          <Text style={styles.linkText}>Create an account</Text>
        </Link>
      </View>
    </View>
  );
}

function makeStyles() {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 24,
      gap: 12,
      justifyContent: "center",
      backgroundColor: C.paper,
    },
    brandRow: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 28 },
    logoMark: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: C.ember,
      alignItems: "center",
      justifyContent: "center",
    },
    logoMarkText: { color: "#fff", fontSize: 13, fontWeight: "700", fontFamily: SERIF },
    brandName: { fontFamily: SERIF, fontWeight: "600", fontSize: 20, color: C.ink },
    title: { fontFamily: SERIF, fontWeight: "600", fontSize: 28, color: C.ink, marginBottom: 4 },
    subtitle: { fontSize: 14, color: C.inkMuted, marginBottom: 24 },
    label: { fontWeight: "600", fontSize: 12, color: C.inkBody, marginBottom: 6 },
    input: {
      borderWidth: 1,
      borderColor: C.lineStrong,
      borderRadius: 11,
      padding: 13,
      fontSize: 15,
      backgroundColor: C.card,
      color: C.ink,
      marginBottom: 16,
    },
    button: {
      backgroundColor: C.ember,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 11,
      alignItems: "center",
      marginTop: 8,
    },
    buttonPressed: { transform: [{ scale: 0.98 }], backgroundColor: C.emberDeep },
    buttonDisabled: { opacity: 0.5 },
    buttonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
    secondaryButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      alignItems: "center",
      marginTop: 8,
    },
    secondaryButtonText: { color: C.ember, fontWeight: "600", fontSize: 14 },
    linkContainer: { flexDirection: "row", gap: 4, marginTop: 20, justifyContent: "center" },
    linkPrompt: { color: C.inkMuted, fontSize: 13.5 },
    linkText: { color: C.ember, fontWeight: "600", fontSize: 13.5 },
    error: { color: C.stBusy, fontSize: 12, marginTop: -8 },
    helper: { color: C.inkBody, fontSize: 13, marginBottom: 8 },
  });
}
