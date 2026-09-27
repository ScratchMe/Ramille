---
name: hzblj-skills-objects-and-data
description: >-
  Clean-code objects vs. data structures — Tell Don't Ask, object/data anti-symmetry, Law of Demeter, contract-first design. Use when designing types, classes, and module boundaries. Triggers on: encapsulation, Tell Don't Ask, Law of Demeter, train wreck, DTO vs class, interface first.
disable-model-invocation: true
---

# Objects & Data Structures

The single most useful question you can ask about a type is: *does this thing hide its data behind behavior, or does it expose data for others to work with?* Get that decision wrong and every call site pays for it. This file is about drawing that line cleanly — telling objects what to do instead of interrogating them, keeping data structures and objects apart, refusing to chain through strangers, and nailing the contract before the logic.

For splitting the logic itself into small honest functions, see [functions](../hzblj-skills-functions/SKILL.md); for what to call any of these types, see [meaningful-names](../hzblj-skills-meaningful-names/SKILL.md). Types in every example follow the strict typing rules in [type-safety](../hzblj-skills-type-safety/SKILL.md) — `type` over `interface`, no `any`, narrow unions.

## Expose behavior, not data (Tell, Don't Ask)

An object's job is to hide its data behind operations. When a caller reaches in, pulls out fields, computes something, and writes the result back, the object has become a dumb bag of state and the *rule* now lives at the call site — usually copy-pasted across three of them. Don't ask an object for its data and act on its behalf. **Tell it to do the work.**

```ts
// Bad — the caller reaches into the house and enforces the rule itself
const awardHousePoints = (wizard: Wizard, amount: number): void => {
  wizard.house.points += amount
  if (wizard.house.points > 500) {
    wizard.house.leadsHouseCup = true
  }
}
// Every place that adjusts points must remember the 500 rule. They won't.
```

```ts
// Good — tell the wizard; the rule lives in one place, behind the operation
class Wizard {
  constructor(private readonly house: House) {}

  awardPoints(amount: number): void {
    this.house.credit(amount) // House owns its own invariant
  }
}

class House {
  private points = 0
  private leadsHouseCup = false

  credit(amount: number): void {
    this.points += amount
    this.leadsHouseCup = this.points > 500
  }
}
```

The data (`points`, `leadsHouseCup`) is now private and the only way to change it is through `credit`. There is exactly one place the House Cup rule can be wrong, and exactly one place to fix it.

## Objects vs. data structures — pick the right tool

Not everything needs to be an object. The two shapes are mirror images:

- A **data structure** exposes its data and has no meaningful behavior — a plain typed record / DTO. An owl-post payload, a row from Gringotts, a spell definition read from a config file.
- An **object** hides its data and exposes behavior. `Wizard`, `House`, `Vault`.

Choose by asking one question: **are you more likely to add new data types, or new behaviors?**

- Expecting new **behaviors** on a fixed set of types → **objects**. Adding a method touches one class and nothing else.
- Expecting new **data variants** that a fixed set of operations must handle → **data structures + functions**. Adding a variant means one new record shape and one new `case`; the existing functions are the fixed set.

This is the data/object anti-symmetry: objects make new behaviors cheap and new types expensive; data structures + functions make new types cheap and new behaviors expensive. Neither is "cleaner" — they trade in opposite directions.

```ts
// Data structure — a spell definition loaded from config. Pure data, no behavior.
type SpellRecord = {
  readonly kind: 'charm' | 'curse' | 'hex' | 'transfiguration'
  readonly incantation: string
  readonly wandMovement: string
}

// Functions operate over the fixed set of kinds. Adding a new *kind* is cheap:
// add a variant to the union and one branch here.
const spellDifficulty = (spell: SpellRecord): number => {
  switch (spell.kind) {
    case 'charm':
      return 1
    case 'hex':
      return 2
    case 'curse':
      return 4
    case 'transfiguration':
      return 5
  }
}
```

