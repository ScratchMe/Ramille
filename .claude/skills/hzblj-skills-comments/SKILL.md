---
name: hzblj-skills-comments
description: >-
  Clean-code comments — explain why not how, delete redundant and dead comments, prefer self-explaining code. Use when writing or reviewing comments and docs. Triggers on: comment, commented-out code, TODO, TSDoc, why not how, dead code.
disable-model-invocation: true
---

# Comments

The best comment is the code that made it unnecessary. Every comment is a small admission that the code could not speak for itself — sometimes justified, usually not. Before you write one, try to delete the need for it: rename the variable, extract the function, name the constant. When a comment survives that test, keep it and make it excellent. When it doesn't, the code is the comment.

This file is about the comments that earn their place and the ones that rot. For the naming and extraction techniques that dissolve most comments before they're written, see [meaningful-names](../hzblj-skills-meaningful-names/SKILL.md) and [functions](../hzblj-skills-functions/SKILL.md).

## Comments go stale

Code is executed; comments are not. The compiler checks the code and ignores the prose, so when the spell changes and the comment doesn't, the comment quietly becomes a lie. A stale comment is worse than no comment — a missing comment sends you to read the code, but a wrong one sends you the wrong way with full confidence. Prefer code that cannot drift out of sync with itself.

```ts
// Bad — the comment says 3, the code says 5; which one is the rule?
// A wizard may hold at most 3 active spells at once.
const MAX_ACTIVE_SPELLS = 5

const canCastSpell = (wizard: Wizard): boolean => {
  return wizard.activeSpells.length < MAX_ACTIVE_SPELLS
}
```

```ts
// Good — the constant name carries the rule; nothing can drift
const MAX_ACTIVE_SPELLS_PER_WIZARD = 5

const canCastAnotherSpell = (wizard: Wizard): boolean => {
  return wizard.activeSpells.length < MAX_ACTIVE_SPELLS_PER_WIZARD
}
```

## Explain WHY, not HOW

The code already tells you *how* — that is its whole job. A comment that narrates the mechanics just duplicates the code in a second language that no compiler checks. Spend comments on the *why*: the intent, the business reason, the non-obvious constraint. Those are the things the code genuinely cannot express.

```ts
// Bad — narrates the "how" the reader can already see
// Loop over the students and add 10 points to each one's house.
students.forEach((student) => {
  awardPoints(student.house, 10)
})
```

```ts
// Good — explains the "why", which the code cannot show
// The Ministry's Decree No. 24 requires every attending student to earn
// the base participation points before the Sorting feast results are sealed.
students.forEach((student) => {
  awardPoints(student.house, PARTICIPATION_POINTS)
})
```

## Good comments protect from well-meaning mistakes

Some comments are guardrails. They exist to stop a future developer — often a competent, well-intentioned one — from "cleaning up" something that must stay exactly as it is. When correctness depends on an order, a delay, or a workaround that looks wrong, say so, or someone will helpfully break it.

```ts
// Bad — no warning; the next reader "tidies" the order and ruins the potion
const brewPolyjuice = (cauldron: Cauldron): Potion => {
  cauldron.add(LACEWING_FLIES)
  cauldron.add(LEECHES)
  cauldron.simmer(SIMMER_MINUTES)
  cauldron.add(POWDERED_BICORN_HORN)
  return cauldron.bottle()
}
```

```ts
// Good — the warning defends the invariant
const brewPolyjuice = (cauldron: Cauldron): Potion => {
  cauldron.add(LACEWING_FLIES)
  cauldron.add(LEECHES)

  // Do NOT reorder: the bicorn horn must go in only AFTER the full simmer,
  // or the potion turns to sludge (see Moste Potente Potions, p.87).
  cauldron.simmer(SIMMER_MINUTES)
  cauldron.add(POWDERED_BICORN_HORN)

  return cauldron.bottle()
}
```

## Code vs docs

Your team reads the code; the world reads the docs. That difference decides where a comment belongs. A published package surface — anything another team or the public imports — deserves real doc comments (TSDoc) that describe the contract without forcing readers into the implementation. Internals, which only your team touches, rarely do: the code is right there.

```ts
// Good — public API of a shared package; TSDoc documents the contract
/**
 * Casts a spell on a target and returns the resulting effect.
 *
 * @param spell - The incantation to cast. Must be a known, non-Unforgivable spell.
 * @param target - The wizard or creature the spell is aimed at.
 * @returns The applied {@link SpellEffect}.
 * @throws {ForbiddenSpellError} If the spell is an Unforgivable Curse.
 */
export const castSpell = (spell: Spell, target: Target): SpellEffect => {
  // ...
}
```

```ts
// Bad — TSDoc ceremony on a private helper no one imports; pure clutter
/**
 * Adds points.
 * @param house the house
 * @param points the points
 */
const addPoints = (house: House, points: number): void => {
  house.points += points
}
```

## Redundant comments are noise

If the code already says it, the comment says it twice — and now there are two things to keep in sync instead of one. Redundant comments add reading cost, add rot risk, and pay nothing back. Delete them and let the identifier do the talking.

```ts
// Bad — every line restates the obvious
class Wizard {
  // The name of the wizard
  name: string
  // The house of the wizard
  house: House

  // Constructor
  constructor(name: string, house: House) {
    this.name = name // set the name
    this.house = house // set the house
  }
}
```

```ts
// Good — the names already say all of that
class Wizard {
  constructor(
    public name: string,
    public house: House,
  ) {}
}
```

## No commented-out code, changelogs, attributions, or author tags — git handles all of it

