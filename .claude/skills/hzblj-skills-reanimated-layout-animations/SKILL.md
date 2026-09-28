---
name: hzblj-skills-reanimated-layout-animations
description: >-
  Reanimated layout animations — entering/exiting presets, custom builders, LinearTransition/CurvedTransition, Keyframe, LayoutAnimationConfig, itemLayoutAnimation. The first choice for enter/exit. Triggers on: entering, exiting, FadeIn, layout animation, LinearTransition, list item animation.
disable-model-invocation: true
---

# Layout Animations

**This is your first choice for enter/exit and reflow.** Before you reach for `useSharedValue` + `useEffect` + `useAnimatedStyle`, ask: can a built-in layout animation do it? Almost always, yes. One prop replaces a whole hook block, runs on the UI thread automatically, and reads clearly.

```tsx
// Bad — hand-rolling a fade-in that a built-in already does
const Toast = ({ children }) => {
  const opacity = useSharedValue(0);
  useEffect(() => { opacity.value = withTiming(1, TIMING); }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={style}>{children}</Animated.View>;
}
```

```tsx
// Good — one prop, same result, less to break
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

const Toast = ({ children }) => {
  return (
    <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(150)}>
      {children}
    </Animated.View>
  );
}
```

`entering` runs when the component mounts; `exiting` runs when it unmounts (Reanimated keeps it in the tree until the exit finishes — you do **not** need `AnimatePresence`-style wrappers).

## The preset families

Every preset comes in directional variants and is chainable with modifiers.

| Family | Presets | Use for |
| --- | --- | --- |
| Fade | `FadeIn`, `FadeInDown/Up/Left/Right`, `FadeOut…` | Default enter/exit; content, toasts, list items |
| Slide | `SlideInRight/Left/Up/Down`, `SlideOut…` | Panels, drawers, screen-like transitions |
| Zoom | `ZoomIn`, `ZoomInRotate`, `ZoomOut…` | Emphasis, badges, media |
| Bounce | `BounceIn`, `BounceInDown…`, `BounceOut…` | Playful accents (use sparingly) |
| Flip | `FlipInXUp`, `FlipInYRight…` | Cards, tiles |
| Stretch | `StretchInX/Y`, `StretchOut…` | Bars, expanding chrome |
| Rotate | `RotateInDownLeft…`, `RotateOut…` | Decorative accents |
| Lightspeed | `LightSpeedInRight`, `LightSpeedOut…` | Rare, high-energy accents |

**Default recommendation:** `FadeInDown` for enters and `FadeOut` for exits. Keep exits shorter and quieter than enters (see the constants in [timing](../hzblj-skills-reanimated-timing/SKILL.md)).

## Modifiers (chainable)

```tsx
import { FadeInDown, Easing } from 'react-native-reanimated';

// duration-based
FadeInDown.duration(250).delay(50).easing(Easing.out(Easing.cubic));

// spring-based — natural, bouncy enter
FadeInDown.springify().damping(18).stiffness(180).mass(1);

// combine with a starting offset (px)
FadeInDown.springify().damping(16);
```

| Modifier | Effect |
| --- | --- |
| `.duration(ms)` | Duration-based timing |
| `.delay(ms)` | Delay before starting — the basis for staggering |
| `.easing(fn)` | Easing for duration-based presets |
| `.springify()` | Switch to spring physics; then `.damping()/.stiffness()/.mass()` |
| `.damping()/.stiffness()/.mass()` | Tune the spring (only after `.springify()`) |
| `.reduceMotion(ReduceMotion.System)` | Respect the OS reduced-motion setting |
| `.withCallback(cb)` | Run a callback when the animation finishes (worklet; use `runOnJS` for JS) |

### Staggering a list

Stagger with `.delay()` derived from the item index — the layout-animation analog of the split-and-stagger enter pattern.

```tsx
// Good — staggered entrance driven by index
{items.map((item, i) => (
  <Animated.View
    key={item.id}
    entering={FadeInDown.delay(i * 50).springify().damping(18)}
  >
    <Row item={item} />
  </Animated.View>
))}
```

Cap the stagger so long lists don't feel slow — clamp with `Math.min(i, 8) * 50`.

## `layout` transitions (reflow)

When items are added, removed, or reordered, the surviving items should glide to their new positions instead of snapping. Add a `layout` prop.

```tsx
import Animated, { LinearTransition, CurvedTransition } from 'react-native-reanimated';

// Good — remaining items animate to their new slots
<Animated.View layout={LinearTransition.springify().damping(20)}>
  <Row item={item} />
</Animated.View>
```

