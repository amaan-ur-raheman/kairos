import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  server: {
    port: 3001,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [tailwindcss(), tanstackStart(), nitro(), viteReact()],
  // Bundle all SSR deps at build time: Vercel functions have no node_modules at
  // runtime. In dev, keep deps externalized — the module runner can't evaluate
  // CJS packages (react) inlined via noExternal.
  ssr: command === "build" ? { noExternal: true } : undefined,
}));
