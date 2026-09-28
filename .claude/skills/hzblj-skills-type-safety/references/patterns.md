# TypeScript patterns

Code examples for every rule in [`SKILL.md`](../SKILL.md). Each section is a `// Bad`
/ `// Good` pair plus the reasoning that decides between them. Read the rule table
first; come here when you need the shape.

## `type`, not `interface`

`type` does everything `interface` does and composes with unions, intersections, and
mapped/conditional types that `interface` can't express. Pick one and stay consistent;
we pick `type`.

```ts
// Bad
interface Wizard {
  id: string
  name: string
}

// Good
type Wizard = {
  id: string
  name: string
}
```

## Never `enum`

`enum` emits runtime code, isn't a subtype of the values it wraps, and behaves
surprisingly (numeric enums are bidirectional maps). A string-literal union is
lighter, narrower, and needs no import to reference a member.

```ts
// Bad — a runtime object, awkward to serialize, values aren't plain strings.
enum House {
  Gryffindor = 'gryffindor',
  Slytherin = 'slytherin',
}

// Good — zero runtime cost; the values are the type.
type House = 'gryffindor' | 'slytherin' | 'ravenclaw' | 'hufflepuff'
```

## Prefer narrow types — string-literal unions

A type should permit exactly the values the domain allows and nothing more. `string`
for a house accepts `''`, `'Hogwarts'`, and every typo; a union of the four real
houses rejects all of them at the call site.

```ts
// Bad — every string typechecks; the bug surfaces at runtime, far away.
type Student = { house: string; year: number }
awardPoints({ house: 'gryffndor', year: 13 }) // compiles 😱

// Good — only real houses and a narrow year union typecheck.
type House = 'gryffindor' | 'slytherin' | 'ravenclaw' | 'hufflepuff'
type Year = 1 | 2 | 3 | 4 | 5 | 6 | 7
type Student = { house: House; year: Year }
awardPoints({ house: 'gryffndor', year: 13 }) // ✗ two compile errors
```

| Broad (avoid) | Narrow (prefer) | Why |
| --- | --- | --- |
| `string` | `'gryffindor' \| 'slytherin' \| …` | Rejects typos and impossible values |
| `number` | `1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7` | Encodes the real domain range |
| `boolean` flags ×2 | one union `'idle' \| 'loading' \| 'error'` | Two booleans allow impossible combos |
| `object` / `{}` | an explicit `type` | `{}` means "anything non-nullish" |
| `any` | `unknown` + guard | Keeps checking on; forces proof of shape |

## Discriminated unions — "one of several shapes"

When a value is one of several *shapes* (not just several values), give each variant a
shared literal **discriminant** field. TypeScript then narrows the whole object once
you check that field, and contradictory combinations become impossible to construct.
If a bug ever forces the question "wait, can this combination actually happen?", the
type is too loose.

```ts
// Bad — optional fields allow illegal combinations the compiler can't catch:
// a "success" with an error, a "loading" that also has data.
type RequestState = {
  status: 'idle' | 'loading' | 'success' | 'error'
  data?: Spell[]
  error?: Error
}

// Good — each state carries exactly the fields it has, and no others.
type RequestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: Spell[] }
  | { status: 'error'; error: Error }

const render = (state: RequestState): string => {
  if (state.status === 'success') return `${state.data.length} spells` // .data exists
  if (state.status === 'error') return state.error.message // .error exists
  return 'Loading…' // .data / .error not even accessible here
}
```

Accessing `state.data` in the `idle` branch is a **compile error**, not a runtime
`undefined`. Pick one discriminant name (`status`, `kind`, `type`) and use it
everywhere; mixing names per file costs you the muscle memory.

## Constructive modeling — build the illegal value out of existence

The runtime guard is the fallback, not the design. Build the type out of parts that
are all legal instead of restricting a loose type with checks every caller repeats.
Adding is easier than subtracting.

**Non-empty, via a variadic tuple:**

```ts
type NonEmpty<T> = [T, ...T[]]

// Bad — T[] plus a length check every caller must repeat.
const pickChampion = (entries: string[]): string => {
  if (entries.length === 0) throw new NoChampionsError()
  return entries[Math.floor(Math.random() * entries.length)]
}

// Good — an empty value of this type can't exist.
const pickChampion = (entries: NonEmpty<string>): string =>
  entries[Math.floor(Math.random() * entries.length)]
```

