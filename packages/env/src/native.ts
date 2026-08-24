import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "EXPO_PUBLIC_",
  client: {
    EXPO_PUBLIC_SERVER_URL: z.url(),
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID: z.string().min(1).optional(),
    EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID: z.string().min(1).optional(),
    EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID: z.string().min(1).optional(),
    EXPO_PUBLIC_CLERK_GOOGLE_IOS_URL_SCHEME: z.string().min(1).optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
