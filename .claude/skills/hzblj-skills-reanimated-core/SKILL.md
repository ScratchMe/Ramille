---
name: hzblj-skills-reanimated-core
description: >-
  Reanimated core — useSharedValue, useAnimatedStyle, useDerivedValue, useAnimatedReaction, useAnimatedProps, worklet rules, UI vs JS thread, runOnUI/runOnJS, and the .value-only-in-worklets rule. Triggers on: shared value, useAnimatedStyle, worklet, runOnJS, UI thread, .value in render.
disable-model-invocation: true
---

# Core Hooks & the Worklet Model

The foundation of every Reanimated animation: shared values, worklets, and the two-thread model. Get this right and everything else composes cleanly.

## The two-thread model

React Native runs your JS logic on the **JS thread**. Reanimated runs animations on the **UI thread** via *worklets* — small functions that are copied to a separate JS runtime on the UI thread and executed there, in sync with the display's refresh rate.

| | JS thread | UI thread (worklets) |
| --- | --- | --- |
| **Runs** | React render, effects, event handlers, business logic | `useAnimatedStyle`, `useDerivedValue`, gesture callbacks, functions marked `'worklet'` |
| **Blocked by** | Heavy JS work, list rendering, network parsing | Nothing you write should block it — keep worklets tiny |
| **Frame budget** | Not frame-critical | 16.6ms @ 60fps, 8.3ms @ 120fps ProMotion |
| **Can call** | `runOnUI` to schedule worklets | `runOnJS` to call back into JS-only code |

Shared values are the bridge: they can be read/written from both threads, and mutating one on the UI thread never round-trips through React.

Keep all motion on the UI thread: everything that animates must run in a worklet (`useAnimatedStyle`, `useDerivedValue`, gesture callbacks). Never `setState` on every frame to drive motion — that hops to the JS thread and drops frames.

## The golden rule: never touch `.value` during render

Read and write `shared.value` **only** inside:

- worklets (functions with the `'worklet'` directive),
- `useAnimatedStyle` / `useAnimatedProps` / `useDerivedValue` callbacks,
- `useAnimatedReaction`,
- gesture callbacks (`onBegin`/`onUpdate`/`onEnd`),
- `useEffect` / event handlers (JS thread — fine to write, e.g. `sv.value = withTiming(1)`).

Never read or write it in the component render body.

```tsx
// Bad — reading .value during render
const Box = () => {
  const width = useSharedValue(100);
  return <View style={{ width: width.value }} />; // ❌ no subscription, warns/crashes
}
```

```tsx
// Good — read .value inside an animated style worklet
const Box = () => {
  const width = useSharedValue(100);
  const style = useAnimatedStyle(() => ({ width: width.value }));
  return <Animated.View style={style} />;
}
```

## `useSharedValue`

A mutable value that lives on the UI thread and drives animations. Mutating `.value` does **not** trigger a React re-render.

```tsx
import { useSharedValue, withSpring } from 'react-native-reanimated';
import { SPRING } from './constants';

const scale = useSharedValue(1);

// Writing from the JS thread (event handler) is fine:
const onPressIn = () => { scale.value = withSpring(0.96, SPRING); };
const onPressOut = () => { scale.value = withSpring(1, SPRING); };
```

## `useAnimatedStyle`

Returns a style object computed on the UI thread. Reanimated auto-tracks any shared value you read inside — there is no manual dependency array.

```tsx
// Good — animate transform + opacity (composited, no layout pass)
const style = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
  opacity: opacity.value,
}));

return <Animated.View style={[styles.card, style]} />;
```

```tsx
// Bad — animating layout props triggers a layout pass every frame → jank
const style = useAnimatedStyle(() => ({
  width: width.value,
  marginTop: offset.value,
}));
```

The callback is an implicit worklet — you do **not** write `'worklet'` inside hook callbacks; Reanimated's Babel plugin adds it.

## `useDerivedValue`

Compute a new shared value from others on the UI thread. Use it to keep derivation off the JS thread and avoid duplicated math across styles.

```tsx
// Good — derive once, consume in multiple styles
const progress = useSharedValue(0);
const opacity = useDerivedValue(() => progress.value);         // 0 → 1
const translateY = useDerivedValue(() => (1 - progress.value) * 20);

const style = useAnimatedStyle(() => ({
  opacity: opacity.value,
  transform: [{ translateY: translateY.value }],
}));
```

## `useAnimatedReaction`