Where a plain `T[]` arrives from outside, narrow once with a guard. The fact then
travels in the type instead of being re-checked at every call:

```ts
const isNonEmpty = <T,>(items: T[]): items is NonEmpty<T> => items.length > 0
```

**Even length, as pairs.** TypeScript has no refinement types (there's no
`items.length % 2 === 0` at the type level), and you don't need one:

```ts
type DuelPairings = [Wizard, Wizard][]
```

**A time range, as start plus duration:**

```ts
// Bad — a comment holds the invariant, and nothing enforces it.
type MatchWindow = { start: Date; end: Date } // start <= end

// Good — a negative window can't be written; derive the end when you need it.
type MatchWindow = { start: Date; durationMinutes: number }
```

Keep `durationMinutes` a plain number. Brand it (see below) only if a raw number could
be passed where a duration is expected, not by reflex. Pick the representation that
makes the bad state unconstructable, then expose the reading you need on top
(`pairings.flat()`, a `windowEnd()` helper).

## Simplest total type — don't strengthen everything

Keep `T[]` as long as every operation on it is **total**, meaning it has a sensible
answer for every input including the empty one:

```ts
const totalPoints = (awards: number[]): number =>
  awards.reduce((sum, points) => sum + points, 0) // [] is 0 — fine
```

Strengthen only when the loose type forces a lie at a use site. The tells are `!`, a
cast, and a "should never happen" throw:

```ts
// Bad — partiality smuggled past the compiler.
const newestDuel = (duels: Duel[]): Duel => duels.at(0)!

// Good — strengthen the input; the assertion disappears.
const newestDuel = (duels: NonEmpty<Duel>): Duel => duels[0]
```

Weakening the result to `Duel | undefined` is the other total signature. Either way
the empty case lands at the call site, which is the one place that knows what empty
means.

## `unknown` over `any`

`any` doesn't add a type; it **deletes** the type-checker for that value and everything
derived from it. One `any` at an API boundary silently propagates through the whole
call graph. When a value is genuinely unknown (a fetch response, `JSON.parse`, a
`catch` binding), type it `unknown` and narrow with a type guard — the compiler then
forces you to prove the shape before you use it.

```ts
// Bad — any disables checking; the typo and the missing field both compile.
const toSpell = (raw: any): Spell => ({ name: raw.naem, power: raw.power })

// Good — unknown forces a guard; nothing is readable until the shape is proven.
const isSpell = (value: unknown): value is Spell =>
  typeof value === 'object' &&
  value !== null &&
  'name' in value &&
  typeof (value as Record<string, unknown>).name === 'string'

const toSpell = (raw: unknown): Spell => {
  if (!isSpell(raw)) throw new InvalidSpellError()
  return raw // narrowed to Spell here
}
```

External sources are always `unknown`: HTTP responses, `JSON.parse`, `postMessage`,
deep-link params, `AsyncStorage` / `MMKV` reads, environment variables, database rows.

## No `as` casts

Every `as` is a runtime crash waiting for the right payload. Never launder a wrong type
through `as Spell` or the double-cast escape hatch `as unknown as Spell` — both assert
a lie the compiler will believe. Cast only where the type system has already verified
the claim.

```ts
// Bad
const wizard = data as Wizard

// Good — earn the cast at the boundary.
const parseWizard = (data: unknown): Wizard => {
  if (typeof data !== 'object' || data === null) throw new InvalidWizardError()
  if (!('id' in data) || typeof (data as Record<string, unknown>).id !== 'string') {
    throw new InvalidWizardError()
  }
  // ...validate every field
  return data as Wizard // earned — the shape has been proven above
}
```

Two casts are allowed anywhere: `as const` (it narrows rather than widens) and the one
inside a branded type's smart constructor (there's no other way to attach a phantom
brand).

When refactoring an existing `as` out, identify why TypeScript can't infer:

| Reason the compiler can't infer | Fix |
| --- | --- |
| Missing discriminant | Add one; switch to a discriminated union |
| Source type too wide (`Record<string, unknown>`) | Narrow it where it's produced |
| Untyped boundary | Add a parse function or a schema |
| Genuinely inexpressible | A branded type, or `satisfies` |

## Narrowing hierarchy

From best to last resort. Reach down the list only when everything above it fails.

