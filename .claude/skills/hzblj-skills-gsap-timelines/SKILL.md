---
name: hzblj-skills-gsap-timelines
description: >-
  GSAP 3 timelines — sequencing, defaults, labels, relative position, stagger, repeat/yoyo, control methods, nesting. Use when building sequenced web animations. Triggers on: gsap timeline, sequence, stagger, labels, yoyo, timeScale.
disable-model-invocation: true
---

# Timelines

Sequencing, `defaults`, labels, relative position, stagger, repeat/yoyo, control methods, and nesting.

A `gsap.timeline()` is the backbone of any multi-step animation. It sequences tweens on a shared playhead, so you edit timing in one place instead of hand-tuning a pile of `delay` values that drift out of sync the moment you change one.

## Shared Constants

Define timing once and reuse it across every tween so the whole sequence feels like one system.

```ts
const DURATION = 0.6
const EASE = 'power3.out'
const STAGGER = 0.08
```

## Build with `defaults`, One Tween per Line

Pass `defaults` to the timeline so shared properties aren't repeated on every tween. Chain one tween per line — the sequence reads top to bottom.

```ts
// Good — defaults set once, readable line-by-line sequence
const tl = gsap.timeline({
  defaults: { duration: DURATION, ease: EASE },
})

tl.from('.hero__title', { y: 40, opacity: 0 })
  .from('.hero__subtitle', { y: 24, opacity: 0 }, '-=0.3')
  .from('.hero__cta', { scale: 0.9, opacity: 0 }, '-=0.2')
```

```ts
// Bad — duration/ease repeated, timing hand-tuned with delays that drift
gsap.to('.hero__title', { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', delay: 0 })
gsap.to('.hero__subtitle', { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', delay: 0.3 })
gsap.to('.hero__cta', { scale: 1, opacity: 1, duration: 0.6, ease: 'power3.out', delay: 0.5 })
```

## Relative Position

The optional position parameter after a tween controls where it lands on the timeline. Prefer relative positions and labels over absolute times — absolute values break the moment you change a duration earlier in the sequence.

| Position | Meaning |
| --- | --- |
| *(omitted)* | Append to the end of the timeline (after the last tween) |
| `'-=0.2'` | Start 0.2s **before** the previous tween ends (overlap) |
| `'+=0.1'` | Start 0.1s **after** the previous tween ends (gap) |
| `'<'` | Align with the **start** of the previous tween |
| `'>'` | Align with the **end** of the previous tween (same as omitting) |
| `'<0.1'` | 0.1s after the previous tween's start |
| `'myLabel'` | Start at a named label |
| `'myLabel+=0.2'` | 0.2s after a named label |
| `1.5` | Absolute time — avoid, brittle when earlier durations change |

```ts
// Good — overlap the subtitle into the tail of the title reveal
tl.from('.title', { y: 40, opacity: 0 })
  .from('.subtitle', { y: 24, opacity: 0 }, '<0.15') // starts 0.15s after title starts
```

## Labels

Name key moments with `addLabel` (or the label string on any tween) and position later tweens against them. Labels survive edits to surrounding durations.

```ts
const tl = gsap.timeline({ defaults: { duration: DURATION, ease: EASE } })

tl.addLabel('intro')
  .from('.panel', { xPercent: -100 }, 'intro')
  .from('.panel__items', { opacity: 0, stagger: STAGGER }, 'intro+=0.2')
  .addLabel('outro')
  .to('.panel', { opacity: 0 }, 'outro')
```

## Stagger

`stagger` offsets the start of each target in a selection. Use a number for a simple constant offset, or an object for fine control.

```ts
// Good — simple constant offset between cards
tl.from('.card', { y: 40, opacity: 0, stagger: STAGGER })
```

