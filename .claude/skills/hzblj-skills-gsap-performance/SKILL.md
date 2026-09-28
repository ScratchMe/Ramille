---
name: hzblj-skills-gsap-performance
description: >-
  GSAP performance — animate transform/opacity only, extract duration/easing constants, will-change, force3D, ScrollTrigger perf, prefers-reduced-motion. Use when optimizing web animations. Triggers on: jank, will-change, transform opacity, reduced motion, gsap performance.
disable-model-invocation: true
---

# Performance

Animate compositor-only properties, avoid layout props, use `will-change` sparingly, `force3D`, ScrollTrigger performance, and reduced motion via `gsap.matchMedia()`.

60fps means every frame has ~16ms of budget. Animating the wrong property blows that budget by forcing the browser to recalculate layout and repaint on every frame. GSAP is fast, but it can only be as fast as the properties you ask it to change.

## Animate `transform` and `opacity` Only

The browser can move, scale, rotate, and fade an element on the **compositor thread (GPU)** without touching layout or paint. GSAP exposes shorthand transform properties — use them.

| GSAP property | Maps to | Cheap? |
| --- | --- | --- |
| `x`, `y` | `translate3d(...)` | Yes |
| `xPercent`, `yPercent` | `translate` in % of the element's own size | Yes |
| `scale`, `scaleX`, `scaleY` | `scale(...)` | Yes |
| `rotation`, `rotationX/Y` | `rotate(...)` | Yes |
| `skewX`, `skewY` | `skew(...)` | Yes |
| `opacity` | `opacity` | Yes |

```ts
// Good — transform + opacity, composited on the GPU
gsap.from('.card', { x: -40, opacity: 0, duration: 0.6, ease: 'power3.out' })
```

## Avoid Layout Properties

`top`, `left`, `width`, `height`, `margin`, and `padding` trigger **layout (reflow)** and **paint** every frame — the two most expensive stages of the pipeline. Animating them janks even a simple tween.

```ts
// Bad — animates layout, forces reflow+paint each frame
gsap.to('.box', { left: 200, top: 100, width: 400, duration: 0.6 })

// Good — same visual result on the compositor
gsap.to('.box', { x: 200, y: 100, scaleX: 2, duration: 0.6, ease: 'power2.out' })
```

If you must change size, prefer `scale` and accept the visual stretch, or animate `transform` and reconcile the real dimensions at the end (`onComplete`). Use `gsap.set()` to establish initial layout position **once** (not per frame), then only tween transforms.

## GPU-Compositable Properties

| Property | GPU-compositable | Safe to animate every frame |
| --- | --- | --- |
| `transform` (`x`, `y`, `scale`, `rotation`, `skew`) | Yes | Yes |
| `opacity` | Yes | Yes |
| `filter` (`blur`, `brightness`) | Yes | Yes (moderate cost) |
| `clip-path` | Yes | Yes (moderate cost) |
| `top`, `left`, `right`, `bottom` | No | No — triggers layout |
| `width`, `height` | No | No — triggers layout |
| `margin`, `padding` | No | No — triggers layout |
| `background`, `border`, `box-shadow` | No | No — triggers paint |
| `color` | No | No — triggers paint |

## Extract Duration and Easing into Constants

Never scatter magic numbers across tweens. Define named constants and reuse them so motion feels like one system.

```ts
// Good — one source of truth
const DURATION = 0.6
const EASE = 'power3.out'

gsap.from('.card', { opacity: 0, y: 40, duration: DURATION, ease: EASE })
```

```ts
// Bad — inconsistent, unnameable magic values
gsap.from('.card', { opacity: 0, y: 37, duration: 0.55, ease: 'power2.inOut' })
```

## `will-change` Sparingly

`will-change` pre-promotes an element to its own GPU layer, avoiding a one-time promotion stutter on the first frame. It costs memory per layer, so apply it **only** to compositor-friendly properties and **only** on elements you know will animate — then clear it when done.

```css
/* Good — hint only the property that actually animates */
.pinned-panel {
  will-change: transform;
}

/* Bad — never hint layout/paint props or `all` */
.pinned-panel {
  will-change: all;              /* wastes memory, no benefit */
}
.other {
  will-change: width, background; /* not compositable — no benefit */
}
```

```ts
// Good — add the hint for the animation, then remove it so the layer is freed
gsap.to('.panel', {
  x: 300,
  duration: 0.6,
  ease: 'power3.out',
  onStart: () => gsap.set('.panel', { willChange: 'transform' }),
  onComplete: () => gsap.set('.panel', { willChange: 'auto' }),
})
```

