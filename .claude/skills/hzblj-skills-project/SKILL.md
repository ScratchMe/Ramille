---
name: hzblj-skills-project
description: >-
  Monorepo project structure — Turborepo layout with packages/core-*, packages/platform-*, packages/feature-*, and deployable apps (mobile, web, backend, e2e), dependency direction, package boundaries, public-API exports, and per-package internal structure. Use when creating packages/features/apps, wiring dependencies, or structuring a module. Triggers on: monorepo, turborepo, package, core-, feature-, platform-, apps, index.ts, public API, deep import, dependency direction, workspace.
disable-model-invocation: true
---

# Project Structure (Monorepo)

The repo is a Turborepo monorepo split into two workspaces: `packages/` holds the shared, versionless building blocks, and `apps/` holds the deployable apps. Everything in `packages/` is one of three families — `core-*`, `platform-*`, or `feature-*` — and each `apps/` entry is a deployable target (`mobile`, `web`, `backend`, `e2e`). Each family has a fixed job and a fixed place in the dependency graph. Get the family and the direction right and the graph stays acyclic, features stay swappable, and a change to one feature can never ripple sideways into another.

Two rules hold the whole thing together: **dependencies only ever point downward** (`apps/* → feature-* → platform-* → core-*`), and **every package is a black box** reached only through its published entry point. The rest of this file is those two rules plus the naming and internal-structure conventions that keep them enforceable.

```
packages/
  core-*/          platform-agnostic foundation — reusable, no platform knowledge
                   (core-ui, core-utils, core-hooks, core-trpc, core-store,
                   core-config, core-i18n, core-types …)
  platform-*/      platform-specific building blocks — native modules, React Native
                   UI, device APIs (platform-ui, platform-navigation, platform-storage …)
  feature-*/       product features — one capability each (feature-quidditch,
                   feature-sorting-hat, feature-auth …), sub-features via feature-x-y
apps/
  mobile/          Expo / React Native app
  web/             Next.js app
  backend/         API / server
  e2e/             end-to-end tests (Detox / Playwright)
```

## Quick Reference

| Family | Location | Role | May depend on | Never depends on |
| --- | --- | --- | --- | --- |
| `core-*` | `packages/core-*` | Platform-agnostic foundation | other `core-*` only | `platform-*`, `feature-*`, apps |
| `platform-*` | `packages/platform-*` | Platform-specific foundation | `core-*`, sibling `platform-*` | `feature-*`, apps |
| `feature-*` | `packages/feature-*` | One self-contained product capability | `core-*`, `platform-*`, own sub-features | other features' internals, apps |
| app | `apps/{mobile,web,backend,e2e}` | Deployable app; wires everything together | `feature-*`, `platform-*`, `core-*` | — (nothing depends on an app) |

## The Families

### `core-*` — the platform-agnostic foundation

`core-*` packages are the reusable, **platform-agnostic** foundation the rest of the repo is built on: `core-ui`, `core-utils`, `core-hooks`, `core-trpc` (the API layer), `core-store`, `core-config`, `core-i18n`, `core-types`, `core-theme`, `core-services`, and so on. They contain no product logic, no knowledge of any single feature, and no platform-specific code — a `core-ui` primitive doesn't know the Sorting Hat exists, and it doesn't reach for a native module.

Core sits at the bottom of the graph. A core package **may build on other core packages** (`core-ui` can use `core-utils`), but it must never import a `platform-*`, `feature-*`, or app. If a core package finds itself needing a native module, that code belongs in `platform-*`; if it needs something from a feature, the dependency is pointing the wrong way.

### `platform-*` — the platform-specific foundation

`platform-*` packages hold the code that **can't be platform-agnostic**: native modules, React Native / native UI, device APIs, and other target-specific building blocks — `platform-ui`, `platform-navigation`, `platform-storage`, and so on. They keep the platform-specific surface in one layer so features stay mostly declarative.

Platform sits just above core: a `platform-*` package **may depend on `core-*`** (and on sibling `platform-*` packages), but never on a `feature-*` or an app. Think of it as core's platform-bound half — same "foundation" role, but tied to a runtime.

### `feature-*` — one product capability

A `feature-*` package is a single, self-contained product capability — `feature-auth`, `feature-quidditch`, `feature-sorting-hat` — composed out of `core-*` and `platform-*` pieces. It owns its screens, its hooks, its local state, and its slice of the API surface, and it exposes a small public API for apps to mount.

