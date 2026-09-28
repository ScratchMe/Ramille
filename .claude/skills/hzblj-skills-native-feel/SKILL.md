---
name: hzblj-skills-native-feel
description: >-
  Opinionated rules for making an Expo + TypeScript app feel genuinely native on both platforms — a strict spacing/design-token system, Platform.OS/Platform.select branching, expo-haptics (impact/selection/notification) used with restraint, per-platform Pressable feedback, safe areas and edge-to-edge, keyboard handling, scroll feel, Dynamic Type and accessibility, dark mode, and reduced motion. Triggers on: Platform.select, expo-haptics, impactAsync, selectionAsync, notificationAsync, android_ripple, safe area insets, edge-to-edge, KeyboardAvoidingView, useColorScheme, dark mode, hitSlop, touch target, VoiceOver, TalkBack, reduced motion, spacing tokens.
disable-model-invocation: true
---

# UX & Pixel Precision

A native-feeling app is a compound of small correct decisions: consistent spacing, platform-appropriate interactions, and respect for the system settings the user has already chosen (text size, contrast, motion, theme). This skill is the opinionated house style for that work in an Expo + TypeScript app.

The single most important rule: **respect the platform and the user's system settings.** Do not force one platform's design language onto the other, and never override a choice the user made in iOS/Android settings (text size, reduced motion, dark mode).

## Spacing & Design Tokens

- Follow the spacing system strictly.
- No arbitrary spacing values.
- No random padding or margins.
- Align with design tokens.
- Visual alignment must be intentional.
- Interaction feedback must feel deliberate.
- Motion must support UX, not distract from it.

Use a fixed spacing scale (an 8pt grid with a 4pt half-step is the reliable default) and reference it by name — never type raw numbers into styles.

```tsx
// Good — tokens from a single source of truth
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

<View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }} />
```

```tsx
// Bad — arbitrary magic numbers scattered across components
<View style={{ paddingHorizontal: 17, marginTop: 13, gap: 7 }} />
```

## Platform-Native Feel

Respect iOS and Android platform conventions. The app must feel native on both. Use platform-specific patterns where they differ, and never assume behavior is identical — test on both.

| Concern | iOS | Android |
| --- | --- | --- |
| **Navigation** | Swipe-back gesture, bottom tabs | Material top tabs, hardware/predictive back |
| **Typography** | SF Pro (system) | Roboto (system) — use system fonts by default |
| **Haptics** | Rich Taptic Engine feedback | Subtler vibration motor |
| **Alerts & Sheets** | Action sheets and alerts | Material dialogs and bottom sheets |
| **Icons** | SF Symbols style (outline) | Material Icons style (filled) |
| **Scrolling** | Rubber-band bounce | Edge glow / overscroll |
| **Pressable** | Scale-down on press (~0.96) | Ripple effect (`android_ripple`) |

- Use `Platform.OS` or `Platform.select()` for platform-specific logic.
- Do not force one platform's design language onto the other.
- Test on both platforms — never assume behavior is identical.

## Platform branching in code

Branch with `Platform.OS` for control flow and `Platform.select()` for value maps. `Platform.select` accepts a `default`/`native` key and returns `undefined` for unmatched platforms, so it slots cleanly into styles.

```tsx
import { Platform } from 'react-native';

// Good — value map with a default
const shadow = Platform.select({
  ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  android: { elevation: 3 },
  default: {},
});

// Good — control flow for behavior that has no value form
if (Platform.OS === 'android') {
  // request a runtime permission, use hardware back, etc.
}

// Platform.Version is a number on Android (API level) and a string on iOS
const isAndroid13Plus = Platform.OS === 'android' && Number(Platform.Version) >= 33;
```

```tsx
// Bad — assuming iOS everywhere, shipping iOS shadows that do nothing on Android
<View style={{ shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8 }} />
```

Prefer `.ios.tsx` / `.android.tsx` file extensions when an entire component diverges, rather than a component riddled with `Platform.OS` branches.

## Haptics (`expo-haptics`)

