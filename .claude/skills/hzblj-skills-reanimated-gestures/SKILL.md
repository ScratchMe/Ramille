---
name: hzblj-skills-reanimated-gestures
description: >-
  Reanimated + gesture-handler v2 — Gesture.Pan/Tap/Pinch, GestureDetector, driving shared values, withDecay, runOnJS, gesture composition, activeOffset/failOffset. Triggers on: gesture, pan, swipe, drag, GestureDetector, withDecay, pinch.
disable-model-invocation: true
---

# Gestures

Interactive, finger-driven motion comes from **react-native-gesture-handler v2** (the `Gesture` builder API) feeding shared values, with Reanimated painting the result on the UI thread. This is the one place where hand-rolled shared values beat layout animations — there is no built-in for "follow my finger".

## Setup

Wrap the app root once. Gestures silently do nothing without it.

```tsx
// App root
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export const App = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* … */}
    </GestureHandlerRootView>
  );
};

```

Use the **v2 API only**: build gestures with `Gesture.*`, attach with `GestureDetector`. Do not use the deprecated `<PanGestureHandler>` components or `useAnimatedGestureHandler`.

## The building blocks

| Gesture | Fires | Common use |
| --- | --- | --- |
| `Gesture.Pan()` | `onBegin`/`onUpdate`/`onEnd`/`onFinalize` | Drag, swipe, sheets, sliders |
| `Gesture.Tap()` | `onBegin`/`onEnd` (+ `numberOfTaps`) | Press feedback, double-tap |
| `Gesture.LongPress()` | `onStart`/`onEnd` (+ `minDuration`) | Context menus, drag handles |
| `Gesture.Pinch()` | `onUpdate` (`scale`, `focalX/Y`) | Zoom |
| `Gesture.Rotation()` | `onUpdate` (`rotation`) | Rotate |
| `Gesture.Fling()` | `onEnd` (+ `direction`) | Quick directional dismiss |

Gesture callbacks are **auto-workletized** — write `.value` directly inside them, no `'worklet'` directive needed. For JS-only work (state, navigation), use `runOnJS`.

## Driving shared values: the offset pattern

The universal drag recipe: keep a committed `offset` and add the live `translation` on top during the drag, then fold translation back into the offset on end. This lets successive drags accumulate instead of resetting.

```tsx
// Good — accumulating draggable
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { SPRING } from './constants';

const Draggable = () => {
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const pan = Gesture.Pan()
    .onBegin(() => {
      startX.value = offsetX.value;   // remember where we were
      startY.value = offsetY.value;
    })
    .onUpdate((e) => {
      offsetX.value = startX.value + e.translationX;
      offsetY.value = startY.value + e.translationY;
    })
    .onEnd(() => {
      // snap back to origin with a spring
      offsetX.value = withSpring(0, SPRING);
      offsetY.value = withSpring(0, SPRING);
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.value }, { translateY: offsetY.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.box, style]} />
    </GestureDetector>
  );
}
```

```tsx
// Bad — no saved offset: every new drag jumps back to 0
const pan = Gesture.Pan().onUpdate((e) => {
  offsetX.value = e.translationX; // ❌ ignores where the element already was
});
```

## `withDecay` for momentum + clamping

On release, `withDecay` continues motion with the finger's velocity and decelerates naturally — the native "flick and glide" feel. Pass `clamp` to stop at bounds and `rubberBandEffect` for an iOS-style overscroll.

```tsx
// Good — flick to scroll a horizontal track, clamped to bounds
const pan = Gesture.Pan()
  .onChange((e) => {
    offsetX.value += e.changeX;   // onChange gives per-frame delta
  })
  .onEnd((e) => {
    offsetX.value = withDecay({
      velocity: e.velocityX,
      clamp: [-MAX_SCROLL, 0],
      rubberBandEffect: true,
      deceleration: 0.998,
    });
  });
```

`velocity` comes straight off the gesture event (`velocityX`/`velocityY`, px/s). Always `clamp` decay for bounded content, or it flies off-screen.

## `runOnJS`: state, navigation, haptics from a gesture

The worklet callbacks can't call JS functions directly. Cross the bridge with `runOnJS` — at gesture end or at a threshold, never every frame.

```tsx
// Good — swipe-to-dismiss with JS navigation on commit
const pan = Gesture.Pan()
  .onUpdate((e) => { translateX.value = e.translationX; })
  .onEnd((e) => {
    if (Math.abs(e.translationX) > DISMISS_X || Math.abs(e.velocityX) > 800) {
      const dir = e.translationX > 0 ? 1 : -1;
      translateX.value = withTiming(dir * SCREEN_W, TIMING, (finished) => {
        if (finished) runOnJS(onDismiss)();   // navigation is JS-thread work
      });
    } else {
      translateX.value = withSpring(0, SPRING);
    }
  });
```

