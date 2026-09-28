---
name: hzblj-skills-ui-typography
description: >-
  Cross-platform (React web + React Native) typography polish — text-wrap balance/pretty, font smoothing, tabular numbers, Dynamic Type, adjustsFontSizeToFit, letter spacing, layout-shift avoidance. Triggers on: text wrapping, tabular numbers, font smoothing, Dynamic Type, adjustsFontSizeToFit, orphan.
disable-model-invocation: true
---

# Typography

Typography rendering details that make interfaces feel better, on both the web (React + Tailwind/CSS) and mobile (React Native). Text wrapping and font smoothing are **web-only**; Dynamic Type, `adjustsFontSizeToFit`, and `fontVariant` are **mobile-first**. Tabular numbers exist on both.

## Text Wrapping — Web only

React Native has **no** `text-wrap` property. Everything in this section is web-only; the mobile equivalent (controlling line count and shrink-to-fit) is covered under [Mobile Text Layout](#mobile-text-layout-react-native).

### text-wrap: balance

Distributes text evenly across lines, preventing orphaned words on headings and short blocks. **Only works on blocks of ~6 lines or fewer** (Chromium) / 10 or fewer (Firefox) — the algorithm is expensive, so browsers cap it.

```css
/* Good — even line lengths on short headings */
h1, h2, h3 {
  text-wrap: balance;
}
```

```css
/* Bad — balance on a long paragraph (silently ignored, wastes intent) */
.article-body p {
  text-wrap: balance;
}
```

**Tailwind:** `text-balance`

### text-wrap: pretty

Prevents a single dangling word on the last line by nudging breaks throughout the paragraph. No line-count limit. This is the **default for short-to-medium body text** — paragraphs, descriptions, captions, list items.

```css
/* Good — descriptions, captions, short paragraphs */
p, li, figcaption, blockquote {
  text-wrap: pretty;
}
```

```tsx
// Tailwind
<p className="text-pretty">A short paragraph that won't orphan its last word.</p>
```

**Tailwind:** `text-pretty`

### When to Use Which (Web)

| Scenario | Use |
| --- | --- |
| Headings, titles where even distribution matters | `text-wrap: balance` |
| Short-to-medium body — paragraphs, captions, UI text | `text-wrap: pretty` |
| Long text (10+ lines), code blocks, `<pre>` | Neither — leave default |

## Font Smoothing — Web only (macOS)

On macOS, text renders heavier than intended by default. Apply antialiased smoothing **once at the root** so all text renders crisper and consistent.

```css
/* Good — applied once at the root */
html {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

```tsx
// Tailwind — apply to root layout
<html className="antialiased">
```

```css
/* Bad — per-element, inconsistent weight across the page */
.heading { -webkit-font-smoothing: antialiased; }
.body    { /* no smoothing → heavier than heading */ }
```

Other platforms ignore these properties, so it's safe to apply universally. **Mobile note:** React Native has no equivalent — text smoothing is handled by the OS text engine (Core Text / Skia), so there is nothing to set.

## Tabular Numbers — Both platforms

Any number that updates in place (counters, prices, timers, table columns, scoreboards) needs fixed-width digits so the layout doesn't shift as values change.

```css
/* Web — CSS */
.counter { font-variant-numeric: tabular-nums; }
```

```tsx
// Web — Tailwind
<span className="tabular-nums">{count}</span>
```

```tsx
// Mobile — React Native
import { Text, StyleSheet } from 'react-native'

<Text style={styles.counter}>{count}</Text>

const styles = StyleSheet.create({
  counter: { fontVariant: ['tabular-nums'] },
})
```

### When to Use (both platforms)

| Use tabular numbers | Don't |
| --- | --- |
| Counters and timers | Static display numbers |
| Prices that update | Decorative large numbers |
| Table / list columns of numbers | Phone numbers, zip codes |
| Animated number transitions | Version numbers (v2.1.0) |
| Scoreboards, dashboards, live metrics | |

**Caveat:** Some fonts (e.g. Inter) redraw `1` wider/centered under this setting — expected and usually desirable for alignment, but verify in your font. On mobile, `fontVariant` support depends on the font supporting the OpenType feature; system fonts (SF Pro / Roboto) do.

## Mobile Text Layout (React Native)

Since there's no `text-wrap`, these are the levers that keep mobile text from breaking or shifting the layout.

### Respect Dynamic Type — `allowFontScaling`

`<Text>` scales with the OS font-size / accessibility setting by default (`allowFontScaling` is `true`). **Keep it on** for body content — honoring Dynamic Type is a native-feel requirement.

```tsx
// Good — body text respects the user's Dynamic Type setting (default)
<Text style={styles.body}>{description}</Text>

// Acceptable — cap runaway scaling on a tight, non-essential label
<Text maxFontSizeMultiplier={1.3} style={styles.badge}>{count}</Text>

// Bad — silently disabling accessibility scaling on readable content
<Text allowFontScaling={false}>{description}</Text>
```

Only disable `allowFontScaling` for things that genuinely cannot scale (e.g. a fixed-geometry logo lockup), and prefer `maxFontSizeMultiplier` to a hard `false`.

### Shrink to Fit — `adjustsFontSizeToFit` + `numberOfLines`

For fixed-width containers (buttons, chips, single-line titles) let the text shrink rather than wrap or clip. `adjustsFontSizeToFit` only takes effect when paired with `numberOfLines`.

```tsx
// Good — single-line title that shrinks instead of truncating
<Text numberOfLines={1} adjustsFontSizeToFit style={styles.title}>
  {product.name}
</Text>

// Good — cap lines and ellipsize long body copy
<Text numberOfLines={2} ellipsizeMode="tail" style={styles.body}>
  {description}
</Text>

// Bad — no line cap; long text pushes siblings around unpredictably
<Text style={styles.title}>{product.name}</Text>
```

### Letter Spacing

Tighten large display text slightly and open up small all-caps labels — same intent as web `letter-spacing`, set via the `letterSpacing` style (points, not em).

```tsx
const styles = StyleSheet.create({
  display: { fontSize: 32, letterSpacing: -0.5 }, // tighten large text
  overline: { fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
})
```

### Avoiding Text Layout Shift

- **Reserve space** for async text with `minHeight` or a placeholder so content doesn't jump when it loads.
- **Cap lines** with `numberOfLines` so variable-length strings can't reflow siblings.
- **Use `tabular-nums`** for live-updating numbers (above).
- **Set `lineHeight` explicitly** on multi-line text so font swaps / scaling don't change block height unexpectedly.

### When to Use Which (Mobile)

| Scenario | Use |
| --- | --- |
| Body copy, descriptions | Default scaling on; explicit `lineHeight`; `numberOfLines` + `tail` |
| Single-line title in a fixed box | `numberOfLines={1}` + `adjustsFontSizeToFit` |
| Tight badge / metric that must not overflow | `maxFontSizeMultiplier` + `tabular-nums` |
| Fixed-geometry lockup that cannot scale | `allowFontScaling={false}` (last resort) |

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
