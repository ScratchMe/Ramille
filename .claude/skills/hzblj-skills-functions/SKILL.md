---
name: hzblj-skills-functions
description: >-
  Clean-code functions — small, do one thing, one abstraction level, few arguments, no side effects, command-query separation, plus DRY and refactor discipline. Use when writing or reviewing functions. Triggers on: function too long, do one thing, too many arguments, side effects, command query, DRY, extract function, refactor.
disable-model-invocation: true
---

# Functions

Functions are the verbs of your system. The best ones are small, do exactly one thing, and read top-to-bottom like a story where each line hands off to the next. This file covers size, single responsibility, abstraction levels, arguments, side effects, and command-query separation.

Good functions lean hard on good names — see [meaningful-names](../hzblj-skills-meaningful-names/SKILL.md) first. For how functions should signal failure, see [error-handling](../hzblj-skills-error-handling/SKILL.md).

## Quick Reference

| Principle | Smell | Fix |
| --- | --- | --- |
| Small functions | 80-line function | Extract named helpers |
| Do one thing | Comment-labeled sections | One function per section |
| One abstraction level | Policy mixed with byte-twiddling | Push detail down a level |
| Guard clauses / early returns | Deeply nested happy path | Return early on edge cases; keep happy path flat |
| No clever code | Nested ternary / dense one-liner | Plain, predictable code; name the intermediates |
| Bury the switch | `switch` in a caller | Lookup map / factory / polymorphism |
| Low argument count | 4+ params | Group into an object |
| Monadic forms | Flag arguments | Question, transform, or event only |
| Group related args | `x, y` passed everywhere | `Point`, `SpellCast` object |
| No hidden side effects | `check*` that also mutates | Make the effect explicit |
| Command-Query Separation | Function returns AND mutates | Split into a command and a query |

## Small Functions — Extract Relentlessly

A large function buries the business logic under low-level detail. The single most effective refactoring you can perform is to pull each coherent chunk into a well-named helper. The names of the extracted functions become the documentation, and the parent function becomes a table of contents.

```ts
// Bad — one function doing enrollment, sorting, and welcome all at once
const enrollStudent = (student: Student, hat: SortingHat) => {
  if (!student.name || student.age < 11) {
    throw new Error('Invalid student')
  }

  let house: House
  const traits = student.traits
  if (traits.includes('brave')) house = houses.gryffindor
  else if (traits.includes('cunning')) house = houses.slytherin
  else if (traits.includes('wise')) house = houses.ravenclaw
  else house = houses.hufflepuff

  house.members.push(student)
  student.house = house

  owlPost.send(student, `Welcome to ${house.name}!`)
  house.points += 5
}
```

```ts
// Good — each step is a named helper; the parent reads like a summary
const enrollStudent = (student: Student, hat: SortingHat) => {
  assertEligible(student)
  const house = hat.sortIntoHouse(student)
  addToHouse(student, house)
  sendWelcomeOwl(student, house)
}
```

Now `enrollStudent` documents itself, and each helper (`assertEligible`, `sortIntoHouse`, `addToHouse`, `sendWelcomeOwl`) can be read, tested, and reused on its own.

## Do One Thing — Tell a Story

A function should do one thing, do it well, and do it only. The clearest test: if you find yourself writing comments that label *sections* — `// initialization`, `// validation`, `// main logic` — each of those sections is a separate thing, and each wants to be its own function. A function that does one thing leads the reader naturally to the next step.

```ts
// Bad — the section comments are a confession that this does three things
const processHousePoints = (house: House) => {
  // validate
  if (house.points < 0) house.points = 0

  // calculate bonus
  const bonus = house.wins * 10 + house.detentions * -5

  // persist and notify
  house.points += bonus
  db.save(house)
  greatHall.updateHourglass(house)
}
```

```ts
// Good — one thing per function; the story reads in order
const processHousePoints = (house: House) => {
  normalizePoints(house)
  applyBonus(house, calculateBonus(house))
  recordAndDisplay(house)
}
```

If every function does one thing, you can describe it in a single sentence with no "and". `processHousePoints` no longer needs comments — the helper names tell the story.

## One Level of Abstraction Per Function

