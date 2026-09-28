---
name: hzblj-skills-gsap-scroll-trigger
description: >-
  GSAP ScrollTrigger — trigger/start/end, scrub, pin, toggleActions, snap, batch, responsive matchMedia, cleanup. Use for scroll-linked web animations. Triggers on: ScrollTrigger, scroll animation, scrub, pin, parallax, markers.
disable-model-invocation: true
---

# ScrollTrigger

Scroll-linked motion: required config, scrub, pin, toggleActions, snap, markers, batching, responsive `matchMedia`, refresh, and cleanup.

ScrollTrigger ties any tween or timeline to the scroll position. Register it once, then attach a `scrollTrigger` config to a tween or create a standalone `ScrollTrigger.create()`.

```ts
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP, ScrollTrigger)
```

## Always Define `trigger`, `start`, `end`

Never rely on defaults for these three. Being explicit makes the trigger predictable and readable at a glance.

```ts
// Good — explicit trigger and boundaries
gsap.from(sectionRef.current, {
  y: 80,
  opacity: 0,
  duration: 0.8,
  ease: 'power3.out',
  scrollTrigger: {
    trigger: sectionRef.current,
    start: 'top 80%',   // when section top hits 80% down the viewport
    end: 'top 30%',     // ...until section top hits 30% down
    toggleActions: 'play none none reverse',
  },
})
```

```ts
// Bad — no start/end, behavior depends on invisible defaults
gsap.from(sectionRef.current, {
  y: 80,
  opacity: 0,
  scrollTrigger: sectionRef.current,
})
```

The `start`/`end` syntax is `"[trigger position] [viewport position]"`: `'top 80%'` means "when the top of the trigger reaches 80% down the viewport." Values can also be pixels, percentages, or functions.

## Scrub: `true` vs Numeric Smoothing

`scrub` links animation progress directly to scroll position. Use it for progress-driven motion (parallax, progress bars, reveals tied to scroll depth).

| Value | Behavior | Use when |
| --- | --- | --- |
| `scrub: true` | Progress tracks scroll **exactly**, frame-for-frame | You want a 1:1 lock with no lag |
| `scrub: 1` | Progress **eases** toward the scroll position over ~1s | Smoother, more premium feel (recommended default) |
| `scrub: 0.5` | Same smoothing, snappier catch-up | Subtle smoothing without noticeable lag |

```ts
// Good — numeric scrub adds smoothing, feels premium
gsap.to('.parallax__layer', {
  yPercent: -30,
  ease: 'none',              // scrubbed tweens should use linear ease
  scrollTrigger: {
    trigger: '.parallax',
    start: 'top bottom',
    end: 'bottom top',
    scrub: 1,
  },
})
```

Always pair `scrub` with `ease: 'none'` on the tween — the scroll position *is* the easing, so an ease on top double-applies and feels laggy.

## Pin

`pin` fixes an element in place while the page scrolls through the trigger's `start`→`end` range. Pin the element you want held, and give the section enough scroll distance via `end`.

```ts
// Good — pin a panel while its content animates through
gsap.to('.steps__track', {
  xPercent: -66,               // reveal 3 horizontal panels
  ease: 'none',
  scrollTrigger: {
    trigger: '.steps',
    start: 'top top',
    end: '+=2000',             // 2000px of scroll drives the animation
    pin: true,
    scrub: 1,
    anticipatePin: 1,          // reduces a flash on fast scroll into the pin
  },
})
```

Pinning changes layout (ScrollTrigger wraps the element). Test surrounding spacing, and prefer pinning a wrapper over a flex/grid child.

## toggleActions

For non-scrubbed triggers, `toggleActions` defines what happens at the four boundary events: `onEnter onLeave onEnterBack onLeaveBack`. Each slot takes `play`, `pause`, `resume`, `reverse`, `restart`, `complete`, `reset`, or `none`.

```ts
// Good — play on enter, reverse when scrolling back up past the start
scrollTrigger: {
  trigger: '.card',
  start: 'top 85%',
  toggleActions: 'play none none reverse',
}
```

| toggleActions | Effect |
| --- | --- |
| `'play none none none'` | Play once on enter, never reverse (fire-and-forget reveal) |
| `'play none none reverse'` | Play on enter, reverse when scrolling back up (replayable) |
| `'restart none none reset'` | Restart every time it enters, reset when leaving backward |
| `'play pause resume reverse'` | Full bidirectional control |

Do not set `toggleActions` together with `scrub` — `scrub` owns progress and ignores toggle actions.

## Snap

