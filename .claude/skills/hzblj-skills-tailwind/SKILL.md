---
name: hzblj-skills-tailwind
description: >-
  Tailwind CSS conventions — utility-first, semantic theme tokens used directly (so light/dark flips in one place, not a dark: on every element), no arbitrary values, class ordering, cn() for conditional/merged classes, and tv() (tailwind-variants) for component variants. Use when styling web components with Tailwind. Triggers on: Tailwind, utility classes, class ordering, responsive, dark mode, light dark, theme tokens, design tokens, CSS variables, cn, clsx, twMerge, tailwind-variants, tv, variants, cva.
disable-model-invocation: true
---

# Styling (Tailwind CSS)

Tailwind is the primary styling method — compose small utilities on the element, don't reach for inline styles or CSS modules. Two rules carry most of the weight: **style against semantic theme tokens** (never raw colors), so light/dark is a one-place flip; and **express variants with `tv()`**, composing conditional classes with `cn()`. Keep magic values out of the markup — snap to the scale (`p-6`, `w-34`) or a named token instead of an arbitrary `w-[137px]`.

Pairs with [component-architecture](../hzblj-skills-component-architecture/SKILL.md) (variant logic lives in the component), [type-safety](../hzblj-skills-type-safety/SKILL.md) (`VariantProps` types the variants), and [css-animations](../hzblj-skills-css-animations/SKILL.md) (motion is CSS/GSAP, not utilities-gone-wild).

## Style against theme tokens — not raw colors

Hardcoding `bg-white … dark:bg-neutral-900` on every element scatters the color system across the whole codebase: to retheme or fix a contrast bug you edit hundreds of sites, and every element needs a `dark:` twin you can forget. Instead define **semantic tokens** — `surface`, `foreground`, `border`, `brand` — as CSS variables, map them into the theme once, and style against the token. The token *means* something ("this is a surface"), and its value lives in one place.

```tsx
// Bad — raw colors + a dark: pair on every element; the palette is smeared everywhere
<article className="rounded-xl border border-neutral-200 bg-white text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50" />

// Good — semantic tokens; the meaning is in the class, the value is in the token layer
<article className="rounded-xl border border-border bg-surface text-foreground" />
```

Define the tokens as CSS variables and flip them for dark mode in **one** place:

```css
/* globals.css */
@layer base {
  :root {
    --surface: 0 0% 100%;
    --foreground: 240 10% 4%;
    --border: 240 6% 90%;
    --brand: 265 84% 58%;
  }
  .dark {
    --surface: 240 10% 4%;
    --foreground: 0 0% 98%;
    --border: 240 4% 16%;
    --brand: 265 84% 66%;
  }
}
```

Map them into the theme — v4 in CSS with `@theme`, or v3 in `tailwind.config.ts`. Using `hsl(... / <alpha-value>)` keeps opacity utilities (`bg-surface/50`) working:

```css
/* Tailwind v4 — globals.css */
@theme {
  --color-surface: hsl(var(--surface) / <alpha-value>);
  --color-foreground: hsl(var(--foreground) / <alpha-value>);
  --color-border: hsl(var(--border) / <alpha-value>);
  --color-brand: hsl(var(--brand) / <alpha-value>);
}
```

```ts
// Tailwind v3 — tailwind.config.ts
theme: {
  extend: {
    colors: {
      surface: 'hsl(var(--surface) / <alpha-value>)',
      foreground: 'hsl(var(--foreground) / <alpha-value>)',
      border: 'hsl(var(--border) / <alpha-value>)',
      brand: 'hsl(var(--brand) / <alpha-value>)',
    },
  },
}
```

## Light / dark mode — flip tokens, don't sprinkle `dark:`

Because components style against tokens, **dark mode is just re-pointing the variables** under `.dark` (class strategy) or an `@media (prefers-color-scheme: dark)` block — the components don't change at all. Reserve the `dark:` variant for the rare one-off the token layer genuinely can't express (e.g. a different *shadow* treatment), never for routine color pairs.

```tsx
// Bad — dark mode leaking into every component
<span className="text-neutral-500 dark:text-neutral-400" />
// Good — one token; dark handled centrally
<span className="text-muted-foreground" />
```

