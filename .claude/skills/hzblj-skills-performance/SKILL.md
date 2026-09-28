---
name: hzblj-skills-performance
description: >-
  Enforces rendering performance best practices — memoization, stable references, and avoiding unnecessary re-renders. Use when optimizing component performance. Triggers on: re-render, useMemo, useCallback, memoization, stable reference, inline arrow in JSX, inline object prop.
disable-model-invocation: true
---

# Performance Discipline

- Prefer `useMemo` and `useCallback` when values or handlers are passed to children.
- No anonymous arrow functions in JSX.
- No inline object literals in props.
- Keep function references stable.
- Avoid unnecessary re-renders.
- Avoid recreating style objects on each render.
- Performance is a default mindset.

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