`snap` settles the scroll to defined points after the user stops scrolling — ideal for sectioned or step layouts.

```ts
// Good — snap to each of 4 evenly spaced progress points
scrollTrigger: {
  trigger: '.sections',
  start: 'top top',
  end: 'bottom bottom',
  scrub: 1,
  snap: {
    snapTo: 1 / 3,             // 4 points at 0, 1/3, 2/3, 1
    duration: { min: 0.2, max: 0.6 },
    ease: 'power1.inOut',
  },
}
```

`snapTo` also accepts `'labels'` (snap to timeline labels), an array of values, or a function.

## Markers — Dev Only

`markers: true` draws the start/end lines in the viewport. Invaluable while building, but must never reach production. Gate it behind an environment flag.

```ts
// Good — markers only in development
scrollTrigger: {
  trigger: '.section',
  start: 'top 80%',
  end: 'bottom 20%',
  markers: process.env.NODE_ENV === 'development',
}
```

```ts
// Bad — markers hardcoded, ships to users
scrollTrigger: { trigger: '.section', markers: true }
```

## `ScrollTrigger.batch()` for Lists

For many similar elements (cards, list rows, gallery items), do **not** create one ScrollTrigger per element — that is dozens of triggers all recalculating on scroll. Use `batch()` to reveal them in groups with a single efficient mechanism.

```ts
// Good — one batch reveals cards as they enter, staggered per group
ScrollTrigger.batch('.card', {
  start: 'top 85%',
  onEnter: (batch) =>
    gsap.from(batch, {
      y: 40,
      opacity: 0,
      duration: 0.6,
      ease: 'power3.out',
      stagger: 0.08,
      overwrite: true,
    }),
})
```

```ts
// Bad — a separate trigger for every card, hundreds of scroll listeners
cards.forEach((card) => {
  gsap.from(card, { y: 40, opacity: 0, scrollTrigger: { trigger: card, start: 'top 85%' } })
})
```

## Responsive with `gsap.matchMedia()`

Scroll distances and pins that work on desktop rarely work on mobile. Define breakpoint-specific setups with `matchMedia`; GSAP reverts each context automatically when the media query stops matching.

```ts
// Good — different pin distance per breakpoint, auto-reverted
const mm = gsap.matchMedia()

mm.add('(min-width: 768px)', () => {
  gsap.to('.gallery', {
    xPercent: -60,
    ease: 'none',
    scrollTrigger: { trigger: '.gallery', start: 'top top', end: '+=2000', pin: true, scrub: 1 },
  })
})

mm.add('(max-width: 767px)', () => {
  // simpler vertical reveal on small screens — no pin
  gsap.from('.gallery__item', {
    opacity: 0,
    y: 30,
    stagger: 0.1,
    scrollTrigger: { trigger: '.gallery', start: 'top 80%' },
  })
})
```

## `ScrollTrigger.refresh()`

ScrollTrigger caches start/end positions on load. When layout changes after that — async images load, fonts swap, an accordion opens, a route transition finishes — the cached positions are wrong. Call `ScrollTrigger.refresh()` to recompute.

```ts
// Good — recompute after late-loading content settles layout
useGSAP(() => {
  // ...create triggers...
  const img = document.querySelector('img')
  img?.addEventListener('load', () => ScrollTrigger.refresh())
}, { scope: containerRef })
```

For SplitText and font-dependent layouts, refresh after `document.fonts.ready` (see [text](../hzblj-skills-gsap-text/SKILL.md)).

## Cleanup

`useGSAP` auto-cleans: any ScrollTrigger created inside its callback is reverted (killed, pin markup removed, inline styles cleared) when the component unmounts or dependencies change. **Do not** manually `kill()` triggers created inside `useGSAP` — you would double-clean.

```ts
// Good — useGSAP handles cleanup; no manual kill needed
useGSAP(() => {
  gsap.from('.reveal', {
    opacity: 0,
    y: 40,
    scrollTrigger: { trigger: '.reveal', start: 'top 80%' },
  })
}, { scope: containerRef })
```

Only reach for manual cleanup when you create triggers **outside** a `useGSAP`/`gsap.context()` (e.g. a plain module-level setup). Then kill them explicitly:

```ts
// Only when NOT using useGSAP — kill everything you created
return () => ScrollTrigger.getAll().forEach((t) => t.kill())
```

See [react](../hzblj-skills-gsap-react/SKILL.md) for the full `useGSAP` cleanup model and [timelines](../hzblj-skills-gsap-timelines/SKILL.md) for driving a timeline from a single trigger.

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
