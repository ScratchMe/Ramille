---
description: Scaffold a new feature-* package following the project (monorepo) skill
argument-hint: <feature-name>
disable-model-invocation: true
---

Scaffold a new **`feature-$ARGUMENTS`** package following the `project` skill (Turborepo monorepo).

First read the workspace root (`package.json`, `turbo.json`, `pnpm-workspace.yaml` / workspaces) to learn the scope and package manager. If the scope or target location is ambiguous, ask before creating files.

Then create:
- `packages/feature-$ARGUMENTS/` with a `package.json` named `@<scope>/feature-$ARGUMENTS`, `exports` pointing at the entry.
- `index.ts` re-exporting only the public API.
- The allowed internal subfolders as needed: `components`, `hooks`, `consts` — each feature/component in its own folder with a name-matched main file and its own `index.ts` re-export.

Follow the standards: **named exports only**, **`const` arrow functions**, **`type` over `interface`**. Respect dependency direction — a feature may depend on `core-*` and `platform-*` packages, **never** on another feature's internals or on an app. Wire the new package into the workspace and confirm it builds/typechecks.

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
