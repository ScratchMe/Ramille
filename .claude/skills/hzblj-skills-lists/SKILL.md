---
name: hzblj-skills-lists
description: >-
  Strict performance rules for lists — FlashList, stable renderItem, extracted item components, and naming patterns. Use when building or optimizing list views. Triggers on: FlashList, FlatList, renderItem, estimatedItemSize, list performance, list item component, list naming.
disable-model-invocation: true
---

# Lists (Strict Performance Rules)

- Always use `FlashList`.
- Do not use `FlatList` unless strongly justified.
- `estimatedItemSize` must be provided.
- `renderItem` must be stable.
- No anonymous arrow functions in list rendering.
- Extract list items into dedicated components.
- No inline JSX inside `.map()`.

List feature naming pattern:

- `SpellList.tsx`
- `SpellListCard.tsx`
- `SpellListEmpty.tsx`
- `SpellListSkeleton.tsx`
- `SpellListHeader.tsx`

Prefix related files with the feature name.

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
