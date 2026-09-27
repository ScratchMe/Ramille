---
name: hzblj-skills-atomic-design
description: >-
  Structure the UI library (core-ui) with Atomic Design — atoms, molecules, organisms, templates — where composition flows one way (higher composes lower). Covers which level a component belongs to, the file/folder conventions, and the promotion policy: obvious primitives (Button, Input) go straight into core-ui/atoms, but feature-specific UI stays local to its feature until it's needed in a second place, then it's promoted down into core-ui and generalized. Use when organizing a component library, deciding where a component lives, or extracting a shared component. Triggers on: atomic design, atoms, molecules, organisms, templates, core-ui, design system, ui library, component library, where does this component go, promote component, extract to core-ui, when to extract, rule of three, premature abstraction, component reuse.
disable-model-invocation: true
---

# Atomic Design (UI Library Structure)

Organize your UI library — the `core-ui` package (see [project](../hzblj-skills-project/SKILL.md)) — with **Atomic Design**: four folders, `atoms → molecules → organisms → templates`, where each level composes the ones below it and never the reverse. This keeps the library scannable ("a labeled input is a molecule, so it's in `molecules/`"), keeps primitives reusable, and gives you one clear answer to *where does this component go?*

The other half of the discipline is a **promotion policy**. Not everything belongs in `core-ui` on day one: the obvious primitives (`Button`, `Input`) go straight in, but a component born inside a feature stays there until a *second* place needs it — only then is it promoted down into `core-ui` and generalized. That's how you avoid both copy-paste duplication and premature, wrong abstractions.

Pairs with [project](../hzblj-skills-project/SKILL.md) (the package graph this lives inside — shared UI moves *down* into `core-*`), [component-architecture](../hzblj-skills-component-architecture/SKILL.md) (how one component is built internally), and [compound-components](../hzblj-skills-compound-components/SKILL.md) (organisms are often compounds).

## The four levels

| Level | What it is | Composes | Examples (Hogwarts) |
| --- | --- | --- | --- |
| **Atoms** | The smallest indivisible primitives — one job, no app knowledge | Nothing but raw elements / other atoms sparingly | `Button`, `Input`, `Icon`, `Text`, `Avatar`, `Badge`, `Spinner` |
| **Molecules** | A small, reusable group of atoms acting as one unit | Atoms | `SearchField` (Input + Icon), `FormField` (Label + Input + error), `HouseBadge`, `Tabs` |
| **Organisms** | A distinct, self-contained section of an interface | Molecules + atoms | `NavigationSidebar`, `SpellbookCard`, `HouseLeaderboard`, `ProfileMenu` |
| **Templates** | A page-level layout skeleton — arranges organisms into a structure, no real data | Organisms (as slots) | `DashboardLayout`, `DetailLayout`, `AuthLayout` |

The line between molecule and organism is fuzzy and not worth agonizing over — the useful test is *"is this a small reusable widget (molecule) or a whole section of the screen (organism)?"* Templates are layout only: they define where things sit and take content through slots/`children`, never fetch or own data.

## Composition flows one way

A higher level may compose any level below it; a lower level must **never** import a higher one. An atom that imports an organism is the same mistake as a `core-*` package importing a `feature-*` — the arrow points the wrong way, and it creates cycles and untestable primitives.

```tsx
// Bad — an atom reaching up into an organism; primitives must stay leaf-level
// core-ui/src/atoms/button.tsx
import { ProfileMenu } from '../organisms/profile-menu'

// Good — the organism composes downward out of molecules and atoms
// core-ui/src/organisms/profile-menu.tsx
import { Avatar } from '../atoms/avatar'
import { Menu } from '../molecules/menu'
```

This mirrors the monorepo's dependency direction one level down: `templates → organisms → molecules → atoms`, acyclic, always downward.

## Where does a new component go?

Two questions decide it — *how general is it?* and *how many places use it?*

| Situation | Where it goes |
| --- | --- |
| An obvious, universal primitive (`Button`, `Input`, `Icon`, `Avatar`) | Straight into `core-ui/atoms` — no debate |
| A generic composite with clear reuse (`SearchField`, `Tabs`) | `core-ui` at its level (molecule/organism) |
| A component specific to **one** feature, used in **one** place | Keep it **local** to the feature (`feature-x/src/components/…`) |
| That local component is now needed in a **second** place | **Promote** it down into `core-ui` and generalize (below) |

