# UI package context

Shared shadcn/ui primitives consumed by the web app (single source of components/styles).

## Layout
- `src/components/` — button, card, input, textarea, checkbox, dropdown-menu, tooltip, sonner (toasts), skeleton, empty.
- `src/lib/utils.ts` — `cn()` helper.
- `components.json` — shadcn CLI config; add new primitives with `npx shadcn@latest add <component> -c packages/ui`.

## Gotchas
- Vendored shadcn files carry targeted `biome-ignore` comments — keep upstream markup instead of "fixing" lint inside them.
- The web app's distinctive look comes from its own CSS variables (`apps/web/src/index.css`), not from this package's theme; these are base primitives.
