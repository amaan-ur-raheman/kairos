# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- `CONTEXT-MAP.md` at the repo root. Read the `CONTEXT.md` files relevant to the topic.
- `docs/adr/` for system wide decisions.
- Context specific ADR directories under the relevant area, when they exist.

If any of these files do not exist, proceed silently. Do not flag their absence or suggest creating them upfront. Create them lazily when terms or decisions are actually resolved.

## File structure

This is a multi context monorepo:

```
/
├── CONTEXT-MAP.md
├── docs/adr/                         system wide decisions
├── apps/
│   ├── web/CONTEXT.md
│   ├── native/CONTEXT.md
│   └── server/CONTEXT.md
└── packages/
    ├── api/CONTEXT.md
    ├── db/CONTEXT.md
    ├── env/CONTEXT.md
    ├── ui/CONTEXT.md
    └── config/CONTEXT.md
```

## Use the glossary vocabulary

When output names a domain concept, use the term as defined in the relevant `CONTEXT.md`. Do not drift to synonyms that the glossary explicitly avoids.

If the needed concept is not in the glossary yet, reconsider whether new language is being invented or note the gap for domain modeling.

## Flag ADR conflicts

If output contradicts an existing ADR, surface it explicitly rather than silently overriding it:

> _Contradicts ADR-0007 — but worth reopening because…_
