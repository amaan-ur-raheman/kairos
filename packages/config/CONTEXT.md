# Shared config package context

Minimal shared build configuration for the monorepo.

- `tsconfig.base.json` — base TypeScript config all workspaces extend.
- Currently no ESLint/Biome/Prettier config here on purpose: Biome is configured once at the repo root (`biome.json`) and covers linting + formatting + import sorting for every workspace. Change lint/format behavior there, not per-package.