## Promote on the second use — not before

When you build a new feature, resist the urge to design every piece as a reusable `core-ui` component up front. A component used in exactly one place, shaped by one feature's needs, **belongs in that feature** — it's cheaper to move later than to un-pick a wrong abstraction you committed to too early. Keep it in `feature-x/src/components/` and let it earn generality.

The signal to promote is the **second use site**. The moment another feature (or another screen) needs the same component, stop — don't copy it, and don't reach sideways into the first feature (that's a boundary violation, see [project](../hzblj-skills-project/SKILL.md)). Promote it **down** into `core-ui`:

1. **Move** it to the right atomic level in `core-ui` (`core-ui/src/molecules/house-crest.tsx`).
2. **Generalize** the API — strip the feature-specific props and hardcoded copy; take data via props so it's context-free.
3. **Re-import** it from `@hogwarts/core-ui` at *both* sites; delete the feature-local copy.

```tsx
// 1. First use — HouseCrest is born inside the feature, used once. Leave it here.
// feature-sorting-hat/src/components/house-crest.tsx
export const HouseCrest = ({ house }: { house: House }) => { /* … */ }
```

```tsx
// 2. feature-quidditch now needs the same crest. DON'T copy it or import across features.
// Bad — sideways import into another feature's internals
import { HouseCrest } from '@hogwarts/feature-sorting-hat/src/components/house-crest'
```

```tsx
// 3. Promote it down into core-ui (a molecule), generalized; both features import it.
// core-ui/src/molecules/house-crest.tsx  →  exported from core-ui's index.ts
import { HouseCrest } from '@hogwarts/core-ui' // feature-sorting-hat AND feature-quidditch
```

This is the UI-specific form of the project rule *"if two features need to share code, it moves down into `core-*`"* — with the **when** (the second use) and the **which level** (its atomic tier) made concrete. One use → keep it local; two uses → promote; never three copies.

## File & folder conventions

`core-ui` holds the four folders and a single public entry point; a component is a kebab-case file, its stories co-located, exported by name.

```
packages/core-ui/
  index.ts                     // export * from './src' — the package's public API
  src/
    index.ts                   // re-exports each level's public components
    atoms/
      button.tsx
      button.stories.tsx       // co-located story
      input.tsx
      icon.tsx
    molecules/
      search-field.tsx
      house-crest.tsx
    organisms/
      profile-menu.tsx
    templates/
      dashboard-layout.tsx
```

- **kebab-case file names**, one component per file, main export named after the component.
- **Co-locate `*.stories.tsx`** with the component — the story is the component's living catalog entry.
- **Named exports only**; the level folders are internal — everything the app uses is re-exported through `core-ui`'s `index.ts`, and consumers import from `@hogwarts/core-ui`, never a deep path (see [project](../hzblj-skills-project/SKILL.md)).
- Platform-specific UI (native modules, RN-only views) lives in `platform-ui`, structured the same way — atomic design applies wherever the UI library lives.

## Common Mistakes

| Mistake | Fix |
| --- | --- |
| Designing every feature widget as a `core-ui` component up front | Keep single-use UI local to the feature; promote on the second use |
| Copy-pasting a component into a second feature | Promote it down into `core-ui` once; both import from there |
| Importing a component from another feature's internals | Boundary violation — promote to `core-ui`, import from the package |
| An atom/molecule importing an organism (or a template) | Composition flows downward only; move the shared bit down |
| Feature-specific props / hardcoded copy on a promoted component | Generalize the API on promotion — take data via props |
| Dumping everything into one flat `components/` folder | Sort into `atoms`/`molecules`/`organisms`/`templates` |
| Templates that fetch or own data | Templates are layout-only; feed content through slots/`children` |
| Agonizing over molecule vs organism | Small reusable widget → molecule; whole screen section → organism |

## Review Checklist

- [ ] Each component sits at the right level: primitive → atom, small widget → molecule, screen section → organism, page skeleton → template.
- [ ] Composition points downward only — no lower level imports a higher one.
- [ ] Obvious primitives live in `core-ui/atoms`; single-use feature UI stays in the feature.
- [ ] A component needed in a second place was **promoted** into `core-ui` and generalized — not copied, not cross-imported.
- [ ] `core-ui` is reached only through its `index.ts`; files are kebab-case with co-located stories and named exports.
- [ ] Templates carry layout only; data arrives via slots/props.

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
