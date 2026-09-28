---
description: Scaffold a component following component-architecture + clean-code standards
argument-hint: <ComponentName> [target path]
disable-model-invocation: true
---

Create the **`$ARGUMENTS`** component following the `component-architecture` and clean-code standards.

- Give it its own folder; the main file is named after the component.
- Add an `index.ts` that re-exports the public API.
- Export a **named `const` arrow** component (no default export, no `function`).
- Define **explicit `type` props** (no inline prop types in the signature; `type` over `interface`, narrow unions, no `any`).
- Use `cn()` for any conditional or dynamic classNames.
- Keep the component focused on rendering — extract non-trivial logic into a `use…` hook in the `hooks` subfolder.
- Pull spacing / durations / layout magic numbers into `UPPER_SNAKE_CASE` constants.

If a target path is given in `$ARGUMENTS`, create it there; otherwise infer the right location from the existing project structure and confirm if unclear.

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