Haptics are punctuation, not narration. A well-placed tap confirms an action; constant buzzing is noise that users disable. Fire haptics on **meaningful, discrete events** and stay silent during scrolling, typing, and passive UI updates.

```tsx
import * as Haptics from 'expo-haptics';
```

### The three families

| API | Values | Fire it when |
| --- | --- | --- |
| `Haptics.impactAsync(style)` | `ImpactFeedbackStyle.Light` / `.Medium` / `.Heavy` (also `.Soft` / `.Rigid`) | A discrete physical action lands — button confirm, drag snap, drawer open, item drop |
| `Haptics.selectionAsync()` | (none) | A value changes in a picker, segmented control, toggle, slider tick, or stepper |
| `Haptics.notificationAsync(type)` | `NotificationFeedbackType.Success` / `.Warning` / `.Error` | An async outcome resolves — save succeeded, validation failed, payment declined |

```tsx
// Good — light impact on a primary action, matched to weight
const onConfirm = async () => {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  submit();
}

// Good — selection feedback as a segmented control changes value
const onSegmentChange = (next: string) => {
  Haptics.selectionAsync();
  setValue(next);
}

// Good — notification feedback tied to an async result
try {
  await save();
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
} catch {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}
```

```tsx
// Bad — heavy impact on every render / every scroll frame
onScroll={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)} // buzzes constantly

// Bad — wrong family: impact where the event is a selection change
onValueChange={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)}
// use Haptics.selectionAsync() for pickers/toggles/segments
```