1. **Discriminated union switch / if.** The compiler narrows automatically, no extra code.
2. **`in` operator.** `'radius' in shape` narrows to the variants that carry the key.
3. **`typeof` / `instanceof`.** Primitives and class instances.
4. **User-defined type guard.** When none of the above can express the check.
5. **`as` cast.** Only after validation has already proven the shape.

```ts
const area = (shape: Shape): number => {
  if ('radius' in shape) return Math.PI * shape.radius ** 2 // narrowed to circle
  return shape.width * shape.height // narrowed to rect
}
```

## Type guards must verify the claim

A guard that returns `true` without checking is worse than `as`, because the bug hides
behind a name that says it's safe. Name guards `isX` / `hasX` and make the body prove
exactly what the signature promises.

```ts
// Bad — the name lies; nothing here proves the value is a Patronus.
const isPatronus = (value: unknown): value is Patronus => value !== null

// Good — the check matches the claim.
const isPatronus = (spell: Spell): spell is Extract<Spell, { kind: 'patronus' }> =>
  spell.kind === 'patronus'
```

Prefer plain discriminant narrowing where it works. A guard adds a layer the reader
has to follow and trust.

## Exhaustiveness — `switch` + `never`

Handle a union with a `switch` whose `default` funnels into a `never` guard. Because
only `never` is assignable to `never`, the code compiles *only while every case is
handled*. Add a member to the union and **every** switch that forgot it fails to
compile — the type-checker hands you an exact to-do list.

```ts
// One shared helper — the compiler proves a value can never reach it.
export const assertNever = (value: never): never => {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`)
}
```

```ts
type House = 'gryffindor' | 'slytherin' | 'ravenclaw' | 'hufflepuff'

export const houseColor = (house: House): string => {
  switch (house) {
    case 'gryffindor':
      return 'scarlet'
    case 'slytherin':
      return 'emerald'
    case 'ravenclaw':
      return 'sapphire'
    case 'hufflepuff':
      return 'amber'
    default:
      return assertNever(house) // ✓ house is `never` — all cases handled
  }
}
```

Now extend the union and watch it break in exactly the right place:

```ts
type House = 'gryffindor' | 'slytherin' | 'ravenclaw' | 'hufflepuff' | 'durmstrang'
// ❌ houseColor: Argument of type 'string' is not assignable to parameter of type 'never'.
//    → 'durmstrang' reaches `default`; the compiler flags the missing case.
```

The same pattern discriminates a union by its `kind` field:

```ts
const describe = (spell: Spell): string => {
  switch (spell.kind) {
    case 'charm':
      return `Charm: ${spell.incantation}`
    case 'curse':
      return `Curse: ${spell.incantation}`
    case 'potion':
      return `Potion, ${spell.brewMinutes}m`
    default:
      return assertNever(spell)
  }
}
```

In a statement switch that returns nothing, assign to the `never` local and discard it:

```ts
const applyEffect = (spell: Spell): void => {
  switch (spell.kind) {
    case 'charm':
      castCharm(spell)
      break
    case 'curse':
      castCurse(spell)
      break
    default: {
      const exhaustive: never = spell
      void exhaustive
    }
  }
}
```

> **Why not `if / else if`?** A chain of `if`s has no `never` backstop — add a union
> member and it silently falls through to the last `else`, shipping wrong behavior with
> zero compiler help. The `switch` + `never` pattern is what turns "I extended the type"
> into "the build tells me every place to update."

## `satisfies` — validate a literal without widening it

A type annotation (`const x: T = …`) **widens** the value to `T`, throwing away the
precise inferred type. `satisfies` does the opposite: it *checks* the value conforms to
`T`, catching missing keys and wrong value types, while keeping the exact narrow type
you wrote.

```ts
// Bad — the annotation widens every value back to string.
const HOUSE_COLORS: Record<House, string> = {
  gryffindor: 'scarlet',
  slytherin: 'emerald',
  ravenclaw: 'sapphire',
  hufflepuff: 'amber',
}
const color = HOUSE_COLORS.gryffindor // type: string — literal lost

