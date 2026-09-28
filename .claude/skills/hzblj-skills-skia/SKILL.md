---
name: hzblj-skills-skia
description: >-
  Opinionated rules for @shopify/react-native-skia in Expo + TypeScript — the declarative <Canvas> API (Circle/Rect/Path/Group/Paint/gradients/Blur), driving animation from Reanimated shared values with useDerivedValue and useClock, runtime SkSL shaders, on-canvas text/images, and the GPU-vs-CPU cost of every effect — so custom graphics render on the GPU without faking them with nested Views. Triggers on: Skia, Canvas, shader, SkSL, RuntimeEffect, Path, Paint, gradient, Blur, useClock, useImage, useFont, chart/graph, custom drawing, GPU effect, Picture.
disable-model-invocation: true
---

# Graphics & Advanced Rendering (Skia)

React Native Skia exposes Google's Skia 2D engine to React. It draws on the **GPU** through a declarative `<Canvas>` tree, and integrates directly with Reanimated so animated values drive the canvas on the UI thread. Use it for graphical work the standard view system cannot express cleanly.

The single most important rule: **Skia is for custom, GPU-heavy drawing — not for shapes a View can already render.** If `expo-linear-gradient`, `react-native-svg`, or a styled `View` with `borderRadius` does the job, use that. Reach for Skia only when you need shaders, charts/graphs, complex vector paths, image filters/blurs, or high-frame-rate custom drawing. Never simulate graphics by stacking nested Views.

## When to reach for Skia (and when not to)

| Reach for Skia | Use something else |
| --- | --- |
| Custom SkSL shaders / procedural effects | Solid fills, rounded corners → styled `View` |
| Charts, graphs, sparklines, gauges | A single linear/radial gradient → `expo-linear-gradient` |
| Complex or animated vector paths (morphing, drawing-on) | Static icons / simple vector shapes → `react-native-svg` |
| Image filters, blurs, color matrices, displacement | A blurred backdrop → `expo-blur` (`BlurView`) |
| GPU-heavy effects (glow, noise, gradient meshes, particles) | Shadows on a card → `shadow*` / `elevation` style props |
| High-frame-rate custom drawing (audio waveforms, canvases) | Layout-driven motion → Reanimated `transform`/`opacity` |

```tsx
// Bad — faking a ring/progress arc with nested Views and overflow tricks
<View style={styles.ringOuter}>
  <View style={styles.ringMask} />
  <View style={[styles.ringFill, { transform: [{ rotate }] }]} />
</View>

// Good — an actual arc path drawn on the GPU
<Canvas style={{ width: 120, height: 120 }}>
  <Path path={arcPath} style="stroke" strokeWidth={10} strokeCap="round" color="#3478f6" />
</Canvas>
```

```tsx
// Bad — a whole Skia canvas just to draw one gradient rectangle
<Canvas style={{ flex: 1 }}>
  <Rect x={0} y={0} width={width} height={height}>
    <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={['#3478f6', '#0a1a3f']} />
  </Rect>
</Canvas>

// Good — plain, cheap, no GPU canvas needed
import { LinearGradient } from 'expo-linear-gradient';
<LinearGradient colors={['#3478f6', '#0a1a3f']} style={{ flex: 1 }} />
```

## GPU vs CPU cost

Skia rendering happens on the GPU, but the *setup* around it runs on the CPU (usually the JS thread). Cheap-looking code can be expensive for the wrong reason. Budget both.

| Cost lives on the GPU | Cost lives on the CPU / JS thread |
| --- | --- |
| Blurs, shadows, `saveLayer`/layer effects | Building `Skia.Path`/`Skia.Paint` objects every render |
| Large fills, overdraw (stacked translucent layers) | Constructing/parsing path strings per frame |
| Runtime shaders with heavy per-pixel math | Decoding images synchronously, large bitmaps |
| Many blend/color-filter passes | Re-creating the `<Canvas>` subtree on each state change |

Rules of thumb:
- **Blur and shadow are the most expensive GPU effects.** Keep blur radii modest, and never animate a large blur every frame on a full-screen surface.
- **Overdraw kills fill rate.** Avoid stacking many semi-transparent layers; flatten where you can.
- **Do object creation once.** Memoize paths, paints, and fonts so the CPU isn't rebuilding them 60–120×/second.
- **Static content → render once.** Bake unchanging drawing into a `Picture` (see below) instead of re-issuing draw calls every frame.

