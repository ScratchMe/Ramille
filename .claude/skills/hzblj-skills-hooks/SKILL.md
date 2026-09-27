---
name: hzblj-skills-hooks
description: >-
  Rules for custom hooks — naming, logic extraction, and separation of view and logic. Use when creating or refactoring hooks. Triggers on: custom hook, use prefix, extract logic into hook, separate view and logic, move state out of component.
disable-model-invocation: true
---

# Hooks

- All custom hooks must start with `use`.
- When it improves readability, extract logic into a dedicated hook.
- Move state, effects, queries, and handlers out of the component into hooks when appropriate.
- Keep view and logic separated.

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