// Good — satisfies checks the shape but preserves the literal types.
const HOUSE_COLORS = {
  gryffindor: 'scarlet',
  slytherin: 'emerald',
  ravenclaw: 'sapphire',
  hufflepuff: 'amber',
} satisfies Record<House, string>
const color = HOUSE_COLORS.gryffindor // type: 'scarlet'
// Omit a house → compile error; add an unknown house → compile error.
```

| Form | Conformance to `T` checked? | Resulting type | Use when |
| --- | --- | --- | --- |
| `x: T = …` | ✓ | `T` (widened) | You want the variable typed exactly as `T` |
| `x = … as T` | ✗ (unsafe assertion) | `T` | Almost never — it asserts, it doesn't check |
| `x = … satisfies T` | ✓ | the narrow inferred type | You want `T`'s guarantee **and** literal precision |

## Compose complex types from small named pieces

Don't hand-write one wide type and repeat its field groups everywhere. Name the small,
reusable shapes, then combine them with `&` and `|`.

```ts
// Bad — one flat wall of fields; the shared bits can't be reused or named.
type Wizard = {
  id: string
  createdAt: string
  updatedAt: string
  name: string
  house: House
  wandWood: string
  wandCore: string
}

// Good — small building blocks compose into the whole.
type Id = { id: string }
type Timestamps = { createdAt: string; updatedAt: string }
type Wand = { wood: string; core: string }

type Wizard = Id &
  Timestamps & {
    name: string
    house: House
    wand: Wand
  }
```

Then **derive** related shapes with utility types instead of duplicating them — one
canonical `Wizard`, everything else computed from it, so they can never drift apart.

```ts
type NewWizard = Omit<Wizard, keyof Id | keyof Timestamps> // create payload
type WizardPreview = Pick<Wizard, 'id' | 'name' | 'house'> // list-row shape
type WizardPatch = Partial<Omit<Wizard, 'id'>> // PATCH body — everything but id, optional
type PointsByHouse = Record<House, number> // one entry per house, checked
```

| Utility | Produces | Reach for it when |
| --- | --- | --- |
| `Pick<T, K>` | T with only keys `K` | A view/preview needs a few fields |
| `Omit<T, K>` | T without keys `K` | Dropping server-owned fields (`id`, timestamps) |
| `Partial<T>` | all keys optional | PATCH / update payloads |
| `Required<T>` | all keys required | Tightening a loose config after defaults |
| `Record<K, V>` | object keyed by `K` | A lookup with one entry per union member |
| `ReturnType<F>` / `Parameters<F>` | a function's result / args | Typing around an existing function |
| `Awaited<T>` | the resolved value of a promise | Typing around an async function's result |
| `Extract<T, U>` / `Exclude<T, U>` | one variant / all but one | Pulling a single case out of a union |

Compose broadly, but keep each piece **narrow** — composition doesn't excuse a stray
`string` inside a building block.

## Derive types from values — `as const`, `typeof`, `keyof`

When you already have the data as a value (the list of houses, a config map), don't
also maintain a parallel hand-written type that can silently fall out of sync. Freeze
the value with `as const` and derive the type from it.

```ts
// Bad — two sources of truth. Add a house to one, forget the other, and they drift.
const HOUSES = ['gryffindor', 'slytherin', 'ravenclaw', 'hufflepuff']
type House = 'gryffindor' | 'slytherin' | 'ravenclaw' | 'hufflepuff'

// Good — the array is the single source; the type is derived from it.
const HOUSES = ['gryffindor', 'slytherin', 'ravenclaw', 'hufflepuff'] as const
type House = (typeof HOUSES)[number]
// 'gryffindor' | 'slytherin' | 'ravenclaw' | 'hufflepuff'
```

Without `as const`, `HOUSES` is `string[]` and `(typeof HOUSES)[number]` collapses to
`string` — the narrowness is gone. The same trick derives keys and values from a map:

```ts
const HOUSE_COLORS = {
  gryffindor: 'scarlet',
  slytherin: 'emerald',
  ravenclaw: 'sapphire',
  hufflepuff: 'amber',
} as const

type House = keyof typeof HOUSE_COLORS // 'gryffindor' | 'slytherin' | …
type HouseColor = (typeof HOUSE_COLORS)[House] // 'scarlet' | 'emerald' | …
```

## Schema-derived types

When a schema already defines a shape — an OpenAPI spec, a GraphQL schema, a Prisma or
Drizzle model, a Zod validator — derive from the generated type instead of writing a
second copy that drifts the moment the schema changes.

```ts
// Bad — a hand-written duplicate of the API shape.
type WizardSummary = {
  id: string
  name: string
  house: string
  points: number
}

// Good — derived from the generated schema type.
import type { WizardResponse } from '@core-api/generated'