Define a token for **every** surface, text, and border role up front (`surface`, `surface-elevated`, `foreground`, `muted-foreground`, `border`, `brand`, `on-brand`, …) and test both themes as you build — dark mode is not an afterthought bolted on at the end.

## Variants with `tv()` (tailwind-variants)

For a component with variants (intent, size, state), don't hand-roll `cn()` chains or lookup records — use **`tv()`** from `tailwind-variants`. It gives you `base`, named `variants`, `defaultVariants`, and `compoundVariants`, resolves Tailwind conflicts with `tailwind-merge` built in, and its `VariantProps` types the component's variant props for free.

```ts
// spell-button.styles.ts
import { tv, type VariantProps } from 'tailwind-variants'

export const spellButton = tv({
  base: 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50',
  variants: {
    intent: {
      primary: 'bg-brand text-on-brand hover:bg-brand/90',
      ghost: 'bg-transparent text-foreground hover:bg-surface-elevated',
      danger: 'bg-danger text-on-danger hover:bg-danger/90',
    },
    size: {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-base',
      lg: 'h-12 px-6 text-lg',
    },
    full: { true: 'w-full' },
  },
  compoundVariants: [{ intent: 'ghost', size: 'sm', class: 'px-2' }],
  defaultVariants: { intent: 'primary', size: 'md' },
})
```

The component derives its variant props from the recipe — no duplicated union types — and forwards `className` through the `class` slot so callers can still override (twMerge lets the last class win):

```tsx
import type { FC, ReactNode } from 'react'
import { spellButton } from './spell-button.styles'
import type { VariantProps } from 'tailwind-variants'

type SpellButtonProps = VariantProps<typeof spellButton> & {
  children: ReactNode
  className?: string
}

export const SpellButton: FC<SpellButtonProps> = ({ children, className, full, intent, size }) => (
  <button className={spellButton({ class: className, full, intent, size })}>{children}</button>
)

// <SpellButton>Cast</SpellButton>                     → primary / md
// <SpellButton intent="danger" size="lg">Obliviate</SpellButton>
```

For multi-part components (a card with a root, header, body), reach for `tv({ slots: { … } })` so one recipe styles every part. A bare `cn()` with a small lookup is fine for a one-off with a single axis; the moment you have two axes, defaults, or a compound rule, use `tv()`.

## `cn()` — conditional and mergeable classes

`cn()` (clsx + `tailwind-merge`) is how you compose classes that switch on state, and how you merge an incoming `className`. Never build class strings with template literals or `+` — they drift into stray spaces, empty strings, and unreadable interpolation. Keep each condition flat: no nested ternaries inside `cn()`.

```tsx
// Bad — string surgery; grows unreadable with every state, and won't dedupe conflicts
className={`card ${isActive ? 'border-brand' : 'border-border'} ${className ?? ''}`}

// Good — a flat list of classes and the conditions that gate them
className={cn('card border', isActive ? 'border-brand' : 'border-border', className)}
```

The `tailwind-merge` half matters: when two utilities target the same property, the **last wins** (`cn('p-2', 'p-4')` → `p-4`). That's what makes a `className` prop able to *override* a component's defaults instead of producing `p-2 p-4` and a coin-flip. Put the incoming `className` last. (This is the Tailwind-specific home for the string-hygiene rule in [formatting](../hzblj-skills-formatting/SKILL.md).)

## Prefer scale values — avoid the arbitrary `[…]` bracket

Bracketed arbitrary values (`w-[137px]`, `text-[#3b82f6]`) hardcode magic numbers into markup and step outside the design system — its scale, its rounding, its tokens. Reach for the bracket **last**. Prefer, in order:

1. A **named theme token** — `w-tile`, `text-brand`, `gap-gutter`.
2. An **on-scale value** — `p-6` (= 24px), `gap-4`, `w-34`. Snap the odd `137px` to the nearest step rather than pinning an off-scale pixel.
3. An **arbitrary `[…]` value** only for a genuine, unrepeatable one-off.

The number in a spacing utility is a **scale step** (× `0.25rem`), **not pixels** — `w-34` is `8.5rem` ≈ 136px, and `w-137` would be `34.25rem` ≈ 548px. So `w-[137px]` is *not* `w-137`; the closest on-scale width is `w-34`.

