import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({
  path: "../../apps/server/.env",
});

function migrationDatabaseUrl() {
  const rawUrl = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
  if (!rawUrl) throw new Error("DATABASE_URL or DATABASE_URL_DIRECT must be set for migrations");

  // Drizzle Kit migrations need a TCP-compatible Neon endpoint. Neon exposes
  // pooled hostnames with `-pooler`; normalize those when the local env file
  // has not been given a separate direct endpoint.
  const url = new URL(rawUrl);
  if (url.hostname.endsWith(".neon.tech") && url.hostname.includes("-pooler.")) {
    url.hostname = url.hostname.replace("-pooler.", ".");
  }
  return url.toString();
}

export default defineConfig({
  schema: "./src/schema",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationDatabaseUrl(),
  },
});