type WizardSummary = Pick<WizardResponse, 'id' | 'name' | 'house' | 'points'>
```

With a runtime validator, let the schema be the single source and infer the type from it:

```ts
const wizardSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  house: z.enum(['gryffindor', 'slytherin', 'ravenclaw', 'hufflepuff']),
})

type Wizard = z.infer<typeof wizardSchema> // never drifts from the validation
```

Reach for `Pick`, `Omit`, `Parameters`, `ReturnType`, `Awaited`, `typeof`, and
`z.infer` before declaring a new type by hand.

## Boundary validation

Validate once where data crosses into the app, then trust the types inside. Re-checking
the same payload three layers deep adds code, hides where the real contract is, and
still can't catch anything the boundary missed.

```ts
// Bad — the shape is asserted at the boundary and re-checked forever after.
const loadRoster = async (): Promise<Student[]> => {
  const response = await fetch('/api/roster')
  return (await response.json()) as Student[] // never verified
}

const houseOf = (student: Student): House => {
  if (!student || typeof student.house !== 'string') throw new Error('bad student')
  return student.house as House // re-checking a lie
}
```

```ts
// Good — one parse at the edge; everything downstream takes a proven Student.
const loadRoster = async (): Promise<Student[]> => {
  const response = await fetch('/api/roster')
  const payload: unknown = await response.json()
  return rosterSchema.parse(payload) // throws here, at the boundary
}

const houseOf = (student: Student): House => student.house // trusted
```

The boundaries worth guarding: HTTP responses, WebSocket messages, deep links and
navigation params, persisted storage (`MMKV`, `AsyncStorage`, `localStorage`), native
module bridges, and environment variables. Persisted blobs deserve a version field and
a `try` / `catch` around the parse, because yesterday's app wrote them.

## Branded types — IDs that can't be mixed up

When several things are all `string` (a wizard id, a spell id, a raw incantation), the
compiler happily lets you pass one where another is expected. A **brand**, meaning an
intersection with a phantom marker, makes each a distinct type at zero runtime cost.

```ts
type WizardId = string & { readonly __brand: 'WizardId' }
type SpellId = string & { readonly __brand: 'SpellId' }

// Validate once, here. Downstream code trusts the type.
const toWizardId = (value: string): WizardId => {
  if (!isUuid(value)) throw new InvalidWizardIdError(value)
  return value as WizardId
}

const findWizard = (id: WizardId): Wizard | undefined => undefined

findWizard(toWizardId(raw)) // ✓
findWizard(someSpellId) // ✗ SpellId is not assignable to WizardId
```

Match the `& { readonly __brand: 'X' }` shape; don't invent a second convention in the
same codebase. Use it for identifiers and for units (`Galleons`, `Minutes`) that would
otherwise silently swap.

## Safe array & record indexing (`noUncheckedIndexedAccess`)

By default TypeScript assumes every index is in bounds — `students[0]` is typed
`Student` even for an empty array, so `.castSpell()` compiles and crashes at runtime.
With `noUncheckedIndexedAccess` on, every index access is `T | undefined` and the
empty case has to be handled.

```ts
// With noUncheckedIndexedAccess on:
const first = students[0] // Student | undefined
first.castSpell() // ✗ 'first' is possibly 'undefined'

// Good — narrow first (guard clause), then use it.
const first = students[0]
if (first === undefined) return
first.castSpell() // Student here
```

The same applies to open-keyed records, where a lookup really can miss:

```ts
const enrollment: Record<string, Student> = loadRoster()
const student = enrollment[id] // Student | undefined — handle the miss
```

Don't paper over the `undefined` with `students[0]!`. Narrow it, or throw from a
`requireX` helper when absence is genuinely exceptional.

## Object args over positional

Past two parameters, positional arguments of the same type are a silent swap waiting to
happen. An object makes the call self-documenting and order-independent.

```ts
// Bad — swap two arguments and it still compiles.
awardPoints(house, points, awardedBy, reason)

// Good — order-independent, readable at the call site.
awardPoints({ house, points, awardedBy, reason })
```

Skip this on hot paths where the allocation matters: per-frame worklets, gesture
handlers, tokenizers, tight loops. See [functions](../../hzblj-skills-functions/SKILL.md)
for the argument-count rules this builds on.

## Explicit prop types — never inline

Every component's props get a named `type` declared above the component, never an
inline annotation in the signature. The name documents the contract, is reusable, and
keeps the signature readable.

```ts
// Bad — props inlined; unreadable and unreusable.
const HouseBadge = ({ house, points }: { house: House; points: number }) => null

