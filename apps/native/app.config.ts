import type { ExpoConfig } from "expo/config";

const androidPackage = process.env.KAIROS_ANDROID_PACKAGE ?? "com.amaan.kairos";
const iosBundleIdentifier = process.env.KAIROS_IOS_BUNDLE_IDENTIFIER ?? "com.amaan.kairos";

const config = {
  scheme: "kairos",
  userInterfaceStyle: "automatic",
  orientation: "default",
  name: "kairos",
  slug: "kairos",
  version: "1.0.0",
  icon: "./assets/images/icon.png",
  splash: {
    image: "./assets/images/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#F8F4EE",
  },
  ios: {
    bundleIdentifier: iosBundleIdentifier,
    buildNumber: "1",
    icon: "./assets/app-icon.icon",
  },
  android: {
    package: androidPackage,
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
  },
  web: {
    bundler: "metro",
    favicon: "./assets/images/favicon.png",
  },
  plugins: ["expo-font", "@clerk/expo", "@clerk/expo-google-signin"],
  extra: {
    EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID,
    EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID:
      process.env.EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID,
    EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID,
    EXPO_PUBLIC_CLERK_GOOGLE_IOS_URL_SCHEME: process.env.EXPO_PUBLIC_CLERK_GOOGLE_IOS_URL_SCHEME,
  },
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config as ExpoConfig;