Within a single function, don't mix high-level policy ("award the house cup") with low-level mechanics (string concatenation, array index math). Jumping abstraction levels forces the reader to constantly change altitude and obscures what the function is really about.

```ts
// Bad — high-level "announce winner" sits next to low-level string building
const announceHouseCupWinner = (houses: House[]) => {
  const winner = houses.sort((a, b) => b.points - a.points)[0]

  let banner = ''
  for (let i = 0; i < winner.name.length; i++) {
    banner += winner.name[i].toUpperCase()
  }
  banner = '🏆 ' + banner + ' 🏆'

  greatHall.display(banner)
}
```

```ts
// Good — every line in the parent is the same altitude
const announceHouseCupWinner = (houses: House[]) => {
  const winner = findLeadingHouse(houses)
  const banner = formatWinnerBanner(winner)
  greatHall.display(banner)
}

const formatWinnerBanner = (house: House): string => {
  return `🏆 ${house.name.toUpperCase()} 🏆`
}
```

Read top-down, the good version stays at the "what happens" level. The "how" (uppercasing, decorating) is pushed down into `formatWinnerBanner`, one level lower, where it belongs.

## Guard Clauses & Early Returns

Handle the edge cases first and bail out early, so the happy path falls through to the bottom of the function un-nested. Deep nesting buries the main logic inside a pyramid of braces; a stack of early returns flattens it into a checklist the reader can scan straight down.

```ts
// Bad — the real work is buried at the bottom of a happy-path pyramid
const enterRestrictedSection = (student: Student): void => {
  if (student.hasPermissionSlip) {
    if (student.isAccompaniedByTeacher) {
      if (!library.isClosed()) {
        grantAccess(student)
      } else {
        throw new Error('The library is closed')
      }
    } else {
      throw new Error('A teacher must accompany you')
    }
  } else {
    throw new Error('You need a signed permission slip')
  }
}
```

```ts
// Good — each edge case is turned away at the door; the happy path is last and flat
const enterRestrictedSection = (student: Student): void => {
  if (!student.hasPermissionSlip) throw new Error('You need a signed permission slip')
  if (!student.isAccompaniedByTeacher) throw new Error('A teacher must accompany you')
  if (library.isClosed()) throw new Error('The library is closed')

  grantAccess(student)
}
```

Read the good version top to bottom and it lists the three conditions that block entry, then does the one thing it exists for. No `else`, no pyramid, no hunting for the line that matters.

## No Clever Code

Readability beats cleverness, and it beats brevity too. Code is read far more often than it is written, so optimize for the next wizard's comprehension, not for the fewest lines or the most impressive one-liner. Don't compress logic to save space, don't nest ternaries, and don't pack a complex expression inline where a named intermediate would explain it. Predictability beats abstraction: the boring version everyone understands at a glance wins.

```ts
// Bad — a nested ternary crammed into one dense, unreadable expression
const houseColor = (house: House): string =>
  house.name === 'Gryffindor' ? '#740001' : house.name === 'Slytherin' ? '#1a472a' : house.name === 'Ravenclaw' ? '#0e1a40' : '#ecb939'
```

```ts
// Good — a plain lookup anyone can read and extend
const HOUSE_COLORS: Record<HouseName, string> = {
  Gryffindor: '#740001',
  Slytherin: '#1a472a',
  Ravenclaw: '#0e1a40',
  Hufflepuff: '#ecb939',
}

const houseColor = (house: House): string => HOUSE_COLORS[house.name]
```

If a teammate has to pause and decode a line, the cleverness has already cost more than it saved. Write the version they read once and move on.

## Bury the Switch

A `switch` statement — or a long `if-else` chain — does N things by definition, so it violates "do one thing" wherever it sits in the open. Keep callers clean by pushing the switch *down*, behind a lookup map, a factory, or polymorphism. The high-level code then never sees the branching.

```ts
// Bad — every caller that needs damage repeats this switch
const calculateSpellDamage = (spell: Spell): number => {
  switch (spell.type) {
    case 'stunning':
      return 20
    case 'disarming':
      return 10
    case 'killing':
      return 100
    case 'tickling':
      return 0
    default:
      return 5
  }
}
```

