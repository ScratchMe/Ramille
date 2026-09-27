---
name: hzblj-skills-ui-surfaces
description: >-
  Cross-platform surfaces polish — concentric border radius, optical alignment, shadows vs. elevation, image outlines, minimum hit areas. Triggers on: concentric radius, optical alignment, box-shadow, elevation, image outline, hitSlop, hit area.
disable-model-invocation: true
---

# Surfaces

Border radius, optical alignment, shadows vs. elevation, image outlines, and hit areas — on both web (React + Tailwind/CSS) and mobile (React Native). The math and the intent are shared; the APIs differ, and shadows in particular behave very differently across platforms.

## Concentric Border Radius — Both platforms

When nesting rounded elements, the outer radius must equal the inner radius plus the padding between them:

```
outerRadius = innerRadius + padding
```

Most useful when nested surfaces are close together. If padding is larger than ~24px, treat the layers as separate surfaces and choose each radius independently instead of forcing the math. Mismatched radii on nested elements is one of the most common things that makes interfaces feel off — always calculate concentrically.

### Web (CSS / Tailwind)

```css
/* Good — concentric */
.card       { border-radius: 20px; padding: 8px; } /* 12 + 8 */
.card-inner { border-radius: 12px; }

/* Bad — same radius on both */
.card       { border-radius: 12px; padding: 8px; }
.card-inner { border-radius: 12px; }
```

```tsx
// Good — outer radius accounts for padding
<div className="rounded-2xl p-2">   {/* 16px radius, 8px padding */}
  <div className="rounded-lg">      {/* 8px = 16 - 8 ✓ */}
    ...
  </div>
</div>
```

### Mobile (React Native)

Identical math on the `style` object:

```tsx
// Good — concentric
const styles = StyleSheet.create({
  card:      { borderRadius: 20, padding: 8 }, // 12 + 8
  cardInner: { borderRadius: 12 },
})

// Bad — same radius on both
const styles = StyleSheet.create({
  card:      { borderRadius: 12, padding: 8 },
  cardInner: { borderRadius: 12 },
})
```

## Optical Alignment — Both platforms

When geometric centering looks off, align optically instead.

### Buttons with Text + Icon

Use slightly less padding on the icon side so the button feels balanced. Rule of thumb: `icon-side padding = text-side padding - 2px`.

```tsx
// Web — Tailwind
<button className="pl-4 pr-3.5 flex items-center gap-2">
  <span>Continue</span>
  <ArrowRightIcon />
</button>
```

```tsx
// Mobile — React Native
const styles = StyleSheet.create({
  button: { paddingLeft: 16, paddingRight: 14 }, // icon side = text side - 2
})
```

```css
/* Bad — equal padding, icon looks pushed too far out (both platforms) */
.button-with-icon { padding: 0 16px; }
```

### Play Button Triangles

A triangle's geometric center is not its visual center. Shift it slightly right.

```css
/* Web */
.play-button svg { margin-left: 2px; }
```

```tsx
// Mobile
<PlayIcon style={{ marginLeft: 2 }} />
```

### Asymmetric Icons (Stars, Arrows, Carets)

Some icons carry uneven visual weight. The best fix is adjusting the SVG's `viewBox`/path directly so no per-component margin is needed. Fall back to a `1px`/`1pt` margin only when you can't touch the asset.

```tsx
// Best — fix the viewBox/path in the SVG itself (works identically on both platforms)
// Fallback — nudge with margin
<StarIcon style={{ marginLeft: 1 }} /> // RN
<span className="ml-px"><StarIcon /></span> // Web
```

## Shadows Instead of Borders

For **buttons, cards, and containers** that use a border for depth, prefer a soft shadow — shadows adapt to any background via transparency; solid borders don't. **Do not** apply this to dividers (`border-b`, `border-t`, hairlines) or any border whose job is layout separation — those stay as borders on both platforms.

### Web — Layered `box-shadow`

CSS lets you stack shadow layers, which is what makes a shadow read as real depth. Use a 3-layer stack in light mode and collapse to a single ring in dark mode.

**Light mode** — layer 1 is a 1px border ring, layer 2 a subtle lift, layer 3 ambient depth:

```css
:root {
  --shadow-border:
    0px 0px 0px 1px rgba(0, 0, 0, 0.06),
    0px 1px 2px -1px rgba(0, 0, 0, 0.06),
    0px 2px 4px 0px rgba(0, 0, 0, 0.04);
  --shadow-border-hover:
    0px 0px 0px 1px rgba(0, 0, 0, 0.08),
    0px 1px 2px -1px rgba(0, 0, 0, 0.08),
    0px 2px 4px 0px rgba(0, 0, 0, 0.06);
}
```

**Dark mode** — simplify to a single white ring; layered depth shadows aren't visible on dark backgrounds:

```css
/* Adapt to the project's dark setup (prefers-color-scheme, class, data attribute) */
--shadow-border: 0 0 0 1px rgba(255, 255, 255, 0.08);
--shadow-border-hover: 0 0 0 1px rgba(255, 255, 255, 0.13);
```

```css
.card {
  box-shadow: var(--shadow-border);
  transition-property: box-shadow;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
}
.card:hover { box-shadow: var(--shadow-border-hover); }
```

