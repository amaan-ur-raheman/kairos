import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "apps/web/src"),
    },
  },
  // Routers import @kairos/db, which reads env at import time. Tests mock the db,
  // but the env schema still needs valid-looking values in CI.
  env: {
    SKIP_ENV_VALIDATION: "true",
    DATABASE_URL: "postgres://ci:ci@localhost:5432/ci",
    CLERK_SECRET_KEY: "sk_test_ci_placeholder",
    CLERK_PUBLISHABLE_KEY: "pk_test_ci_placeholder",
    CORS_ORIGIN: "http://localhost:3001",
  },
  test: {
    environment: "node",
    include: ["apps/**/__tests__/**/*.test.{ts,tsx}", "packages/**/__tests__/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.d.ts",
        "**/*.config.ts",
        "**/__tests__/**",
        "packages/db/src/schema/**",
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 75,
        lines: 80,
      },
    },
  },
});