| Transition | Feel |
| --- | --- |
| `LinearTransition` | Straightforward move/resize; the safe default |
| `CurvedTransition` | Separate easing for X vs Y — more organic on grids |
| `FadingTransition` | Cross-fades between old and new layout |
| `SequencedTransition` | Animates position then size in sequence |
| `JumpingTransition` | Playful hop |

Pair `entering` + `exiting` + `layout` on the same item so add/remove and reflow all animate together.

## Custom entering / exiting builders

When no preset fits, build one. The builder returns `initialValues` (frame 0) and `animations` (targets), plus optional `callback`. It's a worklet.

```tsx
// Good — custom entering: rise + fade + slight scale
import { withTiming, withSpring } from 'react-native-reanimated';
import type { EntryAnimationsValues } from 'react-native-reanimated';

const enterUpScale = (values: EntryAnimationsValues) => {
  'worklet';
  return {
    initialValues: {
      opacity: 0,
      transform: [{ translateY: 24 }, { scale: 0.96 }],
    },
    animations: {
      opacity: withTiming(1, { duration: 250 }),
      transform: [
        { translateY: withSpring(0, { damping: 18, stiffness: 180 }) },
        { scale: withSpring(1, { damping: 18, stiffness: 180 }) },
      ],
    },
  };
};

<Animated.View entering={enterUpScale}>{children}</Animated.View>;
```

## `Keyframe`

For multi-step, precisely-timed sequences (percent-based, like CSS `@keyframes`), use `Keyframe`.

```tsx
import { Keyframe, Easing } from 'react-native-reanimated';

const attention = new Keyframe({
  0:   { transform: [{ scale: 1 }], opacity: 0 },
  60:  { transform: [{ scale: 1.05 }], opacity: 1, easing: Easing.out(Easing.cubic) },
  100: { transform: [{ scale: 1 }] },
}).duration(400);

<Animated.View entering={attention}>{children}</Animated.View>;
```

## `LayoutAnimationConfig` — skip first-render animations

By default, children mounting for the first time animate their `entering`. On initial screen load that reads as everything flying in at once. Wrap a subtree in `LayoutAnimationConfig` with `skipEntering` to suppress the very first pass, so items animate only on subsequent changes.

```tsx
// Good — don't animate the initial list, only later insertions
import Animated, { LayoutAnimationConfig, FadeInDown } from 'react-native-reanimated';

<LayoutAnimationConfig skipEntering>
  {items.map((item) => (
    <Animated.View key={item.id} entering={FadeInDown.springify()}>
      <Row item={item} />
    </Animated.View>
  ))}
</LayoutAnimationConfig>
```

This is the Reanimated equivalent of `initial={false}` on Motion's `AnimatePresence`.

## Lists: `itemLayoutAnimation`

`Animated.FlatList` accepts `itemLayoutAnimation` to animate reordering of the underlying cells without wrapping each row yourself.

```tsx
// Good — cells glide when data reorders
import Animated, { LinearTransition } from 'react-native-reanimated';

<Animated.FlatList
  data={data}
  keyExtractor={(i) => i.id}
  itemLayoutAnimation={LinearTransition.springify().damping(20)}
  renderItem={renderItem}
/>
```

If you use `FlashList`, wrap each item's content in an `Animated.View` with a `layout` prop instead — `itemLayoutAnimation` is a `FlatList` API. See the repo's lists skill for `FlashList` performance rules; keep `renderItem` stable and extract the row component.

## Reduced motion

Layout animations honor the OS setting when you pass `.reduceMotion(ReduceMotion.System)`. With reduced motion on, the element appears/disappears without the motion but still respects opacity, so nothing pops in jarringly.

```tsx
import { FadeInDown, ReduceMotion } from 'react-native-reanimated';

<Animated.View entering={FadeInDown.springify().reduceMotion(ReduceMotion.System)}>
  {children}
</Animated.View>
```

## Gotchas

| Mistake | Fix |
| --- | --- |
| Hand-rolling a fade/slide that a preset already covers | Use `entering`/`exiting` presets |
| Everything animates in on first screen load | Wrap in `LayoutAnimationConfig skipEntering` |
| Items snap to new positions on add/remove | Add a `layout={LinearTransition…}` prop |
| Exit never plays (element just vanishes) | Ensure the component actually unmounts and carries `exiting` (don't set `display:none`) |
| `entering` on a non-`Animated` component | Use `Animated.View`/`Animated.Text`/`Animated.FlatList` |
| `.damping()` before `.springify()` | Call `.springify()` first, then spring modifiers |
| Long list stagger feels sluggish | Clamp the delay: `Math.min(i, 8) * 50` |
| Ignoring reduced motion | Chain `.reduceMotion(ReduceMotion.System)` |

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
