---
name: hzblj-skills-compound-components
description: >-
  Build flexible components as a compound/composer set — namespaced parts (Tabs.Item, WizardCard.Provider) that share one context, exposed via Object.assign or an object literal. Covers the context + guard-hook pattern, memoizing the context value, the controlled/uncontrolled hybrid, exposing the raw Provider so the state source can be lifted all the way up to a global hook, and the state / actions / meta context convention where meta holds refs and non-reactive handles. Use when a component has several parts that share state or the consumer needs to arrange those parts freely. Triggers on: compound component, composer component, Object.assign component, namespaced component, dot-notation component, sub-components, Tabs.Item, expose Provider, lift state up, state actions meta, refs in meta, shared context, controlled uncontrolled, useContext guard.
disable-model-invocation: true
---

# Compound Components

A **compound component** is one public component made of several parts that share
state implicitly. Instead of a monolith driven by a fat config prop, you expose a
set of parts — `Tabs.Item`, `Sidebar.Group`, `WizardCard.Provider` — and let the
consumer arrange them. The parts talk to each other through React context, so the
consumer never wires the shared state by hand. At scale this is the **composer**
pattern: a `Provider` part holds the shared surface and a dozen presentational parts
read from it.

Reach for this when a component has **multiple parts that coordinate** (a tab strip
and its tabs, a card and its image/title/price) *or* when consumers need to
**interleave their own markup** between the parts. It's the antidote to the
`items={[…]}` + `renderItem` config monolith, which forces every new layout need
into a new prop.

Pairs with [component-architecture](../hzblj-skills-component-architecture/SKILL.md) (each part is
a small, single-responsibility component), [type-safety](../hzblj-skills-type-safety/SKILL.md)
(the context value and props are precise types), and
[performance](../hzblj-skills-performance/SKILL.md) (the context value is memoized).

## Why a composer, not a wall of props

A single component has to anticipate every layout its callers will ever want, and
the only lever it has is **props**. So props multiply: `showBadge`, then
`badgePosition`, then `variant`, then `renderFooter`, then `headerSlot`. Each new
design tweak adds prop #13, #14, #15 — none of which tell you anything about what
actually renders. The call site becomes a pile of flags you have to *decode* against
the type signature to picture the result.

```tsx
// Bad — a config monolith. Layout is encoded as flags and render-props; the call
// site reveals nothing about the structure, and every variation needs a new prop.
type WizardCardProps = {
  house: House
  name: string
  portraitUrl: string
  showBadge?: boolean
  badgePosition?: 'top-left' | 'top-right' | 'bottom'
  variant?: 'compact' | 'full' | 'grid'
  headerSlot?: ReactNode
  renderFooter?: (wizard: Wizard) => ReactNode
  isRevealed?: boolean
  onReveal?: () => void
  // …and the next design change brings props #12, #13, #14
}

<WizardCard
  name={wizard.name}
  house={wizard.house}
  portraitUrl={wizard.portraitUrl}
  showBadge
  badgePosition="top-right"
  variant="full"
  renderFooter={(w) => <EnrollButton wizard={w} />}
/>
```

```tsx
// Good — you build the JSX. The structure is right there in the tree, a new
// arrangement is a rearrangement of children (no new prop), and your own markup
// drops in between the parts. Shared state still flows through context.
<WizardCard.Provider state={{ wizard }}>
  <WizardCard.Frame>
    <WizardCard.Portrait />
    <WizardCard.HouseBadge className="absolute right-2 top-2" />
    <WizardCard.Name />
    <EnrollButton wizard={wizard} />{/* inline — no renderFooter prop */}
  </WizardCard.Frame>
</WizardCard.Provider>
```

- **Props describe data; JSX describes structure.** A composer keeps layout in the
  JSX where you can *see* it, instead of hiding it in `showBadge` + `badgePosition`
  flags the caller decodes from the type signature.
- **No render-prop smuggling.** `renderFooter={() => …}` is JSX pushed through the
  prop system — `children` already do that, better. Drop real markup between parts.
- **Additive, not combinatorial.** A new arrangement moves the parts around; the
  component grows no prop and existing callers don't break.
- **The call site reads like the result.** `<Card.Portrait/><Card.Name/>` mirrors
  the rendered tree; a 15-prop tag does not.
- **You still don't prop-drill.** The shared state rides the context, so you get
  readable JSX *and* connected parts — the composition costs you nothing in wiring.

The parts stay small and single-purpose ([component-architecture](../hzblj-skills-component-architecture/SKILL.md)),
and their props are narrow, meaningful `type`s — never a bag of booleans
([type-safety](../hzblj-skills-type-safety/SKILL.md)).

## Anatomy