```ts
// Good — the branching is buried in a lookup map; callers just read the value
const SPELL_DAMAGE: Record<SpellType, number> = {
  stunning: 20,
  disarming: 10,
  killing: 100,
  tickling: 0,
}

const calculateSpellDamage = (spell: Spell): number => {
  return SPELL_DAMAGE[spell.type] ?? DEFAULT_SPELL_DAMAGE
}
```

For behavior that varies by type (not just a value), reach for polymorphism instead — give each `House` a `commonRoomEntrance()` method rather than switching on `house.name` in the caller. The switch may still exist once, in a factory that builds the right object; it just never leaks into the high-level logic.

## Keep the Argument Count Low

Every argument is something the reader must hold in their head and something a caller can get wrong. Zero arguments is ideal, one or two are fine, three is a smell worth questioning, and four or more almost always means a concept is hiding in the parameter list.

```ts
// Bad — six positional arguments; callers guess the order and swap them
const castSpell = (
  wizardName: string,
  wandCore: string,
  spellName: string,
  targetName: string,
  power: number,
  isNonVerbal: boolean,
) => {
  // ...
}

castSpell('Harry', 'phoenix', 'expelliarmus', 'Draco', 80, false)
```

```ts
// Good — the arguments that travel together become objects
const castSpell = (caster: Wizard, spell: Spell, target: Wizard) => {
  // ...
}

castSpell(harry, expelliarmus, draco)
```

Fewer arguments mean less to remember and fewer ways to call the function wrong. When the list grows, that is the design telling you to introduce a type — see grouping below.

## Reasons a Function Takes a Single Argument

A one-argument (monadic) function is easy to understand *when its single argument fits one of three natural forms*. If your monadic function does none of these, look again — it may be doing something surprising.

- **Ask a question about the argument** — returns a boolean answer about it.
- **Transform the argument** — operates on it and returns a *new* value (never the same argument mutated).
- **Handle an event** — the argument is the event, and the function changes system state in response. These are rarer; name them so the event handling is obvious.

```ts
// Good — 1. asking a question about the argument
const isPureblood = (wizard: Wizard): boolean => {
  return wizard.lineage === 'pureblood'
}

// Good — 2. transforming the argument into a new value
const toPatronusForm = (wizard: Wizard): Patronus => {
  return summonPatronus(wizard.happiestMemory)
}

// Good — 3. handling an event (state changes in response)
const onSnitchCaught = (match: QuidditchMatch): void => {
  match.end()
  awardPoints(match.seekerHouse, SNITCH_CAPTURE_POINTS)
}
```

```ts
// Bad — monadic but none of the three forms: it neither asks, transforms, nor
// clearly handles an event. The boolean output flag is the giveaway.
const processWizard = (wizard: Wizard): boolean => {
  wizard.spells.push(defaultSpell) // mutates
  return wizard.spells.length > 0 // and answers — pick one
}
```

## Group Related Arguments Into Objects — Watch Pairs and Triads

When the same arguments keep travelling together, they are announcing that they form a concept. Wrap them in a well-named object. Coordinates `x, y` want to be a `Point`; a `wizard`, `house`, and `points` that always move as a set want to be a `PointsAward`. But not every pair belongs together — naming the wrapper is the test. If you can name the object honestly, the grouping is real; if the name feels forced, keep the arguments separate.

```ts
// Bad — x and y always appear as a pair; so do the award fields
const plotOnMap = (x: number, y: number) => {}
const awardPoints = (wizard: Wizard, house: House, points: number) => {}

plotOnMap(hogsmeade.x, hogsmeade.y)
```

```ts
// Good — the pair and the triad each become a named concept
type Point = { x: number; y: number }
type PointsAward = { wizard: Wizard; house: House; points: number }

const plotOnMap = (location: Point) => {}
const awardPoints = (award: PointsAward) => {}

plotOnMap(hogsmeade)
```

Objects also make the call site self-documenting: `awardPoints({ wizard: harry, house: gryffindor, points: 10 })` reads far better than three bare positional values. See [meaningful-names](../hzblj-skills-meaningful-names/SKILL.md) for naming the wrapper type well.

## No Hidden Side Effects