## The declarative `<Canvas>` API

Compose drawing as JSX. Elements are drawn in document order (painter's model — later siblings paint on top).

```tsx
import {
  Canvas, Fill, Group, Circle, Rect, RoundedRect, Path,
  LinearGradient, RadialGradient, Blur, Shadow, Skia, vec,
} from '@shopify/react-native-skia';

export const Badge = () => {
  return (
    <Canvas style={{ width: 200, height: 200 }}>
      {/* Background fill spanning the whole canvas */}
      <Fill color="#0a1a3f" />

      {/* A rounded rect with a gradient paint (child = paint source) */}
      <RoundedRect x={20} y={20} width={160} height={160} r={24}>
        <LinearGradient
          start={vec(20, 20)}
          end={vec(180, 180)}
          colors={['#3478f6', '#8e5cff']}
        />
      </RoundedRect>

      {/* A circle with a soft blur applied via a child effect */}
      <Circle cx={100} cy={100} r={40} color="#ffffff">
        <Blur blur={6} />
      </Circle>

      {/* A stroked path */}
      <Path
        path="M60 100 L90 130 L140 70"
        style="stroke"
        strokeWidth={8}
        strokeCap="round"
        strokeJoin="round"
        color="#00e0a8"
      />
    </Canvas>
  );
}
```

Key points:
- **Paint is set by props or by children.** `color`, `style="stroke" | "fill"`, `strokeWidth`, `opacity` are props. Effects and shaders (`LinearGradient`, `Blur`, `Shadow`, `ColorMatrix`, `Shader`) are supplied as *children* and apply to the parent shape.
- **`Fill`** paints the entire canvas — use it for backgrounds and as the surface for a full-screen shader.
- **`Group`** batches children and applies a shared `transform`, `clip`, `opacity`, `blendMode`, or `layer`. Prefer one `Group` transform over transforming each child.
- **Gradients** take `start`/`end` (or `c`/`r` for radial) as `vec(x, y)` points in canvas space, plus a `colors` array and optional `positions`.

### `Group` transforms and clipping

```tsx
// Good — one transform on the Group moves/rotates the whole subtree
<Group transform={[{ translateX: 50 }, { rotate: Math.PI / 6 }]} origin={vec(100, 100)}>
  <Circle cx={100} cy={100} r={30} color="#3478f6" />
  <Rect x={80} y={80} width={40} height={40} color="#8e5cff" />
</Group>

// Bad — repeating the same transform math on every child
<Circle cx={150} cy={130} r={30} color="#3478f6" />
<Rect x={130} y={110} width={40} height={40} color="#8e5cff" />
```

## Animating Skia: drive from Reanimated

Skia's reconciler subscribes to Reanimated shared values directly. **Pass a shared value (or a `useDerivedValue`) straight into a Skia prop** — no `useAnimatedStyle`, no re-render. The value updates on the UI thread and the canvas repaints in place.

**Never drive Skia animation with `setState` per frame.** That re-renders the whole React tree on the JS thread and drops frames — exactly what Skia exists to avoid.

`useClock()` returns a Reanimated `SharedValue<number>` (elapsed milliseconds) that ticks every frame — the idiomatic driver for continuous motion.

```tsx
import { Canvas, Circle, useClock } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

// Good — value computed in a worklet, drives the prop on the UI thread
export const Pulse = () => {
  const clock = useClock();
  const r = useDerivedValue(() => 30 + Math.sin(clock.value / 300) * 12);
  return (
    <Canvas style={{ width: 120, height: 120 }}>
      <Circle cx={60} cy={60} r={r} color="#3478f6" />
    </Canvas>
  );
}
```

```tsx
// Good — interactive: a Reanimated spring drives cx, no re-render
const cx = useSharedValue(60);
const animatedCx = useDerivedValue(() => withSpring(cx.value, SPRING));
// ...
<Circle cx={animatedCx} cy={60} r={20} color="#3478f6" />
```

```tsx
// Bad — setState every frame re-renders the tree on the JS thread
const [radius, setRadius] = useState(30);
useEffect(() => {
  const id = setInterval(() => setRadius((r) => 30 + Math.sin(Date.now() / 300) * 12), 16);
  return () => clearInterval(id);
}, []);
<Circle cx={60} cy={60} r={radius} color="#3478f6" />
```

The same rules from the `reanimated` skill apply: read `.value` only inside worklets/derived values, keep worklets to math, and pass `reduceMotion` where relevant. Skia is the *rendering* target; Reanimated is the *value* source — that is the integration boundary.

## Runtime shaders (SkSL)

Compile a shader once with `Skia.RuntimeEffect.Make`, then attach it as a `<Shader>` child of a `Fill` (or any shape). Feed animated uniforms via a `useDerivedValue` so the GPU redraws each frame without a React re-render.

```tsx
import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import { useDerivedValue, useClock } from 'react-native-reanimated';

// Compile ONCE at module scope — never inside render.
const source = Skia.RuntimeEffect.Make(`
uniform float2 resolution;
uniform float time;

half4 main(float2 fragCoord) {
  float2 uv = fragCoord / resolution;
  float wave = 0.5 + 0.5 * sin(uv.x * 10.0 + time);
  return half4(uv.x, uv.y, wave, 1.0);
}`)!;

export const ShaderBackground = ({ width, height }: { width: number; height: number }) => {
  const clock = useClock();
  const uniforms = useDerivedValue(() => ({
    resolution: [width, height],
    time: clock.value / 1000,
  }));

  return (
    <Canvas style={{ width, height }}>
      <Fill>
        <Shader source={source} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}
```

Key points:
- SkSL entry point is `half4 main(float2 fragCoord)`; `fragCoord` is in pixels.
- Uniform names in JS must match the `uniform` declarations exactly, in the same order.
- `Skia.RuntimeEffect.Make` returns `null` on a compile error — the `!` assumes a known-good shader; guard it if the source is dynamic.
- Heavy per-pixel math is pure GPU cost — profile before shipping full-screen shaders on low-end Android.

## Text on canvas: `useFont`

On-canvas text needs a Skia font object. `useFont` loads a `.ttf` asynchronously and returns `null` until ready — always guard.

```tsx
import { Canvas, Text, useFont } from '@shopify/react-native-skia';

export const Label = () => {
  const font = useFont(require('../../assets/fonts/Inter-Medium.ttf'), 24);
  if (font === null) return null; // font is still loading

  return (
    <Canvas style={{ width: 200, height: 60 }}>
      <Text x={0} y={40} text="Skia" font={font} color="#111827" />
    </Canvas>
  );
}
```

- `Text`'s `y` is the **baseline**, not the top — offset by roughly the font size.
- For system fonts use `matchFont({ fontFamily, fontSize, fontWeight })`; load multiple weights with `useFonts`.
- Prefer normal RN `<Text>` for regular UI copy — only draw text on the canvas when it must sit inside the drawing (labels on a chart, text warped/clipped by an effect).

## Images: `useImage`

`useImage` decodes an image asynchronously (local `require` or remote URL) and returns `null` until loaded.

```tsx
import { Canvas, Image, useImage } from '@shopify/react-native-skia';

export const Avatar = () => {
  const image = useImage(require('../../assets/avatar.png'));
  if (image === null) return null;

  return (
    <Canvas style={{ width: 128, height: 128 }}>
      <Image image={image} x={0} y={0} width={128} height={128} fit="cover" />
    </Canvas>
  );
}
```

- Use the canvas image path when you need to *filter* the image (blur, color matrix, shader displacement, masking to a path). For a plain image, use `expo-image` instead.
- `fit` accepts `"cover" | "contain" | "fill" | "fitWidth" | "fitHeight" | "none" | "scaleDown"`.

## Performance: memoize and bake

```tsx
import { useMemo } from 'react';
import { Skia } from '@shopify/react-native-skia';

// Good — path built once, reused every frame
const path = useMemo(() => {
  const p = Skia.Path.Make();
  p.moveTo(0, 100);
  p.cubicTo(50, 0, 150, 200, 200, 100);
  return p;
}, []);

// Good — paint built once
const paint = useMemo(() => {
  const p = Skia.Paint();
  p.setColor(Skia.Color('#3478f6'));
  p.setAntiAlias(true);
  return p;
}, []);
```

```tsx
// Bad — new Path + Paint allocated on every render/frame (CPU churn + GC pressure)
const Chart = () => {
  const path = Skia.Path.Make();
  path.moveTo(0, 100);
  path.cubicTo(50, 0, 150, 200, 200, 100);
  const paint = Skia.Paint();
  paint.setColor(Skia.Color('#3478f6'));
  return <Canvas style={{ flex: 1 }}><Path path={path} paint={paint} /></Canvas>;
}
```

**Bake static drawing into a `Picture`.** A `Picture` records draw calls once and replays them cheaply — ideal for a grid, axes, legend, or any layer that doesn't change per frame.

```tsx
import { Canvas, Picture, createPicture, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';

const grid = useMemo(
  () =>
    createPicture((canvas) => {
      const paint = Skia.Paint();
      paint.setColor(Skia.Color('#e5e7eb'));
      for (let x = 0; x <= 300; x += 30) {
        canvas.drawLine(x, 0, x, 300, paint);
      }
    }),
  [],
);
// <Picture picture={grid} /> replays with no per-frame allocation
```

Checklist for hot canvases: memoize paths/paints/fonts, prefer one `Group` transform over per-child transforms, keep blur/shadow modest, avoid overdraw, and split static content into a `Picture`.

## Integration boundary with Reanimated

| Concern | Owner |
| --- | --- |
| Producing animated numbers (springs, timing, gesture, clock) | Reanimated (`useSharedValue`, `useDerivedValue`, `useClock`) |
| Consuming those numbers to paint pixels | Skia (props accept shared values directly) |
| Bridging to JS (state, navigation, analytics) | `runOnJS` from a worklet — never `setState` per frame |
| Layout-driven view motion (cards, sheets, list items) | Reanimated on Views — do **not** wrap in Skia |

Skia props take shared values natively, so you never need `useAnimatedStyle` or `useAnimatedProps` to feed the canvas — pass the value in and let Skia repaint.

## Common Mistakes

| Mistake | Fix |
| --- | --- |
| Faking rings/arcs/graphs with nested Views + overflow tricks | Draw the actual `Path` on a `<Canvas>` |
| Using a whole Skia canvas for one gradient or rounded rect | Use `expo-linear-gradient` / a styled `View` / `react-native-svg` |
| Driving animation with `setState`/`setInterval` per frame | Drive props with `useDerivedValue` + `useClock` / shared values |
| Re-creating `Skia.Path`/`Skia.Paint` on every render | Wrap them in `useMemo` |
| Building/parsing a path string inside render each frame | Build the path once; animate transforms or points instead |
| Compiling `RuntimeEffect.Make` inside the component body | Compile once at module scope |
| Not guarding `useFont`/`useImage` null while loading | `if (font === null) return null;` before rendering |
| Reading `shared.value` in the render body | Read it only inside worklets / `useDerivedValue` |
| Animating a large blur full-screen every frame | Keep blur radii small; bake static blur; profile on Android |
| Re-issuing static draw calls (grid, axes) each frame | Bake them into a `Picture` |
| Transforming each child individually | Apply one `transform` on a wrapping `Group` |
| Drawing normal UI text on the canvas | Use RN `<Text>`; reserve `Skia.Text` for in-drawing labels |

## Review Checklist

- [ ] Skia is used only for shaders, charts, complex paths, image filters, or GPU effects — not for shapes a View/SVG/gradient can render
- [ ] No graphics faked with nested Views
- [ ] Animation is driven by Reanimated shared values / `useDerivedValue` / `useClock`, never `setState` per frame
- [ ] `Skia.Path`, `Skia.Paint`, and shader sources are created once (memoized / module scope), not per render
- [ ] `RuntimeEffect.Make` result is guarded when the source can be invalid
- [ ] `useFont` / `useImage` `null` states are guarded before drawing
- [ ] Shared subtrees use a single `Group` transform instead of per-child transforms
- [ ] Static drawing (grids, axes, legends) is baked into a `Picture`
- [ ] Blur/shadow/overdraw are kept modest and profiled on low-end Android
- [ ] No `.value` reads in the render body; worklets stay math-only
- [ ] On-canvas text is reserved for in-drawing labels; regular copy uses RN `<Text>`
- [ ] GPU vs CPU cost was weighed for each effect before shipping

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