```ts
// Object — a Vault at Gringotts. Hides its data; you add *behaviors*, not variants.
class Vault {
  private galleons: number

  constructor(galleons: number) {
    this.galleons = galleons
  }

  withdraw(amount: number): void {
    if (amount > this.galleons) throw new Error('Insufficient galleons')
    this.galleons -= amount
  }

  deposit(amount: number): void {
    this.galleons += amount
  }
  // Adding `transferTo(other: Vault, amount)` touches only this class.
}
```

If you keep adding `case` branches to functions, you wanted an object. If you keep adding methods to a class that every subclass must override, you wanted a data structure. See the decision table at the bottom.

## Data/Object anti-symmetry — pick a side, your class can't be both

The hybrid is the worst of both worlds: a type that half-exposes its fields *and* half-exposes behavior. You get the fragility of a data structure (callers reach into public fields) plus the ceremony of an object (methods that pretend to protect invariants the public fields let anyone break). It's neither easy to add types to nor easy to add behaviors to.

```ts
// Bad — hybrid. Public mutable fields AND behavior methods that "guard" the same data.
class Potion {
  name = ''
  ingredients: string[] = [] // anyone can push/splice this from outside
  brewed = false

  brew(): void {
    if (this.ingredients.length === 0) throw new Error('Empty cauldron')
    this.brewed = true
  }
}

// Nothing stops this — the guard in brew() is a lie:
const p = new Potion()
p.brewed = true // "brewed" with no ingredients, never went through brew()
```

Pick a side.

```ts
// Good — a pure data structure: all data, no behavior. Build it with a function.
type PotionRecipe = {
  readonly name: string
  readonly ingredients: readonly string[]
}

const brew = (recipe: PotionRecipe): BrewedPotion => {
  if (recipe.ingredients.length === 0) throw new Error('Empty cauldron')
  return { recipe, brewedAt: Date.now() }
}
```

```ts
// Good — or a true object: data fully hidden, invariants enforceable.
class Potion {
  private readonly ingredients: string[] = []
  private brewed = false

  addIngredient(name: string): void {
    if (this.brewed) throw new Error('Already brewed')
    this.ingredients.push(name)
  }

  brew(): void {
    if (this.ingredients.length === 0) throw new Error('Empty cauldron')
    this.brewed = true // the ONLY way brewed becomes true
  }
}
```

## Law of Demeter — stop chaining through strangers

A method should only talk to its immediate collaborators: itself, its fields, its parameters, and objects it creates. It should **not** reach through a chain of getters into objects it was never handed. `wizard.getWand().getCore().getMaterial()` couples the caller to the entire `Wand → Core → Material` graph — change any link in that chain and every caller breaks. These chains are nicknamed *train wrecks* for a reason.

```ts
// Bad — reaching through strangers. The caller knows Wand has a Core,
// a Core has a Material, and a Material has a name. Three secrets leaked.
const isEligibleForElderDuel = (wizard: Wizard): boolean => {
  return wizard.getWand().getCore().getMaterial().getName() === 'phoenix-feather'
}
```

Ask the nearest object for the answer instead. Add a method that returns exactly what you need, so the traversal lives *inside* the object that owns the chain.

```ts
// Good — talk only to the wizard; it knows how to reach its own wand's core.
const isEligibleForElderDuel = (wizard: Wizard): boolean => {
  return wizard.hasWandCore('phoenix-feather')
}

class Wizard {
  constructor(private readonly wand: Wand) {}

  hasWandCore(material: WandCoreMaterial): boolean {
    return this.wand.coreMaterial() === material
  }
}

class Wand {
  constructor(private readonly core: WandCore) {}

  // The Wand owns the Core; it is allowed to reach into it.
  coreMaterial(): WandCoreMaterial {
    return this.core.material
  }
}
```

Note the exception: the rule constrains **objects**, not data structures. Walking `.` through a plain `SpellRecord` DTO is fine — a data structure is *supposed* to expose its fields, and it has no behavior to hide. Demeter is about not asking objects for their guts. When you find yourself needing a value three hops away, either add a method that returns it or pass that value into the function directly.

## Define the contract before you write the logic

Design the contract — the type's inputs, outputs, and guarantees — before you implement anything behind it. Program to that abstraction, not to a concrete class. Callers should depend on *what a thing promises*, not *how a particular thing keeps the promise*. In this repo the contract is a `type` (never `interface` — see [type-safety](../hzblj-skills-type-safety/SKILL.md)); a class can still `implements` it.

