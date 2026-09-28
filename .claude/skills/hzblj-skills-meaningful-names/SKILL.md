---
name: hzblj-skills-meaningful-names
description: >-
  Clean-code naming — intention-revealing, honest, distinct, pronounceable, searchable names with no type encoding. Use when naming or reviewing variables, functions, types, and components. Triggers on: naming, rename, meaningful names, magic number, Hungarian notation, unclear name.
disable-model-invocation: true
---

# Meaningful Names

Names are the first documentation a reader meets. A good name is a tiny, always-accurate comment baked into the identifier itself. This file covers how to name variables, functions, types, and components so a wizard reading your code six months from now understands intent without deciphering anything.

For how these names get used inside functions, see [functions](../hzblj-skills-functions/SKILL.md).

## Quick Reference

| Principle | Bad | Good |
| --- | --- | --- |
| Intention-revealing | `d` | `daysSinceLastQuidditchMatch` |
| Honest, no disinformation | `spellList` (a `Map`) | `spellsById` |
| Meaningful distinction | `house1`, `houseData`, `houseInfo` | `sourceHouse`, `targetHouse` |
| Pronounceable | `slytStdntCnt` | `slytherinStudentCount` |
| Searchable | `7` | `MAX_QUIDDITCH_PLAYERS` |
| No type encoding | `strSpellName`, `IWizard` | `spellName`, `Wizard` |
| Clarity over brevity | `castW(w, s)` | `castSpell(wizard, spell)` |
| Booleans read as questions | `enrolled`, `wand` | `isEnrolled`, `hasWand` |

## Use Intention-Revealing Names

A name must answer three questions on its own: **why does this thing exist, what does it do, and how is it used**. If you need a trailing comment to explain a name, the name has already failed. Replace it with one that carries the explanation.

```ts
// Bad — what is `d`? What is `7`? What is this list actually holding?
const d = 12
const list: number[] = []
for (const x of houses) {
  if (x[3] === 7) list.push(x)
}
```

```ts
// Good — the names ARE the comment
const daysSinceLastQuidditchMatch = 12

const MAX_QUIDDITCH_PLAYERS = 7 as const

const fullQuidditchTeams = houses.filter(
  (house) => house.playerCount === MAX_QUIDDITCH_PLAYERS,
)
```

The second version needs no comment because every name states its own purpose. You can read it aloud and it sounds like a sentence about the domain.

## Avoid Disinformation — Make Names Honest

A name must never promise something that is false. Disinformation is worse than a vague name because a vague name makes you check, while a lying name makes you *trust*. The classic trap is naming a collection after a type it is not: calling a `Map` a `List`, or calling a flat array a `Group`.

```ts
// Bad — `spellList` is a Map, and `houseGroup` is a single house, not a grouping
const spellList: Map<string, Spell> = new Map()
const houseGroup: House = getHouseByName('gryffindor')
```

```ts
// Good — names match reality
const spellsById: Map<string, Spell> = new Map()
const gryffindor: House = getHouseByName('gryffindor')
```

Reserve words like `List`, `Map`, `Set`, `Group`, `Queue` for when the value actually is that shape. When a reader sees `spellsByHouse: Map<House, Spell[]>`, the name and the type agree — that agreement is trust you never want to break.

## Make Meaningful Distinctions

When two names differ only by a number series or a noise word, the reader cannot tell which one to use. `house1` and `house2` say nothing about their roles. `houseData` and `houseInfo` are the same word dressed twice — `Data` and `Info` add zero information. Distinguish names by their *role in the domain*.

```ts
// Bad — which house is which? What makes `Info` different from `Data`?
const transferPoints = (house1: House, house2: House, points: number) => {
  house1.points -= points
  house2.points += points
}

const houseData = fetchHouse('slytherin')
const houseInfo = fetchHouse('hufflepuff')
```

```ts
// Good — names encode the role each argument plays
const transferPoints = (sourceHouse: House, targetHouse: House, points: number) => {
  sourceHouse.points -= points
  targetHouse.points += points
}

const attackingHouse = fetchHouse('slytherin')
const defendingHouse = fetchHouse('hufflepuff')
```

Now nobody can accidentally swap the arguments — the names refuse to be confused.

## Use Pronounceable, Human-Language Names

Code is read by humans far more often than it is written. If you cannot say a name out loud in a code review without spelling it letter by letter, it is too compressed. Vowel-dropping and cryptic abbreviations save a few keystrokes and cost every future reader real effort.

```ts
// Bad — unpronounceable; try saying `slytStdntCnt` in a standup
type HgwrtsRcrd = {
  slytStdntCnt: number
  genYmdhms: string
  wndCoreTyp: string
}
```

```ts
// Good — reads like language
type HogwartsRecord = {
  slytherinStudentCount: number
  generationTimestamp: string
  wandCoreType: string
}
```

If a name is a real word, people can talk about it, search for it, and remember it. Abbreviate only when the abbreviation is more standard than the full form (`url`, `id`, `html`).

## Use Searchable Names

A bare number or single letter scattered through the code is impossible to grep and impossible to change safely. `7` might mean the max Quidditch players, the number of Horcruxes, or the day of the week — the reader cannot tell, and you cannot search for "the max-players 7" specifically. Give any meaningful value a named constant.

```ts
// Bad — what does 7 mean here, and how many other unrelated 7s are in the codebase?
if (team.players.length > 7) {
  throw new Error('Too many players')
}
const seekerBonus = points * 15
```