### Mobile — `shadow*` (iOS) + `elevation` (Android)

React Native shadows are **fundamentally different** from CSS and come with two hard constraints:

1. **You cannot layer shadows.** A view has exactly one shadow — there is no multi-layer stack. Don't try to reproduce the 3-layer CSS recipe; pick a single tasteful shadow. If you truly need two shadow passes, nest wrapper views.
2. **iOS and Android use different props and you must set both.** iOS reads `shadowColor/shadowOffset/shadowOpacity/shadowRadius`; **Android ignores all of those** and only reads `elevation`. Setting only iOS shadow leaves Android flat; setting only `elevation` gives Android a shadow but iOS nothing.

```tsx
import { Platform, StyleSheet } from 'react-native'

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', // Android elevation needs a solid background to render
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
})
```

```tsx
// Bad — iOS-only shadow; Android card looks flat
const styles = StyleSheet.create({
  card: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6 },
})
```

Notes: Android `elevation` also affects z-ordering (higher elevation draws on top) and needs a non-transparent `backgroundColor` to paint. `elevation` roughly maps to Material dp — `2–4` for cards, `8+` for dialogs/sheets. iOS `shadowOpacity` around `0.08–0.15` reads as a soft, real shadow; higher looks heavy.

### When to Use Shadows vs. Borders (both platforms)

| Use shadows / elevation | Use borders |
| --- | --- |
| Cards, containers with depth | Dividers between list items |
| Buttons with a "raised" style | Table/row cell boundaries |
| Elevated surfaces (dropdowns, modals, sheets) | Form input outlines (accessibility) |
| Elements on varied/image backgrounds | Hairline separators in dense UI |
| Hover/press lift (web hover; mobile press) | |

## Image Outlines — Both platforms

Add a subtle `1px`/hairline outline with low opacity to images. This creates consistent depth, especially in systems where other elements use borders or shadows.

### Color rules (non-negotiable, both platforms)

- **Light mode**: pure black — `rgba(0, 0, 0, 0.1)`. Exactly R=0, G=0, B=0.
- **Dark mode**: pure white — `rgba(255, 255, 255, 0.1)`. Exactly R=255, G=255, B=255.
- **Never** use a near-black/near-white from the palette (slate-900, zinc-900, `#0a0a0a`, `#111827`, `#f5f5f7`). A tinted outline picks up the surface color underneath and reads as dirt on the image edge.
- **Never** match the outline to the accent or ink color. It is a neutral separator, not a themed element.

### Web — `outline` (not `border`)

`outline` doesn't affect layout, and `outline-offset: -1px` insets it so the image stays its intended size.

```css
img {
  outline: 1px solid rgba(0, 0, 0, 0.1);
  outline-offset: -1px;
}
/* Dark mode */
img { outline: 1px solid rgba(255, 255, 255, 0.1); outline-offset: -1px; }
```

```tsx
// Tailwind with dark mode
<img
  className="outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
  src={src}
  alt={alt}
/>
```

Use `outline-black/10` and `outline-white/10` specifically — never `outline-slate-*`, `outline-zinc-*`, `outline-neutral-*`, or any tinted scale.

### Mobile — `borderWidth: StyleSheet.hairlineWidth`

RN has no `outline`; use a hairline border with the **same neutral colors**. `hairlineWidth` is the thinnest line the device can render (sub-1px on high-DPI screens). Because a border does affect layout in RN, keep the corner radius on the image itself and account for the hairline.

```tsx
import { Image, StyleSheet, useColorScheme } from 'react-native'

const Thumb = ({ uri }: { uri: string }) => {
  const dark = useColorScheme() === 'dark'
  return (
    <Image
      source={{ uri }}
      style={[
        styles.image,
        { borderColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
      ]}
    />
  )
}

const styles = StyleSheet.create({
  image: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
})
```

Same rule as web: the color must be pure black or pure white at 10% — never a tinted neutral.

## Hit Areas — Both platforms

Interactive elements need a minimum hit area of **44×44px (WCAG)**, with 40×40 as the floor. When the visible control is smaller (e.g. a 20×20 icon toggle), expand the touch/click target without changing the visual size.

### Web — Pseudo-element to 40–44px

```css
.checkbox { position: relative; width: 20px; height: 20px; }
.checkbox::after {
  content: "";
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 44px; height: 44px;
}
```

```tsx
// Tailwind
<button className="relative size-5 after:absolute after:top-1/2 after:left-1/2 after:size-11 after:-translate-1/2">
  <CheckIcon />
</button>
```

### Mobile — `hitSlop`

`hitSlop` expands the pressable region beyond the visible bounds without affecting layout — the native equivalent of the pseudo-element trick.

```tsx
// Expand a small icon button's tap target to ~44pt
<Pressable
  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
  onPress={onPress}
>
  <CloseIcon width={20} height={20} />
</Pressable>

// Shorthand — same inset on all sides
<Pressable hitSlop={12} onPress={onPress}>
  <CloseIcon width={20} height={20} />
</Pressable>
```

### Collision Rule (both platforms)

Make the extended hit area as large as possible **without colliding** with a neighboring interactive element. Two interactive elements must never have overlapping hit areas — on the web shrink the pseudo-element; on mobile reduce `hitSlop`.

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