Define the contract first:

```ts
// The promise: anything that can cast a spell takes a target and returns a result.
type CastResult =
  | { outcome: 'hit'; damage: number }
  | { outcome: 'blocked' }
  | { outcome: 'backfired'; reason: string }

type SpellCaster = {
  canCast(spell: SpellRecord): boolean
  cast(spell: SpellRecord, target: Target): CastResult
}
```

Now two very different implementations can satisfy it, and callers never learn which one they hold:

```ts
// A living wizard casts with a wand.
class Wizard implements SpellCaster {
  constructor(private readonly wand: Wand) {}

  canCast(spell: SpellRecord): boolean {
    return this.wand.supports(spell.kind)
  }

  cast(spell: SpellRecord, target: Target): CastResult {
    return this.wand.channel(spell, target)
  }
}

// An enchanted portrait casts from memorized incantations — no wand at all.
class Portrait implements SpellCaster {
  constructor(private readonly knownIncantations: ReadonlySet<string>) {}

  canCast(spell: SpellRecord): boolean {
    return this.knownIncantations.has(spell.incantation)
  }

  cast(spell: SpellRecord): CastResult {
    return { outcome: 'blocked' } // portraits can only defend
  }
}
```

```ts
// Good — the duel depends on the contract, so it works with either caster.
const duel = (attacker: SpellCaster, spell: SpellRecord, target: Target): CastResult => {
  if (!attacker.canCast(spell)) return { outcome: 'blocked' }
  return attacker.cast(spell, target)
}

// Bad — depending on the concrete class locks the door on Portrait forever.
const duel = (attacker: Wizard, spell: SpellRecord, target: Target): CastResult => {
  return attacker.wand.channel(spell, target) // and it reaches through a stranger, too
}
```

Writing the contract first also forces you to decide the guarantees (what `canCast` promises, what shapes `cast` can return) before a half-built implementation quietly decides them for you.

## Objects vs. Data Structures — decision table

| Question | Lean **Object** | Lean **Data Structure** |
| --- | --- | --- |
| Do I expect new **behaviors** or new **types** more often? | New behaviors | New data variants |
| Should the data be reachable from outside? | No — hide it | Yes — that's the point |
| Are there invariants to protect (a Vault balance, a brewed flag)? | Yes | No |
| Is this crossing a boundary (owl-post payload, Gringotts row, config)? | Rarely | Usually — it's a DTO |
| Does the Law of Demeter apply to it? | Yes — don't chain into it | No — fields are public by design |
| How do I add a variant? | Painful — touch every method | Cheap — one record + one `case` |
| How do I add an operation? | Cheap — one method | Painful — touch every function |
| Typical Harry Potter example | `Wizard`, `House`, `Vault`, `Potion` | `SpellRecord`, owl-post payload, `PotionRecipe` |

## Common Mistakes

| Mistake | Fix |
| --- | --- |
| Caller reads fields, computes, writes back (`wizard.house.points += 10`) | Tell the object: `wizard.awardPoints(10)` — behavior over data |
| Business rule (the House Cup threshold) duplicated across call sites | Move it behind one operation on the object that owns the data |
| Hybrid class: public mutable fields **and** guard methods | Pick a side — pure data structure, or a true object with private state |
| Chaining through strangers: `wizard.getWand().getCore().getMaterial()` | Add `wizard.wandCoreMaterial()` or pass the value in — Law of Demeter |
| Applying Law of Demeter to a plain DTO | Data structures are meant to expose fields; walking `.` through them is fine |
| Making everything a class out of habit | Boundary payloads and config are data structures + functions |
| Depending on a concrete class (`duel(attacker: Wizard)`) | Depend on the contract (`SpellCaster`) so other implementers fit |
| Writing the implementation before the type | Define the contract — inputs, outputs, guarantees — first |
| Using `interface` for the contract | Use `type` per [type-safety](../hzblj-skills-type-safety/SKILL.md); classes still `implements` it |

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
