---
description: Plan a task, then delegate across the tiered agents (deep-reasoner, domain builders, fast-worker) and synthesize the results
argument-hint: <task>
disable-model-invocation: true
---

Deliver **`$ARGUMENTS`** by orchestrating the tiered agents, following the `orchestration` skill.

You are the orchestrator. Your context stays lean: you plan, delegate, and synthesize — you do **not** read the whole codebase or write bulk code yourself. Every subagent runs in its own context window and hands back a compact result, so keep the heavy token work off your own context.

## Flow

1. **Scout, don't excavate.** Read only enough to write the plan — CLAUDE.md, the entry point, the relevant package's `index.ts`. Delegate any deep exploration.
2. **Plan and present.** Decompose the task into steps, map each step to a tier (table below), and show the plan before executing. Wait for a go-ahead on anything destructive or wide-reaching.
3. **Delegate.** Route each step to the most appropriate agent. Fan out independent steps in parallel — spawn several agents in a single turn rather than one at a time.
4. **Synthesize and verify.** Stitch the results together, resolve conflicts at the package boundaries, and confirm the result builds/typechecks. Report honestly what passed, failed, or was skipped.

## Routing

| Step is… | Delegate to |
| --- | --- |
| Architecture, package boundaries, hard type gymnastics, a heisenbug, algorithm design | `deep-reasoner` |
| A Next.js / React page, component, or flow | `web-developer` |
| A React Native / Expo screen, component, gesture, or flow | `mobile-developer` |
| Scaffolding or auditing a `core-*` / `feature-*` / `platform-*` package | `monorepo-architect` |
| GSAP / Reanimated / Skia motion where the animation is the hard part | `animation-specialist` |
| A behavior-preserving cleanup to the clean-code + type-safety standards | `code-refactorer` |
| A read-only review before merge | `clean-code-reviewer` |
| Boilerplate, test skeletons, formatting, import fixes, barrel files, renames | `fast-worker` |

Typical shape: `deep-reasoner` decides → a domain builder or `monorepo-architect` implements → `fast-worker` fills in the boilerplate → `clean-code-reviewer` checks it.

## Orchestrator model

Set your session model to **Opus 4.8** (`/model opus`) — top-tier planning and long-horizon coherence at half of Fable 5's price. Step up to Fable 5 only for the hardest long-horizon runs. The bulk-token work lives in the subagents, so the orchestrator model is a small share of the total spend.

See the `orchestration` skill for the full doctrine, the tier table, and the cost model.

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
