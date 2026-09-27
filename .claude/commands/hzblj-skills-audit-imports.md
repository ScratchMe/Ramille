---
description: Audit the monorepo against the project structure boundaries and dependency direction
argument-hint: [optional package or path to scope]
allowed-tools: Bash(git grep:*), Grep, Glob, Read
disable-model-invocation: true
---

Audit the workspace (or `$ARGUMENTS` if provided) against the `project` skill's rules and report violations.

Check for:
- **Deep imports** — any import that reaches past a package entry into its internals (e.g. `@scope/feature-x/src/...`). Imports must target the package name / its public entry only.
- **Dependency direction** — `apps/* → feature-* → platform-* → core-*`. Flag any `core-*` importing `platform-*`/`feature-*`/an app, any `platform-*` importing a `feature-*` or app, and any `feature-*` importing another feature's internals or an app.
- **Circular dependencies** between packages.
- **Default exports** — the repo uses named exports only.

Use grep/glob across the workspace to find offenders. Report as a table with `file:line`, the rule violated, and the fix. If everything is clean, say so explicitly. Do not edit — this is an audit (hand fixes to `monorepo-architect` or `/hzblj-skills-refactor`).

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