A side effect is anything a function does *outside its own scope* that its name doesn't advertise: mutating a passed-in object, writing to a module-level variable, hitting the database, sending an owl. Hidden side effects are lies — they create temporal couplings and bugs that only appear when someone calls the function "just to check something". Make every effect explicit in the name.

```ts
// Bad — named to CHECK, but it also unlocks the common room. A silent mutation.
const checkPassword = (house: House, attempt: string): boolean => {
  if (house.password === attempt) {
    house.commonRoomLocked = false // hidden side effect!
    return true
  }
  return false
}
```

```ts
// Good — the query only queries; unlocking is a separate, explicitly-named command
const isPasswordCorrect = (house: House, attempt: string): boolean => {
  return house.password === attempt
}

const unlockCommonRoom = (house: House): void => {
  house.commonRoomLocked = false
}
```

If a function must have an effect, put it in the name (`unlockCommonRoom`, `sendWelcomeOwl`, `saveHouse`) so no one is surprised. A function whose name promises to *check* or *get* something must never *also* change the world.

## Command-Query Separation

A function should either **do** something or **answer** something — never both. A command changes state and returns `void`; a query returns a value and changes nothing. When one function does both, callers can't tell whether calling it is safe, and `if (setAndCheck(x))` becomes an unreadable riddle.

```ts
// Bad — does it SET the seeker, or ASK whether one exists? Both, confusingly.
const setSeeker = (team: QuidditchTeam, wizard: Wizard): boolean => {
  if (team.seeker) return false
  team.seeker = wizard
  return true
}

if (setSeeker(gryffindorTeam, harry)) {
  // reader can't tell this branch is "the assignment succeeded"
}
```

```ts
// Good — a query to ask, a command to do
const hasSeeker = (team: QuidditchTeam): boolean => {
  return team.seeker !== null
}

const assignSeeker = (team: QuidditchTeam, wizard: Wizard): void => {
  team.seeker = wizard
}

if (!hasSeeker(gryffindorTeam)) {
  assignSeeker(gryffindorTeam, harry)
}
```

The good version reads as plain intent: "if the team has no seeker, assign Harry." Ask first, then act.

## DRY — one source of truth

> Every piece of knowledge must have a single, unambiguous, authoritative
> representation within a system.

Duplicated logic drifts: fix a bug in one copy, miss the other. Extract the shared
knowledge into one well-named place. Beware *false* DRY too — two snippets that
look alike but represent different decisions should stay separate; coupling them
hurts more than the duplication.

```ts
// Bad — the same house-points rule copied in two places; they will drift
const awardForSnitch = (house: House) => { house.points += 150 }
const awardForGoal = (house: House) => { house.points += 10 }
// ...and elsewhere a third copy re-implements the cap check

// Good — one authoritative operation owns the rule
const awardPoints = (house: House, amount: number) => {
  house.points = Math.min(house.points + amount, HOUSE_POINT_CAP)
}
```

## Leave it cleaner than you found it

Your first draft is allowed to be messy — just don't *leave* it that way. Refactor
before you move on (the Boy Scout Rule: always check in code a little cleaner than
you checked it out). A messy draft is a step; shipped mess is a debt.

## Common Mistakes

| Mistake | Fix |
| --- | --- |
| Long function burying the business logic | Extract each chunk into a named helper |
| Section comments (`// validation`, `// logic`) | Each labeled section becomes its own function |
| Policy mixed with low-level detail | Keep one level of abstraction; push detail down |
| Deeply nested happy path behind `if`/`else` pyramids | Guard clauses: handle edge cases with early returns, keep the happy path flat |
| Clever one-liners, nested ternaries, dense inline expressions | Favor readable, predictable code; extract named intermediates |
| `switch` / long `if-else` in the caller | Bury it behind a lookup map, factory, or polymorphism |
| Four or more positional arguments | Group the ones that travel together into an object |
| Boolean flag argument | Split into two functions, or use the right monadic form |
| Recurring `x, y` / repeated arg triad | Wrap in a named type (`Point`, `PointsAward`) |
| `check*`/`get*` that secretly mutates | Make the effect explicit in a separately-named command |
| One function that both returns and mutates | Command-Query Separation: split query from command |

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