```ts
// Object form — advanced control
tl.from('.grid__cell', {
  scale: 0.8,
  opacity: 0,
  stagger: {
    each: 0.05,          // seconds between each (use `amount` to spread across a fixed total instead)
    from: 'center',      // 'start' | 'center' | 'end' | 'edges' | index number
    grid: 'auto',        // treat targets as a grid for 2D staggering
    axis: 'y',           // restrict grid stagger to one axis
    ease: 'power2.in',   // distribute the offsets along an ease
  },
})
```

| Option | Purpose |
| --- | --- |
| `each` | Fixed seconds between consecutive targets |
| `amount` | Total time to spread all targets across (overrides `each`) |
| `from` | Origin of the stagger: `'start'`, `'center'`, `'end'`, `'edges'`, or an index |
| `grid` | `'auto'` or `[rows, cols]` — enables 2D distance-based staggering |
| `axis` | Limit grid stagger to `'x'` or `'y'` |

Use `each` when you want a consistent rhythm regardless of count; use `amount` when the whole sequence must finish in a fixed window no matter how many items there are.

## Repeat and Yoyo

```ts
// Good — a looping pulse that eases both directions
const pulse = gsap.timeline({
  repeat: -1,          // -1 = infinite
  yoyo: true,          // reverse on each repeat instead of restarting
  repeatDelay: 0.5,    // pause between cycles
  defaults: { duration: 0.8, ease: 'sine.inOut' },
})

pulse.to('.dot', { scale: 1.2, opacity: 0.6 })
```

`yoyo: true` reverses direction each cycle (A→B→A→B), giving a smooth back-and-forth. Without it, each repeat hard-resets to the start (A→B, A→B) which looks like a jump.

## Control Methods

A timeline is a playback object. Grab the reference and drive it imperatively — from event handlers, other animations, or React refs.

| Method | Effect |
| --- | --- |
| `tl.play()` | Play forward from the current position |
| `tl.pause()` | Freeze at the current position |
| `tl.resume()` | Resume in the current direction |
| `tl.reverse()` | Play backward |
| `tl.restart()` | Jump to start and play |
| `tl.seek(1.5)` | Jump to a time (in seconds) or a label |
| `tl.timeScale(2)` | Speed multiplier — `2` = double speed, `0.5` = half |
| `tl.progress(0.5)` | Jump to a 0–1 fraction of the timeline |
| `tl.paused(true)` | Build paused, then trigger later |

```ts
// Good — build paused, control from handlers (see react.md for contextSafe)
const tl = gsap.timeline({ paused: true, defaults: { duration: DURATION, ease: EASE } })
tl.from('.menu__item', { x: -20, opacity: 0, stagger: STAGGER })

// open:  tl.play()
// close: tl.reverse()
```

## Nesting Timelines with `.add()`

Compose small, self-contained timelines into a master timeline with `.add()`. Each sub-timeline owns its own logic and stays testable; the master controls the overall sequence and can position children with the same relative/label syntax.

```ts
// Good — each section is a factory returning its own timeline
const introTimeline = () => {
  return gsap.timeline().from('.intro__logo', { scale: 0.8, opacity: 0 })
}

const contentTimeline = () => {
  return gsap.timeline().from('.content__row', { y: 30, opacity: 0, stagger: STAGGER })
}

const master = gsap.timeline({ defaults: { duration: DURATION, ease: EASE } })
master
  .add(introTimeline())
  .add(contentTimeline(), '-=0.2') // overlap the two sections
```

```ts
// Bad — one giant flat timeline mixing unrelated sections, impossible to reuse
const tl = gsap.timeline()
tl.from('.intro__logo', {}).from('.content__row', {}).from('.footer', {}) // ...50 more lines
```

**Rule:** Keep each timeline focused on one section. Nest them into a master when you need to coordinate the whole page.

See [scroll-trigger](../hzblj-skills-gsap-scroll-trigger/SKILL.md) to drive a timeline from scroll, [react](../hzblj-skills-gsap-react/SKILL.md) for building timelines inside `useGSAP`, and [performance](../hzblj-skills-gsap-performance/SKILL.md) for which properties are cheap to tween.

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