Large features decompose into **sub-features** through naming, not nesting: `feature-project`, `feature-project-create`, `feature-project-create-detail`. A parent feature may depend on its own sub-features (`feature-project` → `feature-project-create`), but one feature must never reach into an *unrelated* feature's internals. If two features need to share code, that shared code moves **down** into `core-*` (or `platform-*` if it's platform-bound) — it does not travel sideways.

### `apps/*` — the deployable apps

The `apps/*` entries are the deployable targets, and the top of the graph:

| App | Stack | Holds |
| --- | --- | --- |
| `mobile` | Expo / React Native | native navigation, mobile shell, device wiring |
| `web` | Next.js | routing/pages, web shell, SSR concerns |
| `backend` | API / server | server entrypoint, deployment wiring |
| `e2e` | Detox / Playwright | end-to-end tests across the apps |

An app is a **composition root**: it imports features, mounts them into routes/screens, and supplies the final platform wiring. It should be thin — mostly wiring, little logic. Nothing depends on an app; apps are the top of the graph and the leaves of the dependency tree. Apps are **not** prefixed — they're just `mobile`, `web`, `backend`, `e2e`.

## Dependency Direction (Strict)

Dependencies flow in exactly one direction:

```
apps/*  →  feature-*  →  platform-*  →  core-*
```

A package may depend on **any layer below it** and may skip a layer (a feature that needs no native code depends on `core-*` directly), but it must **never point upward**.

- `core-*` never imports `platform-*`, `feature-*`, or an app.
- `platform-*` composes `core-*` (and sibling `platform-*`); never a feature or app.
- `feature-*` composes `core-*` and `platform-*`; it never reaches into another feature's internals (only its own sub-features).
- `apps/*` compose `feature-*`, `platform-*`, and `core-*`.
- No circular dependencies, ever — not between packages, not between features.

```jsonc
// Bad — a core package reaching UP into a feature (arrow points the wrong way)
// packages/core-ui/package.json
{
  "name": "@hogwarts/core-ui",
  "dependencies": {
    "@hogwarts/feature-sorting-hat": "workspace:*", // core must not know features
    "@hogwarts/core-utils": "workspace:*"
  }
}
```

```jsonc
// Good — the feature depends downward on core and platform; both stay pure foundation
// packages/feature-sorting-hat/package.json
{
  "name": "@hogwarts/feature-sorting-hat",
  "dependencies": {
    "@hogwarts/core-ui": "workspace:*",
    "@hogwarts/core-hooks": "workspace:*",
    "@hogwarts/platform-ui": "workspace:*"
  }
}
```

