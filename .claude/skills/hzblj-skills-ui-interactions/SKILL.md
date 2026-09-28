---
name: hzblj-skills-ui-interactions
description: >-
  Cross-platform interaction polish — press/tap feedback (scale 0.96), haptics, hover, focus rings, disabled/loading, minimum hit area, no transition:all, will-change. Triggers on: press feedback, scale on press, haptics, ripple, hover, focus-visible, active state.
disable-model-invocation: true
---

# Interactions

Press/tap feedback, haptics, hover, focus rings, disabled/loading states, hit area, and skipping animation on first load. Press feedback and hit area are shared; **haptics** are mobile-only; **hover** and **focus-visible rings** are web-only.

## Press / Tap Feedback

A subtle scale-down on press gives a control tactile weight. Always `scale(0.96)`. **Never below `0.95`** — anything smaller feels exaggerated. Feedback must be interruptible: releasing mid-press should smoothly return. Not every control needs it — expose a `static` escape hatch to disable it where motion would distract.

### Web — `active:scale-[0.96]` + `transition-transform`

```tsx
<button className="transition-transform duration-150 ease-out active:scale-[0.96]">
  Click me
</button>
```

The `active:` variant is interruptible for free — releasing mid-press returns smoothly. No motion library needed; this is plain CSS on the compositor.

#### `static` prop pattern

```tsx
const tapScale = 'active:not-disabled:scale-[0.96]'

const Button = ({ static: isStatic, className, children, ...props }) => {
  return (
    <button
      className={cn('transition-transform duration-150 ease-out', !isStatic && tapScale, className)}
      {...props}
    >
      {children}
    </button>
  )
}

<Button>Click me</Button>       {/* scales on press */}
<Button static>Submit</Button>   {/* no scale */}
```

### Mobile — `Pressable` + Reanimated scale (and/or `android_ripple`)

`Pressable` gives you `onPressIn`/`onPressOut`; drive a Reanimated shared value so the scale is interruptible. Layer Android's ripple on top for a native Material feel.

```tsx
import { Pressable } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

const PressButton = ({ onPress, static: isStatic, children }) => {
  const scale = useSharedValue(1)
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { if (!isStatic) scale.value = withTiming(0.96, { duration: 100 }) }}
      onPressOut={() => { scale.value = withTiming(1, { duration: 100 }) }}
      android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: false }}
      style={style}
    >
      {children}
    </AnimatedPressable>
  )
}
```

Guidance: iOS convention is scale-down; Android convention is ripple. Doing both is fine and reads native on each. On Android, `android_ripple` with `borderless: true` suits icon-only buttons; `false` (bounded) suits filled buttons and cards.

## Haptics — Mobile only

Physical feedback is a core part of native feel on iOS (and, more coarsely, Android). Use `expo-haptics`, fire on the JS thread right when the interaction registers, and match the haptic type to the event. **Haptics do not exist on the web** — there is no equivalent, so this section is mobile-only.

```tsx
import * as Haptics from 'expo-haptics'

// Meaningful tap — primary actions, confirming a choice, adding to cart
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)   // subtle
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)  // more assertive actions

// Selection change — toggles, segmented controls, pickers, steppers
Haptics.selectionAsync()

// Outcome — result of an operation
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
```

### When to fire (and when not to)

| Fire haptics | Do NOT fire haptics |
| --- | --- |
| Primary/confirming taps (submit, add to cart, like) → `impact(Light/Medium)` | On every scroll frame or scroll end |
| Toggle / segmented / picker / stepper change → `selection` | On every keystroke while typing |
| Operation success or failure → `notification(Success/Error)` | On passive/automatic state changes the user didn't trigger |
| Reaching a snap point or a slider detent → `selection` | On disabled buttons (no visual or haptic response) |
| Long-press activating a context menu → `impact(Medium)` | Repeatedly in a tight loop (feels like a buzz, drains battery) |

Rules of thumb: one haptic per discrete user action; keep it subtle (`Light` is the safe default); don't stack haptics with rapid-fire events; and remember Android's actuator is coarser than iOS's Taptic Engine, so reserve `Heavy` impacts for genuinely significant moments. Respect the OS setting — if the system has haptics/vibration disabled, `expo-haptics` no-ops, which is the correct behavior.

## Hover States — Web only

Touch devices have no hover, so hover is a **web-only enhancement**. Never hide a primary action or essential information behind hover — it must remain reachable without it. Use hover for lift/reveal affordances, and specify the exact property you transition (never `transition: all`).

```tsx
// Good — hover raises the shadow; core action isn't hover-gated
<div className="shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 ease-out hover:shadow-[var(--shadow-border-hover)]" />
```