Rules:
- **Match weight to importance:** `Light` for routine taps, `Medium` for notable actions, `Heavy` sparingly for big/destructive moments.
- **Use `selectionAsync` for value scrubbing** — it is quieter and designed for repeated ticks.
- **Never fire per-frame** (scroll, pan move, animation ticks).
- **Fire-and-forget is fine** — these return a promise, but you rarely need to await unless ordering matters.
- Android feels these less crisply and needs the vibrate permission (Expo's config plugin handles it). Do not rely on haptics as the *only* feedback.

## Pressable feedback per platform

iOS communicates touch with a subtle scale-down; Android uses a material ripple. Give each platform its own idiom.

```tsx
import { Platform, Pressable } from 'react-native';

// Good — ripple on Android, scale-down on iOS
const TapButton = ({ onPress, children }: { onPress: () => void; children: React.ReactNode }) => {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: 'rgba(0,0,0,0.12)', borderless: false }}
      style={({ pressed }) =>
        Platform.OS === 'ios' && pressed ? { transform: [{ scale: 0.96 }] } : undefined
      }
      hitSlop={8}
    >
      {children}
    </Pressable>
  );
}
```

```tsx
// Bad — same opacity flash on both, ignoring platform idioms
<TouchableOpacity activeOpacity={0.5} onPress={onPress}>{children}</TouchableOpacity>
```

- Use exactly `scale: 0.96` for the iOS press — anything below `0.95` looks exaggerated. For a smooth, interruptible spring, drive the scale with Reanimated (see the `reanimated`/`skia` skills) rather than a hard toggle.
- On Android set `android_ripple` (with `borderless: true` for icon-only buttons); do not stack a scale animation on top of the ripple.

## Safe areas & edge-to-edge

Never hardcode status-bar or notch offsets. Read live insets from `react-native-safe-area-context`. Modern Expo (SDK 52+) renders Android **edge-to-edge** by default, so content draws under the system bars and you must pad with insets yourself.

```tsx
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

// Wrap the app root once
<SafeAreaProvider>{/* ...navigation... */}</SafeAreaProvider>;

// Good — pad only the edges that need it, using live insets
const Screen = ({ children }: { children: React.ReactNode }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top, paddingBottom: insets.bottom, flex: 1 }}>
      {children}
    </View>
  );
}
```

```tsx
// Bad — hardcoded offsets that break on notches, Dynamic Island, and gesture nav
<View style={{ paddingTop: 44, paddingBottom: 34 }} />
```

- Prefer `useSafeAreaInsets()` over `<SafeAreaView>` when you need per-edge control (e.g. a full-bleed image up top but a padded footer).
- For scroll views, apply the bottom inset to `contentContainerStyle` (not the outer view) so content can scroll under the home indicator while still ending above it.

## Keyboard handling

Wrap forms in `KeyboardAvoidingView` and set `behavior` per platform — `padding` on iOS, `height` (or none, if `android:windowSoftInputMode=adjustResize` is set) on Android.

```tsx
import { KeyboardAvoidingView, Platform } from 'react-native';

// Good — correct behavior per platform, offset for a nav header
<KeyboardAvoidingView
  behavior={Platform.select({ ios: 'padding', android: 'height' })}
  keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
  style={{ flex: 1 }}
>
  {/* form fields */}
</KeyboardAvoidingView>
```

```tsx
// Bad — behavior="padding" on Android often double-pads and jumps
<KeyboardAvoidingView behavior="padding">{form}</KeyboardAvoidingView>
```

- Set `keyboardVerticalOffset` to the header height so inputs aren't hidden behind a nav bar.
- On iOS, `automaticallyAdjustKeyboardInsets` on a `ScrollView` can replace `KeyboardAvoidingView` for simple lists.
- For complex forms, `react-native-keyboard-controller` gives smoother, synced motion — but the built-in view is correct for most screens.

## Scroll feel

Keep each platform's native scroll physics. Do not disable bounce on iOS or overscroll glow on Android to make them "match" — that removes the native feel.

```tsx
// Good — iOS bounce + large-title inset behavior; Android glow preserved
<ScrollView
  bounces // iOS rubber-band (default true — keep it)
  contentInsetAdjustmentBehavior="automatic" // iOS: cooperate with large titles/safe area
  overScrollMode="always" // Android edge glow (default — keep it)
  showsVerticalScrollIndicator
>
  {content}
</ScrollView>
```

```tsx
// Bad — killing native physics on both platforms
<ScrollView bounces={false} overScrollMode="never" />
```

- `contentInsetAdjustmentBehavior="automatic"` lets iOS auto-inset content under navigation/large titles and the safe area.
- Only disable bounce for a fixed, non-scrolling surface (e.g. a paged carousel) — never for regular content.

## Dynamic Type, font scaling & accessibility

Respect the user's system text size. React Native's `<Text>` scales with it by default (`allowFontScaling` is `true`) — keep it on, and cap only where layout genuinely breaks.

```tsx
// Good — text scales with the user's setting; cap prevents layout breakage on extreme sizes
<Text maxFontSizeMultiplier={1.6}>Balance</Text>
```

```tsx
// Bad — disabling font scaling app-wide fights accessibility settings
<Text allowFontScaling={false}>Balance</Text>
```

Screen readers (VoiceOver on iOS, TalkBack on Android) rely on accessibility metadata:

```tsx
// Good — labeled, correct role, state exposed, comfortable touch target
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Add to favorites"
  accessibilityState={{ selected: isFavorite }}
  hitSlop={12}
  style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
  onPress={toggle}
>
  <HeartIcon filled={isFavorite} />
</Pressable>
```

- **Minimum touch target 44×44 pt** (iOS HIG; Material recommends 48×48 dp). If the visible glyph is smaller, expand the hit area with `hitSlop` or `minWidth`/`minHeight`.
- Always set `accessibilityRole` and a human `accessibilityLabel` on custom controls; expose `accessibilityState` for toggles/selection.
- Group decorative-plus-label pairs so the reader announces them once (`accessible` on the wrapper, or `importantForAccessibility="no"` on the decoration).

## Dark mode

Read the system theme with `useColorScheme` and resolve colors from tokens — never hardcode light-only hex values. Declare `userInterfaceStyle: "automatic"` in the app config so the OS drives it.

```tsx
import { useColorScheme } from 'react-native';

// Good — theme-aware colors from tokens
const colors = {
  light: { bg: '#ffffff', text: '#111827' },
  dark: { bg: '#0b0f19', text: '#f9fafb' },
} as const;

const Card = ({ children }: { children: React.ReactNode }) => {
  const scheme = useColorScheme() ?? 'light'; // null before it resolves
  const c = colors[scheme];
  return <View style={{ backgroundColor: c.bg }}><Text style={{ color: c.text }}>{children}</Text></View>;
}
```

```tsx
// Bad — hardcoded light colors that turn into black-on-black in dark mode
<View style={{ backgroundColor: '#fff' }}><Text style={{ color: '#111' }}>{children}</Text></View>
```

## Reduced motion

Some users enable "Reduce Motion." Check it and swap large motion (slides, parallax, zoom) for a plain fade or no animation. Also update on the fly via the change event.

```tsx
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// Good — respond to the setting and keep it in sync
const useReduceMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

const reduced = useReduceMotion();
const entering = reduced ? FadeIn : SlideInRight; // subtle vs. full motion
```

If the app uses Reanimated, `useReducedMotion()` and `reduceMotion: ReduceMotion.System` in animation configs handle this at the animation layer (see the `reanimated` skill). Either way, do not ignore the setting.

## Common Mistakes

| Mistake | Fix |
| --- | --- |
| Arbitrary padding/margins (`17`, `13`, `7`) | Reference a fixed spacing scale (8pt grid) |
| iOS-only shadows shipped to Android (no effect) | `Platform.select({ ios: shadow, android: { elevation } })` |
| Same touch feedback on both platforms | iOS scale-down `0.96`, Android `android_ripple` |
| Haptics on scroll / per frame | Fire only on discrete, meaningful events |
| `impactAsync` for a picker/toggle change | Use `Haptics.selectionAsync()` |
| Ignoring async outcomes | `notificationAsync(Success/Warning/Error)` on resolve |
| Hardcoded status-bar / notch offsets | `useSafeAreaInsets()` from safe-area-context |
| Content clipped under bars on Android | Pad with insets — edge-to-edge is on by default |
| `behavior="padding"` on Android KeyboardAvoidingView | Use `Platform.select({ ios: 'padding', android: 'height' })` |
| Disabling bounce/overscroll to "match" platforms | Keep native scroll physics on each |
| `allowFontScaling={false}` app-wide | Keep scaling; cap with `maxFontSizeMultiplier` only where needed |
| Tiny tap targets under 44×44 | Add `hitSlop` / `minWidth`/`minHeight` to 44+ |
| Custom controls with no a11y metadata | Set `accessibilityRole` + `accessibilityLabel` + `accessibilityState` |
| Hardcoded light-only colors | Resolve tokens via `useColorScheme()` |
| Large motion regardless of settings | Branch on reduced-motion; fall back to fade/none |

## Review Checklist

- [ ] All spacing comes from the token scale — no arbitrary numbers
- [ ] Platform differences use `Platform.OS` / `Platform.select()` (or `.ios/.android` files)
- [ ] Shadows/elevation are set per platform
- [ ] Haptics fire only on discrete, meaningful events — never per frame/scroll
- [ ] Correct haptic family: `impact` for actions, `selection` for value changes, `notification` for outcomes
- [ ] Press feedback is per platform (iOS scale `0.96`, Android `android_ripple`)
- [ ] Safe-area insets come from `useSafeAreaInsets()`; no hardcoded offsets
- [ ] Edge-to-edge content is padded with insets on Android
- [ ] Forms use `KeyboardAvoidingView` with per-platform `behavior` and a header offset
- [ ] Native scroll physics (bounce/overscroll) are preserved; `contentInsetAdjustmentBehavior` set on iOS
- [ ] Text scales with Dynamic Type; `maxFontSizeMultiplier` caps only where layout breaks
- [ ] Custom controls expose `accessibilityRole`/`Label`/`State`; touch targets ≥ 44×44 with `hitSlop`
- [ ] Colors are theme-aware via `useColorScheme`; no hardcoded light-only values
- [ ] Reduced motion is respected (`AccessibilityInfo.isReduceMotionEnabled` / `useReducedMotion`)

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
