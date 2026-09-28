---
name: hzblj-skills-gsap-react
description: >-
  GSAP with React/Next.js — the useGSAP hook, scope, contextSafe, automatic cleanup, plugin registration, never animating React state, SSR. Use when wiring GSAP into React. Triggers on: useGSAP, gsap.context, cleanup, contextSafe, registerPlugin, next.js use client.
disable-model-invocation: true
---

# React Integration (useGSAP)

The `useGSAP` hook from `@gsap/react`: scope, dependency arrays, `contextSafe` event handlers, automatic cleanup, scoped selectors, never animating state, and Next.js SSR.

`useGSAP` is a drop-in replacement for `useEffect`/`useLayoutEffect` that runs your GSAP code inside a `gsap.context()` and **reverts that context automatically** on unmount or when dependencies change. It is the only correct way to write GSAP in React — never hand-roll cleanup in a raw `useEffect`.

```ts
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP) // registering useGSAP silences the "no plugin" warning
```

## Register Plugins Once

Register every plugin at module scope before first use — never inside a render or a loop. Unregistered plugins fail silently in production builds.

```ts
// Good — registered once, at module top
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP, ScrollTrigger)
```

```ts
// Bad — registration buried in a component body, re-runs every render
const Hero = () => {
  gsap.registerPlugin(ScrollTrigger)
  // ...
}
```

## Scope via Ref

Pass a ref as `scope`. Every selector string inside the callback is then resolved **only within that element** — no risk of animating a matching `.card` elsewhere on the page.

```tsx
// Good — selectors scoped to this component's subtree
export const Cards = () => {
  const container = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      gsap.from('.card', { opacity: 0, y: 40, stagger: 0.1, duration: 0.6, ease: 'power3.out' })
    },
    { scope: container },
  )

  return (
    <div ref={container}>
      <div className="card" />
      <div className="card" />
    </div>
  )
}
```

```tsx
// Bad — global selector animates every .card in the document, not just this component's
useGSAP(() => {
  gsap.from('.card', { opacity: 0, y: 40 })
}) // no scope
```

## Dependency Array

`useGSAP(callback, { dependencies, scope })`. Like `useEffect`, the callback re-runs when a dependency changes — and because the previous run's context was reverted, animations are cleanly rebuilt.

```tsx
// Good — re-run and rebuild the animation when `isOpen` changes
useGSAP(
  () => {
    gsap.to('.panel', { height: isOpen ? 'auto' : 0, duration: 0.4, ease: 'power2.inOut' })
  },
  { dependencies: [isOpen], scope: container },
)
```

An empty/omitted dependency array runs once on mount (like `useEffect(fn, [])`). The default config object shape is `{ scope, dependencies, revertOnUpdate }`.

## `contextSafe` for Event Handlers

Animations created **inside event handlers** (click, hover, submit) run *after* the `useGSAP` callback has finished, so they are not automatically added to the context — and therefore not cleaned up. Wrap them with `contextSafe` so they join the scope and get reverted with everything else.

```tsx
// Good — handler animation is contextSafe, so it's scoped and auto-cleaned
export const ExpandButton = () => {
  const container = useRef<HTMLDivElement>(null)

  const { contextSafe } = useGSAP({ scope: container })

  const onClick = contextSafe(() => {
    gsap.to('.box', { rotation: '+=90', duration: 0.4, ease: 'power2.out' })
  })

  return (
    <div ref={container}>
      <button onClick={onClick}>Rotate</button>
      <div className="box" />
    </div>
  )
}
```

```tsx
// Bad — animation created in a handler without contextSafe: unscoped and leaks on unmount
const onClick = () => {
  gsap.to('.box', { rotation: '+=90' })
}
```

## Automatic Cleanup

Everything created inside the `useGSAP` callback — tweens, timelines, ScrollTriggers, Draggables, event listeners added via `gsap`/`ScrollTrigger` — is captured by the context and reverted on unmount. `revert()` kills the animations, removes inline styles GSAP added, and restores the DOM. **Do not** manually `kill()` these; you would fight the automatic cleanup.

