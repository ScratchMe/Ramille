---
name: hzblj-skills-css-animations
description: >-
  Pure-CSS web animations best practices — interruptible transitions vs. keyframes, staggered enter, subtle exit, icon cross-fade with no motion library, scale-on-press, transition specificity, will-change, and prefers-reduced-motion. Use for web motion that doesn't need a JS timeline (reach for GSAP when it does). Triggers on: CSS transition, keyframes, animation-delay, stagger, will-change, transition all, reduced motion, scale on press, icon cross-fade, cubic-bezier.
disable-model-invocation: true
---

# CSS Animations

Most web motion doesn't need a library. Plain CSS transitions and keyframes cover
hover, toggles, enter/exit, and press feedback — and they run on the compositor
for free. Reach for [gsap](../hzblj-skills-gsap-timelines/SKILL.md) only when you need a
sequenced timeline, scroll-linking, or per-character text reveals. For surfaces
and typography polish, see `skills/shared/ui`.

No motion library. Everything here is CSS (with the occasional Tailwind note); if a
component needs spring physics or orchestration, that's a GSAP job, not a reason to
add `framer-motion`.

Extract shared timing into custom properties so motion stays consistent:

```css
:root {
  --ease: cubic-bezier(0.2, 0, 0, 1); /* natural ease-out */
  --duration: 200ms;
}
```

## Interruptible Animations: Transitions vs. Keyframes

Users change their mind mid-interaction. If a `Nox` can't interrupt a half-finished
`Lumos`, the interface feels broken.

| | CSS transitions | CSS keyframes |
| --- | --- | --- |
| **Behavior** | Interpolate toward the latest state | Run on a fixed timeline |
| **Interruptible** | Yes — retargets mid-flight | No — restarts from the beginning |
| **Use for** | Interactive state (hover, toggle, open/close) | One-shot sequences (enter, loading spinners) |

```css
/* Good — interruptible transition; clicking again mid-slide smoothly reverses */
.house-drawer {
  transform: translateX(-100%);
  transition: transform var(--duration) var(--ease);
}
.house-drawer[data-open='true'] {
  transform: translateX(0);
}
```

```css
/* Bad — keyframes on an interactive element; closing mid-open snaps/restarts */
.house-drawer[data-open='true'] {
  animation: slideIn var(--duration) var(--ease) forwards;
}
```

**Rule:** transitions for interactive state, keyframes for sequences that run once.

## Enter: Split and Stagger

Don't animate one big container. Break content into semantic chunks and stagger
each by ~100ms. Combine `opacity`, `translateY(12px)`, and `blur(4px)`.

```css
.sorting-item {
  opacity: 0;
  transform: translateY(12px);
  filter: blur(4px);
  animation: rise 400ms var(--ease) forwards;
}
.sorting-item:nth-child(1) { animation-delay: 0ms; }
.sorting-item:nth-child(2) { animation-delay: 100ms; }
.sorting-item:nth-child(3) { animation-delay: 200ms; }

@keyframes rise {
  to { opacity: 1; transform: translateY(0); filter: blur(0); }
}
```

For a headline, split into words and stagger by ~80ms for the same effect.

## Exit: Keep It Subtle

Exits should be softer than enters — the user's attention is already moving on. Use
a small **fixed** `translateY(-12px)` and a **shorter** duration than the enter.

```css
/* Good — subtle, directional, quick */
.spell-card[data-leaving='true'] {
  opacity: 0;
  transform: translateY(-12px);
  transition: opacity 150ms ease-in, transform 150ms ease-in;
}
```

```css
/* Bad — dramatic exit that steals focus */
.spell-card[data-leaving='true'] {
  opacity: 0;
  transform: translateY(-100%) scale(0.5);
  transition: all 400ms ease-in;
}
```

Pure CSS can't hold an element in the DOM after React unmounts it, so for true exit
animations keep the node mounted while `data-leaving` is set, then remove it on
`transitionend`.

## Icon Cross-Fade Without a Motion Library

When an icon swaps on state change (`Lumos` → `Nox`, like → liked), cross-fade
instead of toggling visibility. Keep **both icons in the DOM** — one absolutely
positioned over the other — so both enter and exit animate with no library. The
entering icon scales up from `0.25`; the leaving one scales down to `0.25`, each
with opacity and blur.

Use **exactly** these values: `scale` `0.25`→`1`, `opacity` `0`→`1`, `blur`
`4px`→`0`, eased with `cubic-bezier(0.2, 0, 0, 1)`.