Run a side effect on the UI thread when a computed value changes — the UI-thread equivalent of "watch this, then do that". Great for triggering a second animation, or hopping to JS with `runOnJS` at a threshold.

```tsx
// Good — fire haptics on the JS thread when a drag crosses a threshold
useAnimatedReaction(
  () => translateX.value > SWIPE_THRESHOLD,   // prepare (worklet)
  (isPastThreshold, wasPastThreshold) => {     // react (worklet)
    if (isPastThreshold && !wasPastThreshold) {
      runOnJS(triggerHaptic)();
    }
  },
);
```

Return only a lightweight value from the first function — don't do heavy work there; it runs on every frame the inputs change.

## `useAnimatedProps`

Animate **props** (not styles) on the UI thread — SVG attributes, `TextInput.text`, scroll offsets, etc. Requires an animated component created with `Animated.createAnimatedComponent`. See [text-and-numbers](../hzblj-skills-reanimated-text-and-numbers/SKILL.md) for the text pattern.

```tsx
import Animated, { useAnimatedProps } from 'react-native-reanimated';
import { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const animatedProps = useAnimatedProps(() => ({
  strokeDashoffset: dashOffset.value,
}));

return <AnimatedCircle animatedProps={animatedProps} /* ... */ />;
```

## Worklet rules

A worklet is a function that runs on the UI thread. Hook callbacks and gesture callbacks are auto-workletized by the Babel plugin. A **standalone** function you call from the UI thread must declare `'worklet'` as its first statement.

```tsx
// Good — standalone worklet with the directive
const clamp = (value: number, min: number, max: number) => {
  'worklet';
  return Math.min(Math.max(value, min), max);
}
```

```tsx
// Bad — no directive, called from a gesture callback → runtime error
const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
}
```

### What worklets can and can't capture

| Can capture / do | Cannot do |
| --- | --- |
| Shared values (read/write `.value`) | Call non-worklet JS functions directly |
| Primitives & plain objects (captured by copy) | Mutate captured JS variables and expect JS to see it |
| Other worklets | Use most third-party libs (they aren't worklets) |
| `Math`, global worklet-safe helpers | Access `window`/DOM, do network I/O |
| `runOnJS(fn)(args)` to reach JS | Heavy loops / business logic (drops frames) |

Captured JS values are **frozen copies** at workletization time. To mutate state React can see, go through `runOnJS`.

## `runOnJS` and `runOnUI`

- `runOnJS(fn)(...args)` — call a JS-thread function (`setState`, navigation, analytics, haptics) **from** a worklet.
- `runOnUI(fn)(...args)` — schedule a worklet to run on the UI thread **from** JS (rarely needed; hooks/gestures cover most cases).

```tsx
// Good — update React state safely from a gesture worklet
const pan = Gesture.Pan().onEnd((e) => {
  if (e.translationX > DISMISS_X) {
    runOnJS(onDismiss)();          // navigation lives on the JS thread
  } else {
    translateX.value = withSpring(0, SPRING);
  }
});
```

```tsx
// Bad — calling a JS setter directly inside a worklet
const pan = Gesture.Pan().onEnd((e) => {
  if (e.translationX > DISMISS_X) {
    onDismiss();                   // ❌ crashes: not a worklet, wrong thread
  }
});
```

Batch `runOnJS` calls — each one is a thread hop. Don't call it every frame; call it at thresholds (via `useAnimatedReaction`) or on gesture end.

## `cancelAnimation`

Stop an in-flight animation and leave the shared value where it is. Essential for infinite `withRepeat` loops and for taking over an animating value with a gesture.

```tsx
import { cancelAnimation } from 'react-native-reanimated';

// Stop an infinite spinner on unmount
useEffect(() => {
  rotation.value = withRepeat(withTiming(360, TIMING), -1, false);
  return () => cancelAnimation(rotation);
}, []);
```

```tsx
// Grab an animating value when a new gesture begins
const pan = Gesture.Pan().onBegin(() => {
  cancelAnimation(translateX);   // stop any spring-back mid-flight
});
```

## Setup checklist

- Wrap the app root in `GestureHandlerRootView` (from `react-native-gesture-handler`) — see [gestures](../hzblj-skills-reanimated-gestures/SKILL.md).
- The Reanimated Babel plugin must be **last** in `babel.config.js` (`react-native-reanimated/plugin`). In Expo SDK 50+ with the default preset it's included; verify if worklets throw.
- Import the animated primitives from `react-native-reanimated` (`Animated.View`, not the core RN `Animated`).

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
