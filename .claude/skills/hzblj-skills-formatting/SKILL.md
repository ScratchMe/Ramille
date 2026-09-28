---
name: hzblj-skills-formatting
description: >-
  Clean-code formatting — vertical ordering (stepdown/newspaper), declaring near use, team-enforced tooling. Use when ordering or formatting code. Triggers on: formatting, code order, Prettier, ESLint, vertical spacing, where to declare variables.
disable-model-invocation: true
---

# Formatting

Formatting is not decoration — it is communication. The way a file is laid out tells a reader, before they parse a single expression, what matters, what depends on what, and where to look next. A well-formatted file reads like a well-organized issue of the Daily Prophet: headline first, details below, related stories grouped together. This file covers the layout rules that carry the most weight, and where to stop arguing and let tooling decide.

For what goes *inside* the functions you're ordering, see [functions](../hzblj-skills-functions/SKILL.md); for the names that make the layout legible, [meaningful-names](../hzblj-skills-meaningful-names/SKILL.md).

## Vertical ordering — the newspaper / stepdown rule

Well-ordered code reads like a book: the logic flows from top to bottom, and a reader grasps the intent of the whole file without jumping around it. Read a file top to bottom and it should read like a newspaper: the headline at the top, then the story in decreasing altitude. Put the highest-level function first, and place each function it calls just *below* it, so the reader descends from summary into detail without ever scrolling up. This is the stepdown rule — every function is followed by the ones it calls, one level of abstraction at a time. Group related functions by purpose so a reader can skim the headlines and dive only where they need to.

```ts
// Bad — details first, headline buried; the reader scrolls up to make sense of it
const rememberPassword = (student: Student): boolean => {
  return student.house === House.Ravenclaw
}

const requiresRiddle = (door: CommonRoomDoor): boolean => {
  return door.house === House.Ravenclaw
}

const answerRiddle = (student: Student, door: CommonRoomDoor): boolean => {
  return student.wit >= door.riddleDifficulty
}

// The entry point — the one thing a reader wants first, found last
export const enterCommonRoom = (student: Student, door: CommonRoomDoor): boolean => {
  if (requiresRiddle(door)) return answerRiddle(student, door)
  return rememberPassword(student)
}
```

```ts
// Good — headline first, then each callee just below its caller (stepdown)
export const enterCommonRoom = (student: Student, door: CommonRoomDoor): boolean => {
  if (requiresRiddle(door)) return answerRiddle(student, door)
  return rememberPassword(student)
}

const requiresRiddle = (door: CommonRoomDoor): boolean => {
  return door.house === House.Ravenclaw
}

const answerRiddle = (student: Student, door: CommonRoomDoor): boolean => {
  return student.wit >= door.riddleDifficulty
}

const rememberPassword = (student: Student): boolean => {
  return student.house === House.Ravenclaw
}
```

Because these helpers are `const` arrow functions and not hoisted `function` declarations, ordering matters in one specific way. A helper invoked at **runtime** — inside a component's render, an event handler, or a callback — can safely sit *below* its caller: the module finishes evaluating before anything runs, so every `const` in the file is already assigned by the time `enterCommonRoom` is actually called. That is exactly why the stepdown layout above still reads top-to-bottom without breaking. A helper invoked during **module initialization** — called at the top level as the file loads — is the exception: it must be declared *before* the line that uses it, or it won't exist yet. Keep the newspaper ordering for runtime code, and hoist above their first use only the few helpers that run while the module loads.

## The simplest formatting rules do the most heavy lifting

You don't need an elaborate style guide to make a file readable. A handful of dumb, mechanical rules carry almost all the payoff: put a blank line between concepts, keep conceptually related lines tight together, keep lines short, and keep vertical density low. Blank lines are punctuation — each one says "new thought". Lines that belong together should sit together with no gap; lines that don't should be separated by exactly one. The goal is a file that stays visually scannable: logical blank-line spacing between logical blocks lets the eye find each section at a glance.

```tsx
// Bad — one dense wall; no vertical punctuation, unrelated things touching
export const QuidditchScoreboard = ({ match }: { match: QuidditchMatch }) => {
  const gryffindorScore = match.gryffindorGoals * GOAL_POINTS
  const slytherinScore = match.slytherinGoals * GOAL_POINTS
  const snitchWinner = match.snitchCaughtBy
  const gryffindorTotal = gryffindorScore + (snitchWinner === House.Gryffindor ? SNITCH_POINTS : 0)
  const slytherinTotal = slytherinScore + (snitchWinner === House.Slytherin ? SNITCH_POINTS : 0)
  return <ScoreRow left={gryffindorTotal} right={slytherinTotal} />
}
```