// Good — a named prop type.
type HouseBadgeProps = {
  house: House
  points: number
}

const HouseBadge = ({ house, points }: HouseBadgeProps) => null
```

## Real tests over mocks

Don't mock what you can actually run. A hand-written mock is a second implementation
typed as `any` in all but name: it drifts from the real module, the test keeps passing,
and the app breaks. Prefer the real primitives — a real render, a real store, a real
navigator — and mock only what can't run locally.

```ts
// Bad — the mock's shape is invented and drifts silently.
jest.mock('@core-api/roster', () => ({
  fetchRoster: () => Promise.resolve([{ nmae: 'Hermione' }]), // typo compiles
}))

// Good — a typed fake that the compiler holds to the real contract.
import type { fetchRoster } from '@core-api/roster'

const fakeFetchRoster: typeof fetchRoster = async () => [
  { id: toWizardId(TEST_UUID), name: 'Hermione', house: 'gryffindor' },
]
```

Render the component and assert on what the user sees, and verify UI in a running
build before calling it done. Mock the network, the clock, and native modules. Don't
mock your own code.

## Structured telemetry, not `console.log`

Ship a typed logger, not stray `console.log` calls. Model the events as a discriminated
union and the compiler will tell you when an event is missing the context you'd need to
debug it from an id alone.

```ts
// Bad — unsearchable, untyped, and it ships to production.
console.log('spell failed', spell)

// Good — a narrow event union; every field is required and checked.
type TelemetryEvent =
  | { name: 'spell_cast'; spellId: SpellId; wizardId: WizardId; durationMs: number }
  | { name: 'spell_failed'; spellId: SpellId; wizardId: WizardId; reason: string }

const track = (event: TelemetryEvent): void => logger.info(event)

track({ name: 'spell_failed', spellId, wizardId, reason: 'wand_mismatch' })
```

## Common Mistakes

| Mistake | Fix |
| --- | --- |
| `any` at a boundary, silently spreading downstream | Type it `unknown`; narrow with a type guard before use |
| `as Spell` / `as unknown as Spell` to silence an error | Don't assert a lie — narrow, or fix the real type |
| A type guard that doesn't check what its name claims | Make the body prove the signature, or drop the guard |
| `string` / `number` where the domain is a fixed set | A string-literal / numeric-literal union |
| Optional fields (`data?`, `error?`) encoding a state machine | A discriminated union — one variant per state |
| A runtime length check every caller has to repeat | Model it constructively: `NonEmpty<T>`, pairs, start + duration |
| Strengthening every array to `NonEmpty<T>` by reflex | Keep `T[]` while every operation stays total |
| `if / else if` over a union with no fallthrough guard | `switch` + `default: return assertNever(x)` |
| Adding a union member and hunting call sites by hand | The `never` guard flags every unhandled `switch` for you |
| One giant flat type with repeated field groups | Name small pieces; compose with `&`; derive with `Pick`/`Omit` |
| A hand-written type mirroring a schema or a value list | Derive it: `z.infer`, `Pick<Generated, …>`, `(typeof X)[number]` |
| `: Record<K, string>` that widens literals away | `satisfies Record<K, string>` — checks shape, keeps literals |
| Re-validating the same payload three layers deep | Parse once at the boundary; trust the type inside |
| `arr[0].foo` assuming the element exists | Enable `noUncheckedIndexedAccess`; narrow the `T \| undefined` |
| `arr[0]!` non-null assertion to dodge the check | Guard it, or throw via a `requireX` helper |
| Passing a `WizardId` where a `SpellId` is meant (both `string`) | Brand the ids so the compiler separates them |
| Four positional args of similar types | One object arg, so order can't be swapped |
| `interface` or `enum` | `type`; a string-literal union instead of `enum` |
| Props inlined in the component signature | A named `type XProps` above the component |
| A hand-rolled mock that drifts from the real module | Type the fake as `typeof realThing`, or run the real thing |
| `console.log` left in shipped code | A typed `track()` over a discriminated event union |

---

*The constructive-modeling, simplest-total-type, narrowing-hierarchy, boundary-validation, schema-derived-types, object-args, real-tests, and structured-telemetry sections are adapted from [cursor/plugins](https://github.com/cursor/plugins/tree/main/pstack/skills/typescript-best-practices) (MIT); the examples are rewritten in this repo's TypeScript house style.*

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
