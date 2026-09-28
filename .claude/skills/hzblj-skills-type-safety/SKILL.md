---
name: hzblj-skills-type-safety
description: >-
  Strict TypeScript typing — type over interface, no any, no as casts, narrow literal unions, discriminated unions, constructive modeling, exhaustive switch with never, satisfies, branded types, boundary validation, and safe array indexing. Use when defining, composing, or reviewing types. Triggers on: type over interface, no any, no enum, unknown, as cast, narrow types, string-literal union, discriminated union, constructive modeling, NonEmpty, exhaustiveness, never, assertNever, satisfies, as const, keyof, typeof, utility types, Pick, Omit, Record, noUncheckedIndexedAccess, array indexing, branded type, narrowing hierarchy, type guard, boundary validation, schema-derived types, object args, type safety.
disable-model-invocation: true
---

# Type Safety (Strict)

The type system is a proof engine: model the domain precisely enough and whole classes of bugs stop compiling. The goal is to make **illegal states unrepresentable** — a value that can't exist in the domain shouldn't be expressible in the types. Every `any`, every broad `string`, every unchecked index is a hole where a runtime crash leaks back in.

The rules below are the checklist. Every one has a worked `// Bad` / `// Good` example in **[references/patterns.md](references/patterns.md)** — read the table here, go there for the shape.

This assumes a strict `tsconfig.json`. These are non-negotiable:

```jsonc
// tsconfig.json — the floor for every app
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true, // array/record access yields T | undefined
    "exactOptionalPropertyTypes": true, // `x?: T` ≠ `x: T | undefined`
    "noImplicitOverride": true
  }
}
```

## Rules

| Rule | Summary |
| --- | --- |
| `type`, not `interface` | `type` composes with unions, intersections, and mapped types that `interface` can't express. Pick one; we pick `type`. |
| Never `enum` | It emits runtime code and isn't a subtype of the values it wraps. A string-literal union is lighter and narrower. |
| Narrow over broad | A type permits exactly what the domain allows. String-literal unions over `string`, numeric-literal unions over `number`. |
| Discriminated unions | Model variants with a literal `status`/`kind` discriminant so impossible states can't be represented. No optional-field bags. |
| Constructive modeling | Build the shape so the illegal value can't be constructed. `[T, ...T[]]` for non-empty, `[T, T][]` for pairs, `start` + `durationMinutes` for a range. Not a runtime guard, not a wish for refinement types. |
| Simplest total type | Keep `T[]` while every operation on it stays total. Strengthen to `NonEmpty<T>` only where the loose type forces `!`, a cast, or a "can't happen" throw. |
| `unknown` over `any` | External data is `unknown`. `any` deletes the type-checker everywhere it touches. |
| No `as` casts | Every `as` is a runtime crash waiting. Cast only after validation. Never `as unknown as`. |
| Narrowing hierarchy | Discriminant switch > `in` operator > `typeof`/`instanceof` > user-defined guard > `as` after validation. |
| Type guards verify | The body must prove what the signature claims. A lying guard is worse than `as`, because the bug hides behind a name that says it's safe. Name them `isX` / `hasX`. |
| Exhaustiveness | End every `switch` over a union with `default: return assertNever(x)`, so adding a variant breaks the build at every unhandled site. |
| `satisfies` over `as` | It validates the value without widening the literal types. |
| Compose from small pieces | Name small reusable shapes, combine with `&` and `\|`. No flat wall of repeated field groups. |
| Derive, don't duplicate | One source of truth: `as const` + `(typeof X)[number]` / `keyof typeof X` for value lists, `Pick`/`Omit`/`Partial`/`Record`/`ReturnType`/`Awaited` for variants. |
| Schema-derived types | When an OpenAPI spec, GraphQL schema, Prisma/Drizzle model, or Zod validator already defines the shape, derive from it (`z.infer`, `Pick<Generated, …>`) instead of writing a second copy that drifts. |
| Boundary validation | Parse once where data crosses in, then trust the types inside. Don't re-validate deep in call chains. |
| Branded types | Brand primitives with `& { readonly __brand: 'X' }` so ids and units can't be swapped. Validate once, in the smart constructor. |
| Safe indexing | With `noUncheckedIndexedAccess`, every index is `T \| undefined`. Guard it; never `arr[0]!`. |
| Object args | Past two parameters, pass an object so argument order can't be swapped. Skip on hot paths (worklets, gesture handlers, tight loops). |
| Explicit prop types | Props are a named `type XProps` declared above the component, never inlined in the signature. |
| Real tests | Don't mock what you can run. A hand-rolled mock is a second implementation that drifts from the real type. Type fakes as `typeof realThing`; mock only the network, the clock, and native modules. |
| Structured telemetry | No `console.log` in shipped code. A typed `track()` over a discriminated event union, with enough context to debug from an id. |

Examples for every rule: **[references/patterns.md](references/patterns.md)**.

Pairs with [meaningful-names](../hzblj-skills-meaningful-names/SKILL.md) (a type name is a promise), [objects-and-data](../hzblj-skills-objects-and-data/SKILL.md) (a `type` is a contract), [functions](../hzblj-skills-functions/SKILL.md) (argument count, guard clauses), and [error-handling](../hzblj-skills-error-handling/SKILL.md) (error/result types, `unknown` in `catch`).

## Review Checklist

- [ ] No `any`, no `as` casts, no `as unknown as` (only `as const` and a branded type's smart constructor).
- [ ] `strict` **and** `noUncheckedIndexedAccess` on; every index result is guarded, never `!`.
- [ ] Domain values use narrow literal unions, not `string` / `number`.
- [ ] "One of several shapes" is a discriminated union, not a bag of optional fields.
- [ ] Invariants are constructed into the type where possible, not re-checked by every caller.
- [ ] Loose types were strengthened only where a use site was forced to lie.
- [ ] Narrowing goes through the hierarchy; every guard's body proves its signature.
- [ ] Every `switch` over a union ends in `default: return assertNever(x)`.
- [ ] Object literals validated with `satisfies`, not a widening annotation.
- [ ] Big types composed from small named pieces; variants derived with utility types.
- [ ] Types with an upstream schema are derived from it, not hand-copied.
- [ ] External data is parsed once at the boundary and trusted inside.
- [ ] Ids and units that share a primitive are branded.
- [ ] `type` throughout (no `interface`), no `enum`.
- [ ] Props declared as a named `type`, not inline.
- [ ] No `console.log` in shipped code; telemetry goes through the typed event union.

---

*The rule table, and the constructive-modeling, simplest-total-type, narrowing-hierarchy, boundary-validation, schema-derived-types, object-args, real-tests, and structured-telemetry rules are adapted from [cursor/plugins](https://github.com/cursor/plugins/tree/main/pstack/skills/typescript-best-practices) (MIT). Examples rewritten for this codebase's conventions.*

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
