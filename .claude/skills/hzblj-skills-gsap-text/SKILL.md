---
name: hzblj-skills-gsap-text
description: >-
  GSAP SplitText type/text animations — split into chars/words/lines, staggered reveals, line masking, font readiness, revert for a11y, reduced motion. Use for animated text reveals. Triggers on: SplitText, text reveal, type animation, word stagger, line mask.
disable-model-invocation: true
---

# Text Animations (SplitText)

Type animations with SplitText: splitting into chars/words/lines, staggered reveals, line masking, waiting for fonts, `revert()` for accessibility, combining with ScrollTrigger, and a reduced-motion fallback.

SplitText breaks a text element into `chars`, `words`, and/or `lines` wrapped in individual elements so each piece can be animated independently. **As of GSAP 3.13, SplitText is free** for everyone — no Club membership required.

```ts
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP, SplitText)

const DURATION = 0.8
const EASE = 'power4.out'
const STAGGER = 0.02
```

## Splitting into chars / words / lines

Tell SplitText what to split into via `type`. Split into the *largest* unit that gives the effect you want — thousands of `chars` is far more DOM than `words` or `lines`.

| `type` value | Produces | Use for |
| --- | --- | --- |
| `'lines'` | One wrapper per visual line | Line-by-line reveals, line masking (cheapest) |
| `'words'` | One wrapper per word | Word staggers, headline emphasis |
| `'chars'` | One wrapper per character | Typewriter, per-letter reveals (heaviest) |
| `'lines, words'` | Both, nested | Masking lines while staggering words |

```ts
const split = new SplitText(headingRef.current, {
  type: 'lines, chars',
  linesClass: 'split-line',   // class added to each line wrapper (for masking)
})

gsap.from(split.chars, {
  yPercent: 100,
  opacity: 0,
  duration: DURATION,
  ease: EASE,
  stagger: STAGGER,
})
```

## Always Wait for Fonts

SplitText measures text to compute line breaks. If you split **before** the webfont loads, the browser measures the fallback font, then the real font swaps in and reflows — breaking every line wrapper. Always `await document.fonts.ready` first.

```ts
// Good — split only after fonts are ready, so line breaks are correct
useGSAP(() => {
  document.fonts.ready.then(() => {
    const split = new SplitText(headingRef.current, { type: 'lines' })
    gsap.from(split.lines, { yPercent: 100, opacity: 0, duration: DURATION, ease: EASE, stagger: 0.1 })
  })
}, { scope: containerRef })
```

```ts
// Bad — splits immediately; fallback font measured, real font reflows, lines break
useGSAP(() => {
  const split = new SplitText(headingRef.current, { type: 'lines' })
  gsap.from(split.lines, { yPercent: 100 })
}, { scope: containerRef })
```

## Line Masking

The signature "text slides up from behind a mask" effect: wrap each line in an `overflow: hidden` container, then animate the inner line from `yPercent: 100` (fully below the mask) to `0`.

```ts
// Good — lines rise from behind their masks
useGSAP(() => {
  document.fonts.ready.then(() => {
    const split = new SplitText(headingRef.current, {
      type: 'lines',
      linesClass: 'split-line',
    })

    gsap.from(split.lines, {
      yPercent: 100,
      duration: DURATION,
      ease: EASE,
      stagger: 0.12,
    })
  })
}, { scope: containerRef })
```

```css
/* The mask: clip each line so the 100% offset is hidden until it animates up */
.split-line {
  overflow: hidden;
  padding-bottom: 0.1em; /* prevent descenders (g, y, p) being clipped */
}
```

Use `yPercent` (a transform) rather than `y` in pixels so the offset scales with the line height and stays on the compositor. See [performance](../hzblj-skills-gsap-performance/SKILL.md).

## Always `revert()` After Animating

SplitText replaces your text with a tree of wrapper `<div>`s. Left in place, that tree harms **accessibility** (screen readers read fragmented text), **SEO** (crawlers see split markup), and text selection/copy. Once the animation completes, call `split.revert()` to restore the original, semantic text node. It also fixes reflow issues on resize.

```ts
// Good — restore real text once the reveal finishes
useGSAP(() => {
  document.fonts.ready.then(() => {
    const split = new SplitText(headingRef.current, { type: 'lines' })

    gsap.from(split.lines, {
      yPercent: 100,
      opacity: 0,
      duration: DURATION,
      ease: EASE,
      stagger: 0.1,
      onComplete: () => split.revert(), // restore original text for a11y/SEO
    })
  })
}, { scope: containerRef })
```

Note: `useGSAP` reverts its context on unmount, but it does **not** know to call `split.revert()` for a SplitText instance you created manually — do that yourself in `onComplete` (or track the instance and revert it in your own cleanup).

## Combining with ScrollTrigger

Reveal text when it scrolls into view. Split after fonts load, then attach the reveal to a trigger. Refresh ScrollTrigger after splitting since the split changes layout height.

```ts
useGSAP(() => {
  document.fonts.ready.then(() => {
    const split = new SplitText(headingRef.current, { type: 'lines', linesClass: 'split-line' })

    gsap.from(split.lines, {
      yPercent: 100,
      duration: DURATION,
      ease: EASE,
      stagger: 0.12,
      scrollTrigger: {
        trigger: headingRef.current,
        start: 'top 80%',
        toggleActions: 'play none none reverse',
      },
    })

    ScrollTrigger.refresh() // recompute positions after the split reflows layout
  })
}, { scope: containerRef })
```

## Reduced-Motion Fallback

A per-letter text reveal is exactly the kind of motion that triggers vestibular discomfort. Under `prefers-reduced-motion: reduce`, skip the split entirely and show the text instantly.

```ts
// Good — matchMedia branches; reduced users get instant, unsplit text
useGSAP(() => {
  const mm = gsap.matchMedia()

  mm.add(
    {
      animate: '(prefers-reduced-motion: no-preference)',
      reduce: '(prefers-reduced-motion: reduce)',
    },
    (context) => {
      const { animate } = context.conditions as { animate: boolean; reduce: boolean }

      if (!animate) return // reduced motion: leave text as-is, fully visible

      document.fonts.ready.then(() => {
        const split = new SplitText(headingRef.current, { type: 'lines', linesClass: 'split-line' })
        gsap.from(split.lines, {
          yPercent: 100,
          duration: DURATION,
          ease: EASE,
          stagger: 0.12,
          onComplete: () => split.revert(),
        })
      })
    },
  )
}, { scope: containerRef })
```

Ensure the text is visible by default in CSS (no `opacity: 0` baked into styles) so the reduced-motion branch shows it without any JS running.

## Reusable Component

A drop-in `useGSAP`-based reveal that covers font readiness, masking, revert, ScrollTrigger, and reduced motion.

```tsx
'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText)

const DURATION = 0.8
const EASE = 'power4.out'

export const TextReveal = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef<HTMLHeadingElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        document.fonts.ready.then(() => {
          const split = new SplitText(ref.current, { type: 'lines', linesClass: 'split-line' })
          gsap.from(split.lines, {
            yPercent: 100,
            duration: DURATION,
            ease: EASE,
            stagger: 0.12,
            scrollTrigger: { trigger: ref.current, start: 'top 80%' },
            onComplete: () => split.revert(),
          })
          ScrollTrigger.refresh()
        })
      })
    },
    { scope: ref },
  )

  return <h2 ref={ref}>{children}</h2>
}
```

See [react](../hzblj-skills-gsap-react/SKILL.md) for the `useGSAP` scope model and [scroll-trigger](../hzblj-skills-gsap-scroll-trigger/SKILL.md) for trigger boundaries.

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