Only add it when you actually observe first-frame stutter (Safari benefits most). Don't sprinkle it on every animated element.

## `force3D`

`force3D` controls whether GSAP uses 3D transforms (`translate3d`) to keep an element on its own GPU layer. The default (`'auto'`) applies 3D during the tween and reverts to 2D afterward to save memory — the right choice almost always.

| Value | Behavior |
| --- | --- |
| `'auto'` *(default)* | 3D during the animation, 2D when idle — best of both |
| `true` | Force 3D permanently — keeps the layer alive to avoid re-promotion flicker on rapid repeats |
| `false` | Never force 3D — only if 3D causes text blur/artifacts on a specific element |

```ts
// Good — keep a frequently re-triggered element on its layer to avoid flicker
gsap.to('.cursor', { x, y, duration: 0.3, force3D: true })
```

Leave it at `'auto'` unless you have a concrete reason. Set `force3D: false` only to fix subpixel text blur that 3D layering can cause on some fonts.

## ScrollTrigger Performance

Scroll fires constantly — anything expensive attached to it multiplies across every frame of scrolling.

- **Prefer numeric `scrub` smoothing.** `scrub: 1` eases progress over ~1s, which both feels premium and decouples animation from raw scroll frequency. See [scroll-trigger](../hzblj-skills-gsap-scroll-trigger/SKILL.md).
- **Enable `fastScrollEnd`.** On fast flicks it snaps the animation to completion instead of playing a long catch-up, avoiding a pile-up of queued frames.
- **Keep `onUpdate` cheap.** It runs on every scroll tick. No DOM queries, no layout reads (`getBoundingClientRect`), no allocations, no React `setState`. Cache references outside the callback.
- **Batch lists** with `ScrollTrigger.batch()` instead of one trigger per item.
- **Refresh, don't recreate.** After layout changes call `ScrollTrigger.refresh()` rather than tearing down and rebuilding triggers.

```ts
// Good — smoothed scrub, fastScrollEnd, cheap onUpdate reading a cached target
gsap.to('.progress', {
  scaleX: 1,
  ease: 'none',
  scrollTrigger: {
    trigger: '.article',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1,
    fastScrollEnd: true,
    onUpdate: (self) => {
      bar.style.setProperty('--p', String(self.progress)) // cheap, no layout read
    },
  },
})
```

```ts
// Bad — expensive layout read + state update on every scroll tick
scrollTrigger: {
  scrub: true,
  onUpdate: () => {
    const rect = document.querySelector('.article')!.getBoundingClientRect() // forced reflow
    setScrollProgress(rect.top) // React re-render every frame
  },
}
```

## Reduced Motion via `gsap.matchMedia()`

Respect `prefers-reduced-motion: reduce`. `matchMedia` lets you register a full-motion branch and a reduced branch; GSAP reverts each automatically when the query stops matching, so cleanup is free.

```ts
// Good — full motion for most, instant/settled state for reduced-motion users
const mm = gsap.matchMedia()

mm.add(
  {
    animate: '(prefers-reduced-motion: no-preference)',
    reduce: '(prefers-reduced-motion: reduce)',
  },
  (context) => {
    const { animate } = context.conditions as { animate: boolean; reduce: boolean }

    if (animate) {
      gsap.from('.card', { y: 40, opacity: 0, stagger: 0.1, duration: 0.6, ease: 'power3.out' })
    } else {
      // reduced motion: no travel — just ensure final state (or a quick, minimal fade)
      gsap.set('.card', { opacity: 1, y: 0 })
    }
  },
)
```

```ts
// Bad — ignores the OS setting, forces motion on everyone
gsap.from('.card', { y: 40, opacity: 0, stagger: 0.1 })
```

**Rule:** The reduced branch should remove *movement* (translation, scale, parallax, pinning) — a near-instant opacity change is acceptable, but no travel or scrubbed motion. Always confirm content is fully visible in the reduced branch.

See [scroll-trigger](../hzblj-skills-gsap-scroll-trigger/SKILL.md) for scrub/pin tuning, [text](../hzblj-skills-gsap-text/SKILL.md) for the reduced-motion text fallback, and [react](../hzblj-skills-gsap-react/SKILL.md) for where to place `matchMedia` inside `useGSAP`.

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
