import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";

import "@/global.css";
import { env } from "@kairos/env/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { HeroUINativeProvider } from "heroui-native";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { Uniwind } from "uniwind";

import { setClerkAuthTokenGetter } from "@/utils/clerk-auth";
import { queryClient } from "@/utils/orpc";

export const unstable_settings = {
  initialRouteName: "(drawer)",
};

function ClerkApiAuthBridge() {
  const { getToken } = useAuth();

  useEffect(() => {
    Uniwind.setTheme("light"); // Ember is a light-only theme
    setClerkAuthTokenGetter(getToken);

    return () => {
      setClerkAuthTokenGetter(null);
    };
  }, [getToken]);

  return null;
}

function StackLayout() {
  return (
    <Stack screenOptions={{}}>
      <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function Layout() {
  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <ClerkApiAuthBridge />
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#faf7f2" }}>
          <KeyboardProvider>
            <HeroUINativeProvider>
              <StackLayout />
            </HeroUINativeProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