```css
.wand-toggle { position: relative; display: grid; place-items: center; }

.wand-toggle__icon {
  grid-area: 1 / 1; /* stack both icons */
  transition: opacity var(--duration), transform var(--duration), filter var(--duration);
  transition-timing-function: var(--ease);
}

/* resting (Nox) visible, active (Lumos) hidden */
.wand-toggle__icon--lumos { opacity: 0; transform: scale(0.25); filter: blur(4px); }
.wand-toggle__icon--nox   { opacity: 1; transform: scale(1);    filter: blur(0); }

.wand-toggle[data-lit='true'] .wand-toggle__icon--lumos { opacity: 1; transform: scale(1);    filter: blur(0); }
.wand-toggle[data-lit='true'] .wand-toggle__icon--nox   { opacity: 0; transform: scale(0.25); filter: blur(4px); }
```

## Scale on Press

A subtle scale-down on press gives tactile feedback. Always `scale: 0.96` — never
below `0.95`, which feels exaggerated. Use a transition so releasing mid-press
returns smoothly.

```css
.spell-button {
  transition: scale 150ms var(--ease);
}
.spell-button:active {
  scale: 0.96;
}
```

Add a `static` opt-out (e.g. a `data-static` attribute or a prop-driven class) for
buttons where the motion would distract. In Tailwind this is
`active:scale-[0.96] transition-transform` — see the `tailwind` skill; don't
rebuild Tailwind's utilities here.

## Transition Only What Changes

Never use `transition: all` (or Tailwind's bare `transition`). Name the exact
properties — `all` watches everything, animates properties you didn't mean to, and
blocks browser optimizations.

```css
/* Good — only what changes */
.house-crest {
  transition-property: scale, box-shadow;
  transition-duration: 150ms;
  transition-timing-function: var(--ease);
}

/* Bad */
.house-crest { transition: all 150ms ease-out; }
```

## Use `will-change` Sparingly

`will-change` pre-promotes an element to its own GPU layer, avoiding a first-frame
stutter — but each layer costs memory. Only add it for compositor-friendly
properties, only when you actually observe stutter (Safari benefits most), and
never `will-change: all`.

| Property | GPU-composited | Worth `will-change` |
| --- | --- | --- |
| `transform` / `scale` | Yes | Yes |
| `opacity` | Yes | Yes |
| `filter` (blur) | Yes | Yes |
| `top` / `left` / `width` / `height` | No | No |
| `background` / `color` | No | No |

```css
.floating-snitch { will-change: transform; } /* only if you see first-frame jank */
```

## Respect `prefers-reduced-motion`

Per-letter reveals and large moves can trigger vestibular discomfort. Under
`reduce`, skip the motion and show the end state instantly — never leave the
element stuck at `opacity: 0`.

```css
@media (prefers-reduced-motion: reduce) {
  .sorting-item,
  .spell-card,
  .house-drawer {
    animation: none !important;
    transition: none !important;
    opacity: 1;
    transform: none;
    filter: none;
  }
}
```

## Common Mistakes

| Mistake | Fix |
| --- | --- |
| Keyframes on a toggle/hover element | Use a transition so it can interrupt |
| Animating one big container on enter | Split into chunks, stagger ~100ms |
| Dramatic exit (`translateY(-100%)`, scale) | Small fixed `-12px`, shorter duration |
| Toggling icon `display` | Cross-fade two stacked icons (scale 0.25→1, blur 4→0) |
| `scale` below `0.95` on press | Raise to `0.96` |
| `transition: all` | Name exact properties |
| `will-change` on everything | Only transform/opacity/filter, only on observed stutter |
| Reaching for `framer-motion` | Plain CSS here; GSAP for timelines/scroll |
| No reduced-motion fallback | Add a `prefers-reduced-motion: reduce` block |

## Review Checklist

- [ ] Interactive state uses transitions; only one-shot sequences use keyframes
- [ ] Enter animations are split and staggered (~100ms)
- [ ] Exits are subtle (`-12px`, shorter than the enter)
- [ ] Icon swaps cross-fade (scale `0.25`→`1`, opacity `0`→`1`, blur `4px`→`0`)
- [ ] Buttons scale to `0.96` on press with a `static` opt-out
- [ ] No `transition: all` — exact properties only
- [ ] `will-change` only on transform/opacity/filter, only where stutter is seen
- [ ] Every animation has a `prefers-reduced-motion: reduce` fallback
- [ ] Timing/easing come from shared custom properties, not scattered magic values
- [ ] No motion library added — CSS here, [gsap](../hzblj-skills-gsap-timelines/SKILL.md) for timelines/scroll

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
