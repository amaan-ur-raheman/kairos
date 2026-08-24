import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

function getVercelOrigin() {
  const vercelUrl =
    process.env.VERCEL_ENV === "production"
      ? (process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL)
      : (process.env.VERCEL_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (!vercelUrl) return undefined;
  return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
}

const vercelOrigin = getVercelOrigin();

const runtimeEnv = {
  ...process.env,
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? vercelOrigin,
};

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    CLERK_SECRET_KEY: z.string().min(1),
    CLERK_PUBLISHABLE_KEY: z.string().min(1),
    CORS_ORIGIN: z.url(),
    // Extra token audiences accepted by Clerk auth (comma-separated), e.g. for native clients.
    CLERK_AUTHORIZED_PARTIES: z.string().optional(),
    // When set, /rpc rate limiting uses Upstash Redis (global across isolates);
    // otherwise it falls back to an in-memory per-isolate window.
    UPSTASH_REDIS_REST_URL: z.url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    VERCEL: z.string().optional(),
  },
  runtimeEnv: runtimeEnv,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