React Native has no hover for touch. (`Pressable` exposes an `onHoverIn`/`onHoverOut` pair that only fires on web / pointer platforms — don't rely on it for phone/tablet UX.)

## Focus-Visible Rings — Web only

Keyboard users need a visible focus indicator; `:focus-visible` shows it for keyboard focus without flashing a ring on every mouse click. Always render a ring — never `outline: none` without a replacement.

```tsx
<button className="outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-900">
  Continue
</button>
```

On mobile, focus rings are not part of touch UX; focus is only relevant on platforms with a hardware keyboard/D-pad (tvOS, keyboard-attached tablets) and is handled by the OS focus engine — don't hand-roll rings for phone UI.

## Disabled and Loading States

- **Disabled:** reduce opacity, remove press feedback, and stop pointer/touch events. Web: `disabled:opacity-50 disabled:pointer-events-none` (+ `active:not-disabled:scale-*` so a disabled button never scales). Mobile: `disabled` prop on `Pressable` plus a `disabled` style; guard the scale/haptic so neither fires.
- **Loading:** keep the control's width stable so the layout doesn't jump when a spinner replaces the label — reserve space or swap label↔spinner in place. Disable interaction while loading, and don't fire press feedback or haptics on a loading control.

```tsx
// Web
<button
  disabled={loading}
  className="transition-transform duration-150 ease-out active:not-disabled:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none"
>
  {loading ? <Spinner /> : 'Save'}
</button>
```

## Minimum 44×44 Hit Area

Interactive targets need at least 44×44px (WCAG), 40×40 floor. When the visible control is smaller, expand the target without changing its look — pseudo-element on web, `hitSlop` on mobile. Two interactive elements must never have overlapping hit areas. Full patterns are in [surfaces](../hzblj-skills-ui-surfaces/SKILL.md#hit-areas--both-platforms).

```tsx
// Web — pseudo-element to 44px
<button className="relative size-5 after:absolute after:top-1/2 after:left-1/2 after:size-11 after:-translate-1/2" />

// Mobile — hitSlop
<Pressable hitSlop={12}><CloseIcon width={20} height={20} /></Pressable>
```

## Skip Animation on First Load

Elements already in their default state shouldn't animate in on first render — only on subsequent state changes. An icon that fades in every page load looks broken.

### Web — CSS transitions don't replay; gate keyframes

A CSS **transition** only animates when a value *changes* — it never fires on first paint. So a transition-based swap is skip-on-load for free: keep both states mounted and cross-fade on change (this is the icon cross-fade in [motion](../hzblj-skills-ui-motion/SKILL.md)).

```tsx
// Good — transition only runs when isActive flips, never on mount
<span
  className={cn(
    'transition-[opacity,scale] duration-300',
    isActive ? 'scale-100 opacity-100' : 'scale-[0.25] opacity-0',
  )}
>
  <Icon />
</span>
```

For a one-shot **keyframe or GSAP** enter (which *does* fire on mount), gate it behind a "mounted" ref so it plays only on later changes:

```tsx
import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

const mounted = useRef(false)

useGSAP(() => {
  if (!mounted.current) {
    mounted.current = true
    return // skip the first render — the element is already in place
  }
  gsap.from(el.current, { opacity: 0, scale: 0.25, duration: 0.3, ease: 'power2.out' })
}, { dependencies: [isActive] })
```

Do **not** gate an intentional first-time entrance (a staggered hero, a loading state) — that's exactly when the enter should play. Verify on a full refresh.

### Mobile — mounted guard

Reanimated `entering` runs on mount. For content present at first paint, either omit `entering` or guard it so it only applies after the first render.

```tsx
import { useRef } from 'react'
import Animated, { FadeInDown } from 'react-native-reanimated'

const Row = ({ children }) => {
  const mounted = useRef(false)
  const entering = mounted.current ? FadeInDown.duration(300) : undefined
  mounted.current = true
  return <Animated.View entering={entering}>{children}</Animated.View>
}
```

## Never `transition: all` — Web only

Always name the exact properties you animate: `transition-[scale,opacity]`. `transition-transform` already covers `transform, translate, scale, rotate`, so you rarely need to list those individually. `transition: all` animates unrelated properties (color, layout, box-shadow) that change for other reasons and causes jank. On mobile this is moot — Reanimated animates only the shared values you drive, so there is no "animate everything" footgun.

## When to Animate / When Not To

| Animate | Don't animate |
| --- | --- |
| Press feedback on tappable controls (`0.96`) | Static, non-interactive surfaces |
| State-change icon swaps | Text-heavy content reflowing on every render |
| Enter of newly added list items / screens | Elements already present at first paint (skip-on-load) |
| Toggle/segmented selection (+ haptic on mobile) | Continuous events (scroll frames, keystrokes) |
| Success/error confirmation (+ notification haptic) | Disabled or loading controls |
| Hover lift on web (enhancement only) | Anything a touch user can't reach without hover |

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
