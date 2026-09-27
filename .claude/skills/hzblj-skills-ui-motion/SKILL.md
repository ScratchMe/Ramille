---
name: hzblj-skills-ui-motion
description: >-
  Cross-platform motion polish — interruptible animations, split & stagger enter, subtle exit, contextual icon cross-fade, skip-animation-on-load. Web uses CSS/Tailwind + GSAP (no motion library). Triggers on: stagger, enter animation, exit animation, icon cross-fade, interruptible, GSAP stagger, skip animation on first load.
disable-model-invocation: true
---

# Motion

Enter/exit transitions, staggering, and contextual icon cross-fades — the **principles**, cross-platform. This file gives a Web snippet (CSS / Tailwind / GSAP) and a Mobile snippet (Reanimated) for each pattern. **No motion library** — the web stack here is plain CSS/Tailwind for state transitions and GSAP for sequenced/staggered motion; there is no `framer-motion`/`motion.div`. For the full mechanics of each engine, defer to the sibling skills: `skills/web/animations/gsap` (timelines, ScrollTrigger, SplitText, stagger) and `skills/mobile/animations/reanimated` (shared values, animated styles, layout animations).

One value applies everywhere: **spring `bounce` / bounciness must be `0`.** These interfaces don't overshoot.

> **Blur on mobile:** CSS `filter: blur()` animates cheaply on the web. React Native has **no** animatable blur on arbitrary views — Reanimated can't tween a blur on a `View`/`Text`. On native, treat the `blur(4px)→0` step as **best-effort**: either omit it (opacity + translateY alone read great) or overlay an `expo-blur` `BlurView` and animate its `intensity`. Never block a mobile animation on blur.

## Interruptible Animations

Users change intent mid-interaction; motion must retarget toward the latest state, not restart.

### Web — Transitions vs. Keyframes

| | CSS Transitions | CSS Keyframe Animations |
| --- | --- | --- |
| **Behavior** | Interpolate toward latest state | Run on a fixed timeline |
| **Interruptible** | Yes — retargets mid-flight | No — restarts from the beginning |
| **Use for** | Interactive state (hover, toggle, open/close) | One-shot sequences (enter, loading) |

```css
/* Good — interruptible transition for a toggle */
.drawer { transform: translateX(-100%); transition: transform 200ms ease-out; }
.drawer.open { transform: translateX(0); }
/* Clicking again mid-animation smoothly reverses — no jank */
```

```css
/* Bad — keyframe on an interactive element; closing mid-flight snaps/restarts */
.drawer.open { animation: slideIn 200ms ease-out forwards; }
```

### Mobile — Reanimated

`withTiming`/`withSpring` written to a shared value interrupt cleanly: assigning a new target mid-animation retargets from the current position. Reserve the layout-animation Component API (`entering`/`exiting`) for mount/unmount.

```tsx
// Good — interruptible; toggling `open` retargets from wherever it is
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated'

const x = useSharedValue(-300)
const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }))

const toggle = () => { x.value = withTiming(open ? 0 : -300, { duration: 200 }) }

<Animated.View style={style}>{children}</Animated.View>
```

**Rule:** interactive state → transitions (web) / shared-value tweens (mobile); one-shot mount/unmount → keyframes (web) / `entering`/`exiting` (mobile).

## Enter Animations: Split and Stagger

Don't animate one big container. Break content into semantic chunks and animate each.

1. **Split** into logical groups (title, description, buttons).
2. **Stagger** groups by **~100ms**.
3. For **titles**, consider splitting into words with **~80ms** stagger.
4. **Combine** `opacity 0→1`, `translateY 12px→0`, and (web) `blur 4px→0`.

### Web — GSAP

```tsx
// GSAP — staggered enter (see skills/web/animations/gsap)
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useRef } from 'react'

const container = useRef<HTMLDivElement>(null)

useGSAP(
  () => {
    gsap.from('.stagger-item', {
      opacity: 0,
      y: 12,
      filter: 'blur(4px)',
      duration: 0.3,
      ease: 'power2.out',
      stagger: 0.1, // ~100ms between children
    })
  },
  { scope: container },
)

<div ref={container}>
  <Title className="stagger-item" />
  <Description className="stagger-item" />
  <Actions className="stagger-item" />
</div>
```

