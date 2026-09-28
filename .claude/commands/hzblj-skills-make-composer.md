---
description: Refactor a prop-heavy component into a compound/composer following the compound-components skill
argument-hint: <path to component>
disable-model-invocation: true
---

Refactor the component at `$ARGUMENTS` into a **compound/composer** following the
`compound-components` skill, **without changing its rendered output**. This is the
fix when a component has grown a wall of props (`showX`, `variant`, `renderY`,
`headerSlot`, …) that encode layout instead of describing data.

First **read the component and its call sites** (grep for its imports/usages). Map
out two things before editing:

- **The parts** — the distinct sections of the JSX (frame, image, title, badge,
  footer, …). Each becomes a named sub-part.
- **The shared surface** — what the parts read and mutate. Sort it into the three
  buckets: **`state`** (reactive data the parts render), **`actions`** (callbacks,
  grouped where they belong together), **`meta`** (refs, animated refs, shared
  values, static config — never reactive data).

Then build it:

- A **context** defaulting to `null`, plus a **guard hook** (`useX`) that **throws**
  when a part is used outside the provider. The context value is
  `{ state, actions, meta }` for a rich composer (a single flat value is fine for a
  small compound).
- A **`Provider`** part that takes `state` (and any caller-suppliable `actions` like
  `update`) **from above** as props, owns local UI state and creates the `meta`
  refs internally, and **memoizes** the context value with `useMemo`.
- One **small, single-responsibility part per section**, each reading only the
  buckets it needs from the guard hook. Give each a named `type` for its props.
- Turn boolean/enum layout flags and `render*` props into **composition** — the
  caller arranges the parts and drops its own markup between them, so no prop
  survives just to toggle a piece of the tree.
- **Assemble** with `Object.assign(Root, { … })` when there's a single wrapping root,
  or a plain object literal (`export const X = { Provider, Frame, … }`) when the
  `Provider` is one part among siblings. **Export only the compound** — parts stay
  internal.

Follow the repo standards throughout: **`const` arrow functions**, **named exports
only**, **`type` over `interface`**, **no `any`**, narrow unions, `cn()` for
conditional classNames, guard clauses (see `component-architecture`, `type-safety`,
and the `clean-code` skills).

Finally, **update every call site** to the composed JSX form, then run the project's
typecheck/tests if present and confirm the output is unchanged. Summarize as a
Before/After: the old prop list vs the new parts, and report honestly if anything
failed or was skipped. If the component is genuinely simple (one shared value, one
fixed layout), say so and recommend a plain `Root` compound instead of a full
composer rather than over-engineering it.

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