```ts
// Good — greppable, self-documenting constants
const MAX_QUIDDITCH_PLAYERS = 7 as const
const SNITCH_CAPTURE_POINTS = 150 as const

if (team.players.length > MAX_QUIDDITCH_PLAYERS) {
  throw new Error('Too many players')
}
const seekerBonus = points + SNITCH_CAPTURE_POINTS
```

The rule scales with the noise a name would create: a loop index living for two lines can be `i`, but anything with meaning across the file deserves a searchable name.

Name constants in `UPPER_SNAKE_CASE` and declare them `as const`, and let no magic number survive. This is not only for domain rules — spacing, animation durations, and layout values earn a named constant just as much. A bare `300` inside a sorting animation or a `7`-player cap tells the reader nothing; `SORTING_ANIMATION_MS` and `MAX_QUIDDITCH_PLAYERS` tell them everything.

```ts
// Bad — magic numbers scattered through layout and animation code
element.style.marginBottom = '16px'
sortingHat.animate({ duration: 300 })

// Good — every value is a named, greppable constant
const HOUSE_CARD_GAP_PX = 16 as const
const SORTING_ANIMATION_MS = 300 as const

element.style.marginBottom = `${HOUSE_CARD_GAP_PX}px`
sortingHat.animate({ duration: SORTING_ANIMATION_MS })
```

## Don't Encode Types Into Names — Let the Tooling Handle Types

TypeScript already knows the type of every identifier, and your editor shows it on hover. Encoding the type into the name (Hungarian notation, `I`-prefixed interfaces, `m_` member prefixes) is redundant noise that rots the moment the type changes but the name doesn't.

```ts
// Bad — Hungarian notation and prefix soup
type IWizard = {
  strName: string
  intHousePoints: number
  arrSpells: string[]
}

class PotionBrewer {
  private m_cauldronTemp: number = 0
}
```

```ts
// Good — the type system carries the type; the name carries the meaning
type Wizard = {
  name: string
  housePoints: number
  spells: string[]
}

class PotionBrewer {
  private cauldronTemperature = 0
}
```

Don't prefix types with `I` or `T`, and don't suffix implementations with `Impl`. A type named `Wizard` and a value named `wizard` is the idiomatic, readable pairing. For the full ruleset — `type` over `interface`, no `any`, narrow unions — defer to `skills/shared/type-safety`; it exists precisely so your names don't have to do the type system's job.

## Clarity Is King

When you must choose between a short name and a clear one, choose clear — even if it is longer. Stop making readers decode. Two conventions make names click into place:

- **Class and type names are nouns or noun phrases**: `Wizard`, `PotionBrewer`, `HouseCup`, `SpellRegistry`. Never a verb.
- **Function and method names are verbs or verb phrases**: `castSpell`, `awardPoints`, `brewPolyjuice`, `sortIntoHouse`. Never a bare noun.

```ts
// Bad — cryptic verbs, a noun masquerading as a method, unclear params
class Points {
  award(w: Wizard, n: number) {
    w.house.pts += n
  }
}
```

```ts
// Good — noun class, verb method, names that read as domain language
class HouseCup {
  awardPoints(wizard: Wizard, points: number) {
    wizard.house.points += points
  }
}
```

A reader should never have to open another file to understand what a name means. If they do, the name isn't clear enough yet.

## Booleans Read as Questions

A boolean name should read like a yes/no question the code can answer, so every place it appears sounds like plain English. Prefix booleans — variables, fields, and the functions that return them — with `is`, `has`, `should`, `can`, or `are`. Without the prefix, `enrolled` or `wand` could be a boolean, a status, or an object; with it, `isEnrolled` and `hasWand` can only be true or false.

```ts
// Bad — is `enrolled` a boolean, a date, a roster? Does `wand` hold one or ask about one?
const enrolled = student.status === 'active'
const wand = wizard.wand !== null
```

```ts
// Good — each name reads as a question with a true/false answer
const isEnrolled = student.status === 'active'
const hasWand = wizard.wand !== null
const canCastSpell = wizard.age >= 17 && wizard.hasPermission
```

Now `if (canCastSpell)` reads exactly as you'd say it aloud. A boolean that doesn't start with one of these prefixes is a prompt to rename it until it does.

## Common Mistakes

| Mistake | Fix |
| --- | --- |
| Single-letter or cryptic name (`d`, `w`, `s`) | Name the concept: `daysSinceLastQuidditchMatch`, `wizard`, `spell` |
| Name lies about the type (`spellList` is a `Map`) | Match the name to reality: `spellsById` |
| Distinguishing by number/noise (`house1`, `houseData`) | Distinguish by role: `sourceHouse`, `defendingHouse` |
| Vowel-dropped, unpronounceable (`slytStdntCnt`) | Write the words: `slytherinStudentCount` |
| Bare magic number (`7`, `150`) | Extract a searchable constant: `MAX_QUIDDITCH_PLAYERS` |
| Type encoded in name (`strName`, `IWizard`, `m_temp`) | Drop the encoding; let TypeScript type it: `name`, `Wizard` |
| Verb used as a class name / noun used as a method | Classes are nouns (`HouseCup`); methods are verbs (`awardPoints`) |
| Short-but-cryptic chosen over clear-but-longer | Clarity wins every time, even at more characters |
| Boolean not phrased as a question (`enrolled`, `wand`) | Prefix with `is`/`has`/`should`/`can`/`are`: `isEnrolled`, `hasWand` |

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