If a feature needs logic from another feature, that is the signal to push the shared logic **down** into `core-*` (or `platform-*` if it's platform-bound), never to add a sideways `feature → feature` edge.

## Package Boundaries & Public API

Every package is a **black box**. It exposes its public API through a single entry point — its root `index.ts`, declared in `package.json` `exports` — and everything else is private. Consumers import from the **package name**, never from a file path inside it.

```jsonc
// packages/feature-quidditch/package.json — the entry point IS the public API
{
  "name": "@hogwarts/feature-quidditch",
  "private": true,
  "type": "module",
  "exports": { ".": "./index.ts" }
}
```

```ts
// Bad — deep import reaches past the boundary into private internals
import { Snitch } from '@hogwarts/feature-quidditch/src/components/Snitch/Snitch'
import { formatScore } from '@hogwarts/core-utils/src/score/formatScore'
```

```ts
// Good — import from the package name; only what it chose to export is reachable
import { QuidditchPitch } from '@hogwarts/feature-quidditch'
import { formatScore } from '@hogwarts/core-utils'
```

A deep import is a boundary violation: it couples you to another package's internal layout, so any refactor there silently breaks you, and it lets you reach code the author never meant to publish. If you need something that isn't exported, add it to that package's `index.ts` on purpose — don't tunnel around the boundary.

## Naming Conventions

Package names are **kebab-case**. Packages follow a fixed shape per family; apps are bare target names with no prefix:

| Pattern | Example | Meaning |
| --- | --- | --- |
| `core-<domain>` | `core-ui`, `core-utils`, `core-trpc` | a platform-agnostic foundation domain |
| `platform-<domain>` | `platform-ui`, `platform-navigation` | a platform-specific building block |
| `feature-<name>` | `feature-quidditch`, `feature-sorting-hat` | one product capability |
| `feature-<name>-<subfeature>` | `feature-project-create` | a sub-feature of a feature |
| app (no prefix) | `mobile`, `web`, `backend`, `e2e` | a deployable app |

The scoped workspace name mirrors the folder: `packages/feature-quidditch` publishes as `@hogwarts/feature-quidditch`; `apps/mobile` is `@hogwarts/mobile`.

## Named Exports Only

**No default exports anywhere.** Always use named exports — for components, hooks, utilities, and types alike. Named exports keep the name stable across the codebase, make re-exporting from `index.ts` explicit, and let tooling find and rename symbols reliably.

```ts
// Bad — default export; the import name is a free-for-all and re-exports are fuzzy
export default function SortingHat() {}
import Hat from './SortingHat' // could be named anything
```

```ts
// Good — named export; one canonical name everywhere
export const SortingHat = () => {}
import { SortingHat } from './SortingHat'
```

## Inside a Package or Feature

The same structural discipline applies *within* a package. Each feature or component is a folder that behaves like a mini-package — a strict API boundary with its own `index.ts`.

- Each feature or component has its own folder.
- The main file name matches the feature/component name (`SortingHat/SortingHat.tsx`).
- Each folder has an `index.ts` that re-exports its public API.
- Treat each folder as a strict API boundary — do not import deep internal files from outside the folder.
- No cross-feature deep imports.
- No circular dependencies.
- Keep the structure flat and predictable.
- The only allowed internal subfolders are `components`, `hooks`, and `consts`.

```
packages/feature-sorting-hat/
  index.ts                    // export * from './src'
  package.json                // "exports": { ".": "./index.ts" }
  src/
    index.ts                  // re-exports the feature's public API
    SortingHat.tsx            // main file — matches the feature name
    SortingHatSkeleton.tsx
    components/               // internal building blocks
    hooks/                    // internal hooks
    consts/                   // internal constants
```

```ts
// packages/feature-sorting-hat/src/index.ts — the public API, made of named re-exports
export { SortingHat } from './SortingHat'
export { SortingHatSkeleton } from './SortingHatSkeleton'
```

```ts
// Bad — reaching into another feature's private file
import { HouseBadge } from '@hogwarts/feature-quidditch/src/components/HouseBadge/HouseBadge'
```

```ts
// Good — go through the boundary; shared UI belongs in core anyway
import { HouseBadge } from '@hogwarts/core-ui'
```

## Common Mistakes

| Mistake | Fix |
| --- | --- |
| `core-*` importing a `platform-*`, `feature-*`, or app | Reverse the arrow — move platform code to `platform-*`, shared logic down into core |
| Native module or RN-only UI living in `core-*` | Move it to `platform-*` — core stays platform-agnostic |
| `platform-*` importing a `feature-*` | Reverse the arrow — platform is foundation, it never knows features |
| Sharing code by importing `feature-a` into `feature-b` | Extract the shared piece down into `core-*` (or `platform-*` if platform-bound) |
| Deep import into another package's internal file | Import from the package name; export it from that package's `index.ts` |
| Business logic living in an app | Push it into a `feature-*` (or `core-*`/`platform-*`); apps only wire and mount |
| Prefixing an app `platform-mobile` | Apps are bare names — `mobile`, `web`, `backend`, `e2e` |
| Default export | Named export everywhere |
| `PascalCase` / `camelCase` package name | kebab-case: `core-ui`, `platform-ui`, `feature-sorting-hat` |
| Nesting a sub-feature folder inside its parent | Make it a sibling package via `feature-x-y` naming |
| Folder without an `index.ts` boundary | Add `index.ts` re-exporting the public API |
| Internal subfolder other than `components`/`hooks`/`consts` | Flatten it into one of the three allowed subfolders |
| Circular dependency between packages/features | Break the cycle — extract the shared code down a layer |

## Review Checklist

- [ ] New code lives in the right family: platform-agnostic foundation → `core-*`, platform-specific foundation → `platform-*`, one capability → `feature-*`, deployable → `apps/*`.
- [ ] Dependencies only point downward: `apps/* → feature-* → platform-* → core-*`; no sideways `feature → feature` edges and no cycles.
- [ ] `core-*` imports only other `core-*` — never platform, feature, or app.
- [ ] `platform-*` imports only `core-*` / sibling `platform-*` — never a feature or app.
- [ ] All imports use the package name; no deep imports past any package's `index.ts`.
- [ ] Package/folder is reached only through its public `index.ts` / `exports`.
- [ ] Names are kebab-case and match their family pattern (`core-`, `platform-`, `feature-`, `feature-x-y`); apps are bare (`mobile`, `web`, `backend`, `e2e`).
- [ ] Named exports only — no default exports.
- [ ] Each feature/component folder has an `index.ts`, a main file matching its name, and only `components`/`hooks`/`consts` subfolders.

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