```tsx
// A compound is consumed like this — parts arranged freely by the caller,
// sharing selection state without a single prop passed between them.
<Tabs defaultValue="gryffindor">
  <Tabs.Item value="gryffindor">Gryffindor</Tabs.Item>
  <Tabs.Item value="slytherin">Slytherin</Tabs.Item>
  <Tabs.Item value="ravenclaw">Ravenclaw</Tabs.Item>
  <Tabs.Item value="hufflepuff">Hufflepuff</Tabs.Item>
</Tabs>
```

Three moving pieces make that work:

1. **A context + a guard hook** — the private channel the parts share.
2. **A stateful part** (`Root` / `Provider`) — owns the state, provides the context.
3. **The sub-parts** — read the context, render themselves, report events up.

`Object.assign(Root, { Item })` (or a plain object literal) staples the parts onto
one namespaced export.

## The minimal shape: context + guard hook

The context carries the shared value. The hook that reads it **throws** when a part
is rendered outside its provider — so a misplaced `<Tabs.Item>` fails loudly at
render, not silently with `undefined`.

```ts
// tabs-context.ts
import { createContext, useContext } from 'react'

type TabsSize = 'sm' | 'md'

type TabsContextValue = {
  onValueChange: (value: string) => void
  size: TabsSize
  value: string
}

const TabsContext = createContext<TabsContextValue | null>(null)

const useTabs = (): TabsContextValue => {
  const context = useContext(TabsContext)

  if (context === null) {
    throw new Error('<Tabs.Item> must be rendered inside <Tabs>')
  }

  return context
}

export { TabsContext, useTabs, type TabsContextValue, type TabsSize }
```

The `| null` default plus the throw is what makes the guard work: there's no valid
"no provider" value to accidentally read.

## The Root — owns state, provides context, memoizes the value

The stateful part provides the context — and the context value goes through
`useMemo`, so consumers don't re-render every time the parent re-renders for an
unrelated reason (see [performance](../hzblj-skills-performance/SKILL.md)).

```tsx
// tabs-root.tsx
import { useCallback, useMemo, useState, type FC, type ReactNode } from 'react'
import { cn } from '~/utils'
import { TabsContext, type TabsContextValue, type TabsSize } from './tabs-context'

type TabsRootProps = {
  children: ReactNode
  className?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  size?: TabsSize
  value?: string
}

const TabsRoot: FC<TabsRootProps> = ({
  children,
  className,
  defaultValue = '',
  onValueChange,
  size = 'md',
  value: controlledValue,
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : internalValue

  const handleValueChange = useCallback(
    (next: string) => {
      if (!isControlled) {
        setInternalValue(next)
      }

      onValueChange?.(next)
    },
    [isControlled, onValueChange],
  )

  const context = useMemo<TabsContextValue>(
    () => ({ onValueChange: handleValueChange, size, value }),
    [handleValueChange, size, value],
  )

  return (
    <TabsContext.Provider value={context}>
      <div className={cn('inline-flex gap-1 rounded-xl bg-stone-100 p-1', className)}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export { TabsRoot }
```

A sub-part reads context and renders itself:

```tsx
// tabs-item.tsx
import { useCallback, type FC, type ReactNode } from 'react'
import { cn } from '~/utils'
import { useTabs } from './tabs-context'

type TabsItemProps = {
  children: ReactNode
  value: string
}

const TabsItem: FC<TabsItemProps> = ({ children, value: itemValue }) => {
  const { onValueChange, size, value } = useTabs()
  const isSelected = value === itemValue

  const handleClick = useCallback(() => {
    onValueChange(itemValue)
  }, [itemValue, onValueChange])

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'rounded-lg px-3 font-medium transition-colors',
        size === 'sm' ? 'h-8 text-sm' : 'h-10 text-base',
        isSelected ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500',
      )}
    >
      {children}
    </button>
  )
}

export { TabsItem }
```

Stitch the parts into one namespaced export. Export **only the compound** — the
individual parts stay internal, so `Tabs.Item` is the one and only way to reach it.

```ts
// index.ts
import { TabsRoot } from './tabs-root'
import { TabsItem } from './tabs-item'

export const Tabs = Object.assign(TabsRoot, { Item: TabsItem })
```

## Controlled or uncontrolled — lift state up only when you need to

The `Root` above supports both, via the `value ?? internalValue` hybrid: pass
nothing and it manages its own selection (uncontrolled); pass `value` +
`onValueChange` and the parent owns it (controlled). **Default to uncontrolled** and
lift the state up to the parent *only* when a sibling outside the compound needs it.