```tsx
// Good — blank lines separate concepts; related lines stay together
export const QuidditchScoreboard = ({ match }: { match: QuidditchMatch }) => {
  const gryffindorGoalScore = match.gryffindorGoals * GOAL_POINTS
  const slytherinGoalScore = match.slytherinGoals * GOAL_POINTS

  const snitchWinner = match.snitchCaughtBy
  const gryffindorTotal = gryffindorGoalScore + snitchBonus(snitchWinner, House.Gryffindor)
  const slytherinTotal = slytherinGoalScore + snitchBonus(snitchWinner, House.Slytherin)

  return <ScoreRow left={gryffindorTotal} right={slytherinTotal} />
}
```

| Rule | Why it pays off |
| --- | --- |
| Blank line between concepts | Each gap reads as "new thought"; the eye chunks the file automatically |
| Related lines kept adjacent | Proximity signals relationship faster than any comment |
| Short lines | No horizontal scrolling; the whole expression is visible at a glance |
| Low vertical density | Fewer lines to hold in your head per idea |

## Declare variables close to their usage; group class properties in one place; let the team decide the rest

Declare a local right before it's first used, not at the top of the function — the reader shouldn't have to remember a value across twenty lines before it matters. For classes, do the opposite: declare all instance properties together in one place, so the shape of the object is visible at a glance. And for everything genuinely subjective — quotes, semicolons, indentation, import order — stop arguing. Formatting is a *team* decision, encoded once in Prettier/ESLint and enforced automatically, so it never surfaces in review again.

```ts
// Bad — locals declared far from use; property scattered through the class
class PotionMaster {
  cauldron: Cauldron
  brew(recipe: Recipe): Potion {
    const ingredients = recipe.ingredients
    const simmerTime = recipe.simmerMinutes
    const bottleCount = recipe.yield

    // ...forty lines of unrelated setup...

    this.cauldron.simmer(simmerTime)
    return this.cauldron.bottle(bottleCount)
  }
  inventory: Ingredient[] // property hiding below a method
}
```

```ts
// Good — properties grouped up top; each local declared right where it's used
class PotionMaster {
  cauldron: Cauldron
  inventory: Ingredient[]

  brew(recipe: Recipe): Potion {
    // ...unrelated setup that doesn't need these values yet...

    const simmerTime = recipe.simmerMinutes
    this.cauldron.simmer(simmerTime)

    const bottleCount = recipe.yield
    return this.cauldron.bottle(bottleCount)
  }
}
```

```jsonc
// Good — the subjective stuff is decided once, by tooling, and never debated again
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

Automated formatters turn most of this section into a non-argument: run Prettier on save and let ESLint fail the build on drift. The only rules worth discussing in review are the ones a formatter *can't* enforce — vertical ordering and conceptual grouping above. Everything else, the machine handles.

## Conditional classNames — always use `cn()`

Class names that switch on state are their own little formatting hazard. Always compose conditional or dynamic class names with a `cn()` helper — never with template literals or string concatenation, which drift into stray spaces, empty strings, and unreadable interpolation. Keep each condition flat: no nested ternaries inside `cn()`.

```tsx
// Good
className={cn('spell-card', isActive && 'spell-card--active')}
// Bad
className={`spell-card ${isActive ? 'spell-card--active' : ''}`}
```

`cn()` reads as a plain list of classes and the conditions that gate them; the template-literal version buries the same logic inside string surgery. That's the formatting rule; for `cn()` with Tailwind — class-conflict merging via twMerge, and variants with `tv()` — see [tailwind](../hzblj-skills-tailwind/SKILL.md).

## Common Mistakes

| Mistake | Fix |
| --- | --- |
| Callees defined above their callers | Apply the stepdown rule — caller first, callee just below |
| Entry point buried at the bottom of the file | Put the highest-level function first, like a headline |
| One dense wall of code, no blank lines | Add a blank line between each distinct concept |
| Blank lines splitting closely related lines | Keep related lines adjacent; separate only different thoughts |
| Locals declared at the top, used far below | Declare each local right before its first use |
| Class properties scattered among methods | Group all instance properties together in one place |
| Debating quotes/semicolons/indent in review | Encode it in Prettier/ESLint; enforce in CI, stop arguing |
| Personal formatting preferences per file | Formatting is a team decision, applied uniformly by tooling |
| Conditional class names via template literal / concatenation | Compose with `cn()`; no nested ternaries inside it |

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
