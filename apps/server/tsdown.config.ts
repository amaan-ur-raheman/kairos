import { defineConfig } from "tsdown";

/**
 * Server build — doubles as the Vercel Functions artifact.
 *
 * With VERCEL_ENABLE_EXPERIMENTAL_BUILD_MODE=1 (project env var), Vercel
 * Services' elysia builder uses this build's dist/index.mjs as the deployed
 * function handler (see .vc-config.json filePathMap). Without it, the default
 * pipeline materializes an EMPTY function (config only, no handler file),
 * which crashes at cold start: "ResolveMessage {} / Bun process exited 1".
 *
 * deps.alwaysBundle inlines ALL npm dependencies (workspace @kairos/*,
 * elysia, drizzle, clerk, …) into one file; Bun and Node builtins stay
 * external — bundling them resolves type stubs (@types/bun) and fails with
 * MISSING_EXPORT. Verified: single file boots and serves /rpc locally.
 */
export default defineConfig({
  entry: "./src/index.ts",
  format: "esm",
  outDir: "./dist",
  clean: true,
  external: [/^bun(:|$)/, /^node:/],
  deps: {
    alwaysBundle: [/.*/],
  },
});
