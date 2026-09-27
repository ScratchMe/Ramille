---
name: hzblj-skills-component-architecture
description: >-
  Defines component structure, prop typing, responsibility separation, and ref handling patterns. Use when creating or refactoring React components. Triggers on: component structure, FC, prop type, forwardRef, ref handling, split component, responsibility separation.
disable-model-invocation: true
---

# Component Architecture

- Define components using `FC` and explicit prop `type`.
- Never use `interface` for props.
- No implicit inline returns.
- Always use braces and explicit `return`.
- Prefer multiple small components over one large component.
- Split by responsibility, not file size.
- Components should focus on rendering.
- Business logic should live in hooks.
- API transformation logic should not live inside render files.

## Ref Handling

- Never pass `ref` via regular props.
- Always use `forwardRef` when exposing refs.
- Ref typing must be explicit.
- No optional ref hacks.

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