```tsx
// Good — no return cleanup needed; useGSAP reverts the whole context
useGSAP(
  () => {
    const tl = gsap.timeline()
    tl.from('.hero__title', { y: 40, opacity: 0 })
    gsap.to('.bg', { yPercent: -20, scrollTrigger: { trigger: '.bg', scrub: 1 } })
  },
  { scope: container },
)
```

```tsx
// Bad — raw useEffect with manual, error-prone cleanup
useEffect(() => {
  const tl = gsap.timeline()
  tl.from('.hero__title', { y: 40, opacity: 0 })
  return () => tl.kill() // forgets ScrollTriggers, listeners, and inline styles
}, [])
```

## Never Query the DOM Globally

Inside React, never reach for `document.querySelector` or a global `gsap.to('.selector')`. Use the scoped selector (via `{ scope }`) or a ref. Global queries can match unmounted/other-component nodes and break under Strict Mode double-invocation.

```tsx
// Good — ref for a single element, scoped selector for groups
const box = useRef<HTMLDivElement>(null)
useGSAP(() => {
  gsap.to(box.current, { x: 100 })
}, { scope: container })
```

```tsx
// Bad — global DOM query, unscoped, fragile
useGSAP(() => {
  gsap.to(document.querySelector('.box'), { x: 100 })
})
```

## Never Animate React State

GSAP mutates the DOM node directly. Animating through `setState` re-renders the component on every frame (up to 60x/second), thrashing reconciliation and stuttering. Hand the DOM node to GSAP and leave React out of the frame loop.

```tsx
// Bad — re-renders every frame, janky, defeats the purpose of GSAP
const [x, setX] = useState(0)
useGSAP(() => {
  gsap.to({ v: 0 }, { v: 100, duration: 1, onUpdate: function () { setX(this.targets()[0].v) } })
})
return <div style={{ transform: `translateX(${x}px)` }} />
```

```tsx
// Good — GSAP writes transform straight to the node, zero re-renders
const box = useRef<HTMLDivElement>(null)
useGSAP(() => {
  gsap.to(box.current, { x: 100, duration: 1 })
}, { scope: box })
return <div ref={box} />
```

## Next.js: `"use client"` and SSR

GSAP touches `window`, `document`, and layout measurement — none of which exist during server rendering. Any component that runs GSAP must be a Client Component.

```tsx
// Good — client component, GSAP runs only in the browser via useGSAP
'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

export const Reveal = () => {
  const ref = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    gsap.from(ref.current, { opacity: 0, y: 40, duration: 0.6, ease: 'power3.out' })
  }, { scope: ref })
  return <div ref={ref}>Content</div>
}
```

| Do | Don't |
| --- | --- |
| Add `'use client'` to any GSAP component | Run GSAP in a Server Component |
| Use `useGSAP` (runs after mount, browser-only) | Call `gsap.to()` at module scope in a server-rendered file |
| Read layout inside `useGSAP` (post-mount) | Read `window`/`document` during render |
| Set initial visual state with `gsap.set()` in the callback | Rely on server HTML matching post-animation DOM (hydration mismatch) |

**Rules:**
- Prefer `useGSAP` over raw `useEffect`/`useLayoutEffect` — it guards timing and cleanup for you.
- Guard against SSR by keeping all GSAP calls inside the `useGSAP` callback (which only fires client-side after mount), never in the render body or at module top (except `registerPlugin`).
- To avoid a flash of unstyled/unanimated content, set the pre-animation state in CSS (e.g. `opacity: 0`) and clear it in the callback, or use `gsap.set()` at the top of the callback.

See [timelines](../hzblj-skills-gsap-timelines/SKILL.md) for building timelines inside the callback, [scroll-trigger](../hzblj-skills-gsap-scroll-trigger/SKILL.md) for scroll cleanup, and [performance](../hzblj-skills-gsap-performance/SKILL.md) for reduced motion.

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