Delete dead code. Do not comment it out "in case we need it" — you won't, and if you do, `git log` remembers every line you ever wrote. The same goes for in-file changelogs, `@author` tags, and "modified by" attributions: version control already records who changed what and when, with more accuracy than any comment. These artifacts only accumulate and mislead.

```ts
// Bad — a graveyard of dead code and bookkeeping git already tracks
/*
 * Changelog:
 * 2024-01-04 - Minerva: added quidditch scoring
 * 2024-03-11 - Severus: fixed snitch bonus
 * @author Minerva McGonagall
 */
const scoreQuidditchMatch = (match: QuidditchMatch): number => {
  // const oldScore = match.goals * 5 // old scoring, keep just in case
  // return oldScore
  return match.goals * GOAL_POINTS + (match.snitchCaught ? SNITCH_POINTS : 0)
}
```

```ts
// Good — just the living code; git holds the history and the authors
const scoreQuidditchMatch = (match: QuidditchMatch): number => {
  return match.goals * GOAL_POINTS + (match.snitchCaught ? SNITCH_POINTS : 0)
}
```

## No apology / structural-excuse comments

When a comment apologizes for the code — "sorry, this is messy", "I know this is a hack", "temporary, will fix" — it is pointing at a problem and then walking away. The apology does nothing; the fix does everything. If the structure is bad enough to warrant an excuse, it is bad enough to restructure. Fix the thing, don't annotate the guilt.

```tsx
// Bad — the comment confesses; the mess stays
export const SortingHat = ({ student }: { student: Student }) => {
  // HACK: sorry, this is a horrible nested mess, no time to clean up right now
  return student ? (student.bloodStatus ? (student.bravery > 8 ? <House name="Gryffindor" /> : (student.ambition > 8 ? <House name="Slytherin" /> : <House name="Hufflepuff" />)) : <House name="Muggleborn" />) : null
}
```

```tsx
// Good — the structure is fixed, so there is nothing to apologize for
export const SortingHat = ({ student }: { student: Student | null }) => {
  if (!student) return null

  const house = decideHouse(student)
  return <House name={house} />
}
```

## Comments must communicate instantly

A comment has one job: transfer understanding faster than the code alone. If a teammate has to stop and decode the comment itself, it has failed — a confusing comment is just another puzzle stacked on top of the puzzle. If it can't be read instantly, rewrite it until it can, or delete it.

```ts
// Bad — cryptic; the reader now has two mysteries
// adj. f. per QDR-tbl (see wiki, the 2nd one) unless snitch=0
const total = adjustFactor(base, table, snitchCount)
```

```ts
// Good — one clear sentence, no decoding required
// House points are scaled by the Quidditch difficulty rating, but only
// when the Snitch was actually caught this match.
const total = adjustFactor(base, table, snitchCount)
```

## Prefer self-explaining code over comments

This is where most comments go to die: the ones explaining *what the code does*. Nearly all of them can be replaced by a better name or a small extraction. Rename the variable, pull the condition into a well-named function, promote the magic number to a named constant — then the explanation lives in the code, where it cannot drift and cannot be skipped. See [meaningful-names](../hzblj-skills-meaningful-names/SKILL.md) for the naming moves and [functions](../hzblj-skills-functions/SKILL.md) for extraction.

```ts
// Bad — a comment props up code that could just say it itself
// Check if the wizard is an of-age student allowed to enter Hogsmeade
if (wizard.age >= 17 && wizard.year >= 3 && wizard.hasSignedPermission) {
  admitToHogsmeade(wizard)
}
```

```ts
// Good — the comment became a function name
const canVisitHogsmeade = (wizard: Wizard): boolean => {
  return wizard.age >= AGE_OF_MAJORITY && wizard.year >= MIN_HOGSMEADE_YEAR && wizard.hasSignedPermission
}

if (canVisitHogsmeade(wizard)) {
  admitToHogsmeade(wizard)
}
```

## When a comment IS worth it vs. when it is NOT

| A comment IS worth it | A comment is NOT worth it |
| --- | --- |
| Explains *why* — intent, business reason, a Ministry constraint | Restates *what* the code plainly does |
| Warns against a change that would break correctness (potion step order) | Apologizes for structure you could fix instead |
| Documents a public/published API contract (TSDoc) | Documents a private internal helper no one imports |
| Flags a genuine, non-obvious workaround with a reason/link | Preserves commented-out "just in case" code |
| Clarifies a legitimately surprising edge case | Records changelog, `@author`, or "modified by" notes |
| Reads instantly and stays true to the code | Needs decoding, or has already drifted from the code |

## Common Mistakes

| Mistake | Fix |
| --- | --- |
| Comment contradicts the code (stale) | Delete it; encode the rule in a name or constant |
| Comment narrates *how* | Rewrite to explain *why*, or delete it |
| No warning on order-dependent / fragile code | Add a guardrail comment stating the invariant |
| TSDoc ceremony on private internals | Reserve doc comments for the published surface |
| Comment repeats what the identifier says | Delete the comment; trust the name |
| Commented-out code left "just in case" | Delete it — `git log` is the safety net |
| In-file changelog / `@author` / "modified by" | Delete it — version control tracks history and authorship |
| "Sorry, this is messy" apology comment | Fix the structure; remove the apology |
| Cryptic comment that needs its own decoding | Rewrite as one plain sentence, or delete |
| Comment explaining *what* the code does | Rename / extract so the code explains itself ([meaningful-names](../hzblj-skills-meaningful-names/SKILL.md), [functions](../hzblj-skills-functions/SKILL.md)) |

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