For per-frame side effects at a threshold (e.g. haptics as you cross a snap point), pair the gesture with a [`useAnimatedReaction`](../hzblj-skills-reanimated-core/SKILL.md) instead of calling `runOnJS` inside `onUpdate`.

## Tuning: `activeOffsetX` / `failOffset`

Inside a scroll view, a pan must not steal every touch. Tune activation so vertical scrolls pass through and only deliberate horizontal drags activate.

```tsx
// Good — horizontal swipe row that lives inside a vertical list
const pan = Gesture.Pan()
  .activeOffsetX([-10, 10])   // activate only after 10px horizontal movement
  .failOffsetY([-8, 8])       // fail (yield to the list) on vertical movement
  .onUpdate(/* … */);
```

| Config | Meaning |
| --- | --- |
| `activeOffsetX/Y([min, max])` | Distance the finger must travel on that axis before the gesture activates |
| `failOffsetX/Y([min, max])` | Movement on that axis that makes the gesture *fail* (hand off to a parent) |
| `minDistance(px)` | Minimum travel before a pan activates (axis-agnostic) |
| `minDuration(ms)` | (LongPress) hold time before firing |
| `numberOfTaps(n)` | (Tap) double/triple-tap |
| `maxDuration(ms)` | (Tap) max time from down to up to count as a tap |

## Composing gestures

Combine gestures instead of nesting detectors.

| Composer | Behavior |
| --- | --- |
| `Gesture.Simultaneous(a, b)` | Both can be active at once (pinch **and** pan a photo) |
| `Gesture.Race(a, b)` | First to activate wins, cancels the others (tap vs long-press) |
| `Gesture.Exclusive(a, b)` | Priority order — `a` gets first refusal, `b` only if `a` fails (double-tap over single-tap) |

```tsx
// Good — pinch to zoom while panning, plus double-tap to reset
const pinch = Gesture.Pinch().onUpdate((e) => { scale.value = savedScale.value * e.scale; });
const pan = Gesture.Pan().onUpdate((e) => { /* move */ });
const doubleTap = Gesture.Tap().numberOfTaps(2).onEnd(() => {
  scale.value = withSpring(1, SPRING);
});

const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

return (
  <GestureDetector gesture={composed}>
    <Animated.View style={[styles.photo, style]} />
  </GestureDetector>
);
```

## Complete example: swipeable list row

A production-shaped swipe-to-reveal-actions row: drag left to reveal a delete action, snap open or closed on release, flick past the threshold to delete.

```tsx
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS,
} from 'react-native-reanimated';
import { SPRING, TIMING } from './constants';

const ACTION_W = 80;      // revealed action width
const OPEN_X = -ACTION_W;  // resting position when open
const DELETE_X = -240;     // flick-past-here to delete

export const SwipeRow = ({ item, onDelete }: { item: Item; onDelete: (id: string) => void }) => {
  const translateX = useSharedValue(0);
  const start = useSharedValue(0);

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])   // let the vertical list scroll
    .failOffsetY([-8, 8])
    .onBegin(() => { start.value = translateX.value; })
    .onUpdate((e) => {
      // clamp so it can't drag right past closed
      translateX.value = Math.min(0, start.value + e.translationX);
    })
    .onEnd((e) => {
      if (translateX.value < DELETE_X || e.velocityX < -1200) {
        translateX.value = withTiming(-500, TIMING, (finished) => {
          if (finished) runOnJS(onDelete)(item.id);
        });
      } else if (translateX.value < OPEN_X / 2) {
        translateX.value = withSpring(OPEN_X, SPRING);   // snap open
      } else {
        translateX.value = withSpring(0, SPRING);        // snap closed
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.rowContainer}>
      <View style={styles.actionBg} />{/* delete background */}
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.row, rowStyle]}>
          <RowContent item={item} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
```

## Gotchas

| Mistake | Fix |
| --- | --- |
| Gestures do nothing | Wrap the root in `GestureHandlerRootView` |
| Using `<PanGestureHandler>` / `useAnimatedGestureHandler` | Use the v2 `Gesture.Pan()` + `GestureDetector` API |
| New drag jumps back to origin | Save `offset` in `onBegin`, add `translation` in `onUpdate` |
| Pan hijacks the parent scroll view | Set `activeOffsetX` + `failOffsetY` |
| Flick flies off-screen | `withDecay({ clamp: [...] })` |
| `setState`/navigation called directly in a callback | Wrap in `runOnJS(...)` |
| `runOnJS` fired every frame in `onUpdate` | Move it to `onEnd` or a `useAnimatedReaction` threshold |
| Nesting multiple `GestureDetector`s | Compose with `Simultaneous`/`Race`/`Exclusive` |
| Reading `e.velocity` in the wrong units | It's px/s — matches `withDecay`'s `velocity` directly |

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