### Web — CSS-only stagger

```css
.stagger-item {
  opacity: 0; transform: translateY(12px); filter: blur(4px);
  animation: fadeInUp 400ms ease-out forwards;
}
.stagger-item:nth-child(1) { animation-delay: 0ms; }
.stagger-item:nth-child(2) { animation-delay: 100ms; }
.stagger-item:nth-child(3) { animation-delay: 200ms; }
@keyframes fadeInUp { to { opacity: 1; transform: translateY(0); filter: blur(0); } }
```

For scroll-linked reveals and SplitText word staggers, use GSAP — see `skills/web/animations/gsap`.

### Mobile — Reanimated

Predefined layout animation with per-item `delay`:

```tsx
import Animated, { FadeInDown } from 'react-native-reanimated'

{items.map((item, i) => (
  <Animated.View key={item.id} entering={FadeInDown.duration(300).delay(i * 100)}>
    <Row {...item} />
  </Animated.View>
))}
```

Custom entering builder for the exact `opacity + translateY(12)` combo (blur omitted on native):

```tsx
import { withTiming, Easing } from 'react-native-reanimated'

// 'worklet' entering builder — matches the web enter minus blur
const enterUp = () => {
  'worklet'
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 12 }] },
    animations: {
      opacity: withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) }),
      transform: [{ translateY: withTiming(0, { duration: 300 }) }],
    },
  }
}

<Animated.View entering={enterUp}>{children}</Animated.View>
```

See `skills/mobile/animations/reanimated` for shared values, custom builders, and layout transitions.

## Exit Animations

Exits should be **softer** than enters — the user's focus is moving on. Use a small **fixed** `translateY(-12px)` (never the full container height) and a **shorter** duration (~150ms vs. ~300ms enter). Keep some directional movement so context is preserved; don't just `display: none`.

### Web

```css
/* Good — subtle exit */
.item-exit {
  opacity: 0; transform: translateY(-12px);
  transition: opacity 150ms ease-in, transform 150ms ease-in;
}
/* Bad — dramatic exit that steals focus */
.item-exit { opacity: 0; transform: translateY(-100%) scale(0.5); transition: all 400ms ease-in; }
```

```tsx
// GSAP — subtle exit, then unmount once it finishes (there's no <AnimatePresence>)
import gsap from 'gsap'

const dismiss = (el: HTMLElement, onDone: () => void) => {
  gsap.to(el, {
    opacity: 0,
    y: -12,
    filter: 'blur(4px)',
    duration: 0.15,
    ease: 'power2.in',
    onComplete: onDone, // unmount in here so the exit is actually seen
  })
}
```

### Mobile — Reanimated

```tsx
import Animated, { FadeOutUp } from 'react-native-reanimated'

// Quick path — predefined, shorter than the enter
<Animated.View exiting={FadeOutUp.duration(150)}>{content}</Animated.View>
```

```tsx
// Exact -12px fixed offset via a custom exiting builder
import { withTiming } from 'react-native-reanimated'

const exitUp = () => {
  'worklet'
  return {
    initialValues: { opacity: 1, transform: [{ translateY: 0 }] },
    animations: {
      opacity: withTiming(0, { duration: 150 }),
      transform: [{ translateY: withTiming(-12, { duration: 150 }) }],
    },
  }
}

<Animated.View exiting={exitUp}>{content}</Animated.View>
```

Use a **full** exit (slide fully out) only when spatial context matters — a card returning to a list, a drawer closing.

## Contextual Icon Animations

When an icon appears/disappears or swaps on state change (play→pause, like→liked), cross-fade it instead of toggling visibility. Use **exactly** these values on both platforms:

- `scale`: `0.25` → `1` (never `0.5`, never `0.6`)
- `opacity`: `0` → `1`
- `blur`: `4px` → `0` (web; best-effort/omitted on mobile)
- timing: **~300ms, no overshoot** — web `cubic-bezier(0.2, 0, 0, 1)` (or a GSAP tween); mobile a non-bouncy spring. **Never bounce/overshoot.**

### Web — CSS cross-fade

Keep both icons in the DOM, one absolutely positioned over the other, and cross-fade with `cubic-bezier(0.2, 0, 0, 1)` — this gives both enter and exit without any library, since neither icon unmounts.

```tsx
<div className="relative">
  <div className={cn(
    'absolute inset-0 flex items-center justify-center',
    'transition-[opacity,filter,scale] duration-300 [transition-timing-function:cubic-bezier(0.2,0,0,1)]',
    isActive ? 'scale-100 opacity-100 blur-0' : 'scale-[0.25] opacity-0 blur-[4px]',
  )}>
    <ActiveIcon />
  </div>
  <div className={cn(
    'transition-[opacity,filter,scale] duration-300 [transition-timing-function:cubic-bezier(0.2,0,0,1)]',
    isActive ? 'scale-[0.25] opacity-0 blur-[4px]' : 'scale-100 opacity-100 blur-0',
  )}>
    <InactiveIcon />
  </div>
</div>
```

The non-absolute icon defines the layout size; the absolute one overlays it without affecting flow. **Rule:** cross-fade with CSS — both icons stay mounted, so it covers enter *and* exit with no library and never animates on first paint. Reach for GSAP only when the swap must be sequenced with other motion.

### Mobile — Reanimated

Drive `scale` + `opacity` from a shared value with a non-bouncy spring; blur is best-effort so it's omitted here.

```tsx
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'
import { useEffect } from 'react'

const IconSwap = ({ isActive }: { isActive: boolean }) => {
  // 0 = inactive shown, 1 = active shown
  const t = useSharedValue(isActive ? 1 : 0)
  useEffect(() => {
    // non-bouncy spring ≈ duration 0.3, bounce 0
    t.value = withSpring(isActive ? 1 : 0, { mass: 0.4, damping: 18, stiffness: 220 })
  }, [isActive])

  const activeStyle = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ scale: 0.25 + 0.75 * t.value }], // 0.25 → 1
  }))
  const inactiveStyle = useAnimatedStyle(() => ({
    opacity: 1 - t.value,
    transform: [{ scale: 1 - 0.75 * t.value }], // 1 → 0.25
  }))

  return (
    <Animated.View>
      <Animated.View style={[{ position: 'absolute' }, activeStyle]}><PauseIcon /></Animated.View>
      <Animated.View style={inactiveStyle}><PlayIcon /></Animated.View>
    </Animated.View>
  )
}
```

For entering/exiting-based icon swaps and the layout-animation API, see `skills/mobile/animations/reanimated`.

### When to Animate Icons (both platforms)

| Animate | Don't animate |
| --- | --- |
| Icons that appear on hover / focus (web action buttons) | Static navigation icons |
| State-change icons (play→pause, like→liked) | Decorative icons |
| Icons in contextual toolbars | Always-visible icons |
| Loading/success indicators | Icon labels (text next to icon) |

## Skip Animation on First Load

Elements already in their default state shouldn't animate in on first render — only on subsequent changes. An enter animation that replays on every mount reads as broken.

- **Web:** CSS **transitions** don't fire on first paint — they animate only when a value changes — so a transition-based swap is skip-on-load by construction (another reason to prefer the CSS cross-fade above). For a one-shot **keyframe/GSAP** enter, gate it behind a "mounted" ref so it plays only on later changes — never on an intentional hero/loading entrance.
- **Mobile:** Guard `entering` behind a "mounted" ref, or omit `entering` for content present at first paint.

## Use `will-change` Sparingly — Web only

Only hint `transform`, `opacity`, or `filter` — never `will-change: all`. Add it only when you observe first-frame stutter (Safari benefits most), and drop it once the animation settles; a permanent hint wastes GPU memory. There is no equivalent on native — Reanimated runs on the UI thread and manages compositing itself.

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