```tsx
// Controlled — a sibling (<HouseCrest>) must render the same house, so the state
// is lifted to the shared parent. This is the moment to lift: two things need it.
const HOUSES = ['gryffindor', 'slytherin', 'ravenclaw', 'hufflepuff'] as const
type House = (typeof HOUSES)[number]

const isHouse = (value: string): value is House =>
  (HOUSES as readonly string[]).includes(value)

export const HousePicker: FC = () => {
  const [house, setHouse] = useState<House>('gryffindor')

  const handleValueChange = useCallback((value: string) => {
    if (isHouse(value)) {
      setHouse(value)
    }
  }, [])

  return (
    <div className="space-y-4">
      <Tabs value={house} onValueChange={handleValueChange}>
        {HOUSES.map((name) => (
          <Tabs.Item key={name} value={name}>
            {name}
          </Tabs.Item>
        ))}
      </Tabs>
      <HouseCrest house={house} />{/* sibling driven by the lifted state */}
    </div>
  )
}
```

Because the `Root` never assumes it owns the state, the *same component* serves both
cases. (`isHouse` narrows the string back to `House` with no cast — see
[type-safety](../hzblj-skills-type-safety/SKILL.md).)

## Scaling up: the composer, with a `state` / `actions` / `meta` context

When the shared surface grows past a single value — a card with an image, title,
price, a flip animation, a couple of refs — stop widening one flat context object.
Structure the context value into **three fixed buckets**, and keep this shape for
every composer:

| Bucket | Holds | Examples |
| --- | --- | --- |
| `state` | the reactive data the parts render | the `wizard`, `isRevealed`, loaded flags |
| `actions` | callbacks (grouped where they belong together) | `update`, `reveal: { show, hide }` |
| `meta` | **non-reactive** shared handles — refs, animated refs, shared values, static config | `portraitRef`, a Reanimated `SharedValue`, layout offsets |

`meta` is the home for **refs** and anything a part needs to reach but that must
*not* trigger a re-render when it changes — DOM/animated refs, gesture shared
values, immutable config. Keeping them out of `state` is what stops ref churn from
re-rendering the whole subtree.

```ts
// wizard-card-context.ts — the context value is always { state, actions, meta }
import { createContext, useContext, type RefObject } from 'react'

type WizardCardState = {
  isRevealed: boolean
  wizard: Wizard
}

type WizardCardActions = {
  reveal: {
    hide: () => void
    show: () => void
  }
  update?: (patch: Partial<Wizard>) => void
}

type WizardCardMeta = {
  portraitRef: RefObject<HTMLDivElement | null>
}

type WizardCardContextValue = {
  actions: WizardCardActions
  meta: WizardCardMeta
  state: WizardCardState
}

const WizardCardContext = createContext<WizardCardContextValue | null>(null)

const useWizardCard = (): WizardCardContextValue => {
  const context = useContext(WizardCardContext)

  if (context === null) {
    throw new Error('WizardCard.* must be used within <WizardCard.Provider>')
  }

  return context
}

export {
  WizardCardContext,
  useWizardCard,
  type WizardCardActions,
  type WizardCardContextValue,
  type WizardCardState,
}
```

Every part then destructures the buckets it needs — all three are used here:

```tsx
// wizard-card-portrait.tsx
export const WizardCardPortrait: FC = () => {
  const { actions, meta, state } = useWizardCard()

  return (
    <div ref={meta.portraitRef} onClick={actions.reveal.show}>
      {state.isRevealed ? (
        <Portrait wizard={state.wizard} />
      ) : (
        <CardBack />
      )}
    </div>
  )
}
```

## Expose the `Provider` so the state source can be lifted all the way up

Make the stateful part a **named `Provider`** on the compound. Its props follow the
same convention — it takes `state` (and optionally the `actions` the caller can
supply, like `update`) from **above**, while it creates the local UI state, the
grouped actions, and the `meta` refs internally. This lets a caller hoist the entire
source of truth out of the component — into a global store, a query hook, whatever —
and inject it:

```tsx
// wizard-card-provider.tsx
import { useCallback, useMemo, useRef, useState, type FC, type ReactNode } from 'react'
import { WizardCardContext, type WizardCardActions, type WizardCardContextValue, type WizardCardState } from './wizard-card-context'

type WizardCardProviderProps = {
  actions?: Pick<WizardCardActions, 'update'> // suppliable from above; the rest is internal
  children: ReactNode
  state: Pick<WizardCardState, 'wizard'> // suppliable from above; internal UI state is merged in
}

const WizardCardProvider: FC<WizardCardProviderProps> = ({ actions, children, state }) => {
  const [isRevealed, setIsRevealed] = useState(false)
  const portraitRef = useRef<HTMLDivElement>(null)

  const show = useCallback(() => setIsRevealed(true), [])
  const hide = useCallback(() => setIsRevealed(false), [])

  const value = useMemo<WizardCardContextValue>(
    () => ({
      actions: {
        reveal: { hide, show },
        update: actions?.update,
      },
      meta: { portraitRef },
      state: { ...state, isRevealed },
    }),
    [actions, hide, isRevealed, show, state],
  )

  return <WizardCardContext.Provider value={value}>{children}</WizardCardContext.Provider>
}

export { WizardCardProvider }
```