```tsx
// Bad — bracketed, raw px, off the scale
<div className="w-[137px] p-[24px] text-[#7c3aed]" />
// Good — on-scale steps and named tokens (p-6 = 24px, w-34 ≈ 136px)
<div className="w-34 p-6 text-brand" />
```

## Class ordering

Order classes consistently so a long list stays scannable — and let [`prettier-plugin-tailwindcss`](https://github.com/tailwindlabs/prettier-plugin-tailwindcss) enforce it automatically rather than doing it by hand:

1. Layout (`flex`, `grid`, `block`, `hidden`)
2. Positioning (`relative`, `absolute`, `z-10`)
3. Box model (`w-`, `h-`, `size-`, `p-`, `m-`, `gap-`)
4. Typography (`text-`, `font-`, `leading-`, `tracking-`)
5. Visual (`bg-`, `border-`, `rounded-`, `shadow-`)
6. Effects (`opacity-`, `blur-`, `backdrop-`)
7. Transitions (`transition-`, `duration-`, `ease-`)
8. State variants (`hover:`, `focus-visible:`, `active:`)
9. Responsive (`sm:`, `md:`, `lg:`)

```tsx
<div className="flex items-center gap-4 rounded-xl bg-surface p-6 text-sm font-medium shadow-sm transition-shadow duration-200 hover:shadow-md md:p-8" />
```

## Responsive — mobile-first

Base styles are mobile; layer `sm:` / `md:` / `lg:` upward from the theme's breakpoints. Don't mix hand-written media queries alongside Tailwind breakpoints — pick one system.

## A few more sharp edges

- **`size-*` over `w-*` h-*`** for square elements: `size-10`, not `h-10 w-10`.
- **`group` / `peer`** for parent- and sibling-driven state (`group-hover:`, `peer-focus:`) instead of wiring JS state for pure hover/focus styling.
- **`data-*` variants** (`data-[state=open]:rotate-180`) to style off a component's own data attributes — pairs perfectly with headless UI primitives.
- **Avoid `@apply`.** It rebuilds the abstraction Tailwind removed. Use a component (with `tv()`) instead; keep `@apply` for tiny base-layer resets or un-refactorable third-party markup.
- **Gap over margins** for spacing between siblings (`flex gap-4`), so items don't carry margin they shouldn't own.

## Common Mistakes

| Mistake | Fix |
| --- | --- |
| `bg-white … dark:bg-neutral-900` pairs on every element | Style against semantic tokens; flip the token values under `.dark` once |
| A `dark:` variant on routine colors | Let the token layer handle dark; reserve `dark:` for true one-offs |
| Hand-rolled `cn()` chains / lookup records for a multi-axis component | `tv()` with `variants` + `defaultVariants` (+ `compoundVariants`) |
| Re-declaring a `type` union for variant props | Derive it with `VariantProps<typeof recipe>` |
| Template-literal / `+` class strings | `cn()` — flat conditions, no nested ternaries, `className` last |
| `className` prop that can't override defaults (`p-2 p-4`) | `cn()`/`tv()` uses twMerge — last wins; put incoming `className` last |
| Bracketed arbitrary values (`w-[137px]`, `text-[#…]`) | Nearest on-scale step (`w-34`, `p-6`) or a named token; `[…]` last |
| `@apply` to DRY up repeated utilities | Extract a component with `tv()`; keep `@apply` for base/third-party only |
| Ordering classes by hand | `prettier-plugin-tailwindcss` |

## Review Checklist

- [ ] Colors are semantic tokens (`bg-surface`, `text-foreground`), not raw palette values.
- [ ] No `dark:` on routine colors — dark mode flips the token layer in one place; both themes tested.
- [ ] Components with variants use `tv()`; variant props typed via `VariantProps`.
- [ ] Conditional/merged classes go through `cn()`; incoming `className` is merged last.
- [ ] No arbitrary `[…]` values except genuine one-offs — snap to on-scale steps (`w-34`, `p-6`) and named tokens.
- [ ] No `@apply` for component styling; class order left to the Prettier plugin.

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
