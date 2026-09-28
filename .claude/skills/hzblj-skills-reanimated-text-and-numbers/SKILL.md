---
name: hzblj-skills-reanimated-text-and-numbers
description: >-
  Reanimated animated text and numbers — the useAnimatedProps + TextInput (ReText) pattern, animated counters, per-character staggered reveals, tabular figures, blur/opacity mount reveal. Triggers on: animate number, animated counter, ReText, animate text, typewriter, tabular nums.
disable-model-invocation: true
---

# Animating Text & Numbers

Reanimated **cannot animate text children on the UI thread**. `<Animated.Text>{value}</Animated.Text>` only re-renders when `value` changes on the JS thread — driving it from a shared value does nothing. To animate displayed text or a counting number at 60/120fps, you animate a **prop**, not a child, using `useAnimatedProps` on an animated `TextInput`. This is the classic `ReText` pattern.

## Why not `<Animated.Text>`?

```tsx
// Bad — text children are not animatable from a shared value
const count = useSharedValue(0);
const style = useAnimatedStyle(() => ({ /* can style, but... */ }));
return <Animated.Text style={style}>{count.value}</Animated.Text>; // ❌ reads .value in render; never updates on UI thread
```

`Text` has no prop that carries its content. `TextInput`, however, has a `text` prop — and props can be driven by `useAnimatedProps`.

## The pattern: animated `TextInput` (`ReText`)

Create an animated `TextInput`, make it non-editable, and feed it `text` via `useAnimatedProps`. All formatting happens inside the worklet on the UI thread.

```tsx
// Good — reusable ReText: displays a string shared value on the UI thread
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import { TextInput, type TextStyle, StyleSheet } from 'react-native';

Animated.addWhitelistedNativeProps({ text: true }); // allow driving `text`
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export const ReText = ({ text, style }: { text: SharedValue<string>; style?: TextStyle }) => {
  const animatedProps = useAnimatedProps(() => ({
    text: text.value,
    // Reanimated types `text` on defaultValue-less TextInput loosely:
    defaultValue: text.value,
  }));

  return (
    <AnimatedTextInput
      editable={false}
      underlineColorAndroid="transparent"
      style={[styles.text, style]}
      animatedProps={animatedProps as any}
    />
  );
}

const styles = StyleSheet.create({
  text: { padding: 0, color: '#111' },
});
```

## Animated counter

Drive a numeric shared value, format it in a `useDerivedValue` worklet (`Math.round`, separators), and hand the string to `ReText`. The number counts up entirely on the UI thread.

```tsx
// Good — counts up smoothly, formatting done in a worklet
import { useSharedValue, useDerivedValue, withTiming } from 'react-native-reanimated';
import { TIMING } from './constants';

const Counter = ({ value }: { value: number }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(value, { duration: 800 });
  }, [value]);

  const text = useDerivedValue(() => {
    'worklet';
    const rounded = Math.round(progress.value);
    // simple thousands separator, worklet-safe
    return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  });

  return <ReText text={text} style={styles.counter} />;
}

const styles = StyleSheet.create({
  counter: { fontSize: 40, fontVariant: ['tabular-nums'] }, // no width jitter
});
```

```tsx
// Bad — setState per frame to count: hops to JS thread every frame, drops frames
const [n, setN] = useState(0);
useEffect(() => {
  const id = setInterval(() => setN((p) => (p < value ? p + 1 : p)), 16); // ❌
  return () => clearInterval(id);
}, [value]);
```

## Tabular figures — kill width jitter

Proportional digits have different widths (`1` is narrow, `8` is wide), so a changing number visibly shifts layout. Always set `fontVariant: ['tabular-nums']` on any animated or frequently-updating number (counters, timers, prices, scores).

```tsx
// Good — every digit occupies the same width; the number doesn't dance
<Text style={{ fontVariant: ['tabular-nums'] }}>{price}</Text>
```

```tsx
// Bad — proportional digits: the container reflows as digits change
<Text>{price}</Text>
```

This mirrors the web `font-variant-numeric: tabular-nums` rule — apply it anywhere numbers update in place.

## Per-character staggered text reveal

For a title that reveals letter by letter, split into characters and stagger built-in `entering` layout animations by index — no shared values needed. See [layout-animations](../hzblj-skills-reanimated-layout-animations/SKILL.md).

```tsx
// Good — staggered character reveal with layout animations
import Animated, { FadeInDown } from 'react-native-reanimated';

const RevealText = ({ children }: { children: string }) => {
  return (
    <View style={styles.row}>
      {children.split('').map((char, i) => (
        <Animated.Text
          key={`${char}-${i}`}
          entering={FadeInDown.delay(i * 35).springify().damping(16)}
          style={styles.char}
        >
          {char === ' ' ? ' ' : char}
        </Animated.Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  char: { fontSize: 28, fontWeight: '700' },
});
```

Cap the total stagger for long strings (`Math.min(i, 12) * 35`) so the reveal doesn't drag.

## Blur / opacity mount reveal

For a softer entrance, combine opacity and a small blur that resolves as it settles. Wrap the text in an `Animated.View` and animate a `blurRadius` prop (Expo) or lean on `entering={FadeIn}` when you don't need blur.

```tsx
// Good — opacity + translate mount reveal (blur optional via expo-blur overlay)
import Animated, { FadeIn } from 'react-native-reanimated';

<Animated.Text entering={FadeIn.duration(300)} style={styles.title}>
  {title}
</Animated.Text>
```

If you need actual blur-in, animate the intensity of an `expo-blur` `AnimatedBlurView` overlay via `useAnimatedProps` (`intensity` from ~12 → 0), since RN `Text` has no animatable blur. Keep it subtle — blur is expensive; prefer opacity + slight `translateY` for most reveals.

## Gotchas

| Mistake | Fix |
| --- | --- |
| Trying to animate `<Animated.Text>` children from a shared value | Use `useAnimatedProps` + animated `TextInput` (ReText) |
| `text` prop not updating | `Animated.addWhitelistedNativeProps({ text: true })` |
| Reading `count.value` in the render body | Format inside a `useDerivedValue` worklet, pass the result to `ReText` |
| `setState` every frame to count | Animate a numeric shared value with `withTiming`, round in a worklet |
| Number width jitters as it counts | Add `fontVariant: ['tabular-nums']` |
| `TextInput` shows a caret / border | `editable={false}`, `underlineColorAndroid="transparent"`, `padding: 0` |
| Whole title fades in as one block | Split into characters and stagger `entering` by index |
| Blur reveal janks | Prefer opacity + `translateY`; use blur sparingly and animate its intensity via `useAnimatedProps` |
| Heavy formatting (Intl, locale libs) inside the worklet | Keep worklet formatting to worklet-safe string ops; do rich formatting on the JS thread |

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