Assemble the composer as a plain object literal — the `Provider` is just one named
part alongside the presentational ones:

```ts
// index.ts
import { WizardCardFrame, WizardCardHouseBadge, WizardCardName, WizardCardPortrait } from './components'
import { WizardCardProvider } from './wizard-card-provider'

export const WizardCard = {
  Frame: WizardCardFrame,
  HouseBadge: WizardCardHouseBadge,
  Name: WizardCardName,
  Portrait: WizardCardPortrait,
  Provider: WizardCardProvider,
}
```

Now the caller owns the source of truth and pipes it in through `Provider` — exactly
the lift-state-up idea, taken to its limit. The composer holds no data of its own;
it just renders whatever `state`/`actions` the provider above feeds it:

```tsx
// The state lives in a global hook; the composer is fed from above.
export const RosterCard: FC<{ children: ReactNode; wizardId: string }> = ({ children, wizardId }) => {
  const { wizard, updateWizard } = useWizardRoster(wizardId)

  return (
    <WizardCard.Provider state={{ wizard }} actions={{ update: updateWizard }}>
      {children}
    </WizardCard.Provider>
  )
}

// …and the parts are arranged wherever the caller likes:
<RosterCard wizardId={id}>
  <WizardCard.Frame>
    <WizardCard.Portrait />
    <WizardCard.Name />
    <WizardCard.HouseBadge />
  </WizardCard.Frame>
</RosterCard>
```

## Same pattern on React Native

Nothing here is web-specific. On React Native the parts swap `<div>`→`<View>` and
`<button>`→`<Pressable>`, `className`→`style`, and `meta` typically carries a
Reanimated `useAnimatedRef` / `useSharedValue` instead of a DOM ref — but the
context, the guard hook, the `state`/`actions`/`meta` buckets, and the exposed
`Provider` are identical. In the Next.js App Router, a stateful `Root`/`Provider` is
a Client Component — mark its file `'use client'` (see
[nextjs-routing](../hzblj-skills-nextjs-routing/SKILL.md)).

## When to use which

| Pattern | Use when | Avoid when |
| --- | --- | --- |
| **Compound** (`<Tabs><Tabs.Item/></Tabs>`) | Parts share state; consumer arranges/interleaves them | One fixed layout, nothing to compose |
| **Composer** (`Provider` + `state`/`actions`/`meta`) | The shared surface is rich; state source may live elsewhere | A single shared value — a plain `Root` is enough |
| **Config props** (`<Tabs items={[…]} />`) | Layout is fixed, simple, data-driven | Consumers need custom markup between items → prop explosion |
| **Plain children** (`<Card>{…}</Card>`) | Slotting content with **no shared state** | The parts must coordinate — use a compound |

## Common Mistakes

| Mistake | Fix |
| --- | --- |
| Reading context without a guard, getting `undefined` | Default the context to `null` + a `useX` hook that throws |
| Providing a fresh context object every render | Wrap the value in `useMemo` keyed on its real dependencies |
| Exporting each part separately (`TabsRoot`, `TabsItem`) | Export only the namespaced compound; parts stay internal |
| One flat context object that keeps growing | Split into `state` / `actions` / `meta` buckets |
| Putting refs / animated values in `state` | Put them in `meta` — non-reactive handles don't belong in state |
| Loose, ungrouped callbacks on the context | Group them under `actions` (`actions.reveal.show`) |
| A composer that owns data it can't be fed from outside | Expose a `Provider` taking `state` (+ suppliable `actions`) as props |
| Making the component controlled-only | Support the `value ?? internalValue` hybrid; default uncontrolled |
| Lifting state up "just in case" | Lift only when a sibling — or a global store — needs the value |
| Prop-drilling shared state through every part | Share it through context |

## Review Checklist

- [ ] Context defaults to `null`; a `useX` hook throws when used outside the provider.
- [ ] The context value is wrapped in `useMemo`.
- [ ] For a rich composer, the context value is `{ state, actions, meta }`.
- [ ] `meta` holds refs / shared values / static config — never reactive data.
- [ ] `actions` are grouped; `state` is the reactive data the parts render.
- [ ] A `Provider` part is exposed, taking `state` (+ suppliable `actions`) from above.
- [ ] The compound is the only export; parts assembled via `Object.assign` / a literal.
- [ ] `Root` is uncontrolled by default and controllable via `value` + `onValueChange`.
- [ ] Each part is a small, single-responsibility component with a named prop `type`.

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
