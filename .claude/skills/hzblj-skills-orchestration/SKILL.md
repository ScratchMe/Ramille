---
name: hzblj-skills-orchestration
description: >-
  Tiered multi-agent orchestration — an expensive model plans and synthesizes while specialized subagents do the work in their own isolated contexts. Covers the agent tiers, routing rules, why context isolation saves tokens, parallel fan-out, and the cost model. Use when a task spans multiple files or steps, or when deciding which agent should do what. Triggers on: orchestrate, delegate, subagent, multi-agent, which agent, model tier, deep-reasoner, fast-worker, token budget, context isolation, plan and delegate, cost.
disable-model-invocation: true
---

# Orchestration

One expensive model **plans and synthesizes**; specialized subagents **do the work**, each in its own context window. The orchestrator never reads the whole codebase or writes bulk code — it decomposes the task, routes each part to the right agent, and stitches the results back together.

This isn't a bespoke framework. It's how Claude Code already works: the `Agent` tool spawns subagents, and each agent's `model:` frontmatter picks its tier. This skill is the doctrine for using that well in this repo.

## Why it saves — the real mechanism

Two effects, and neither is "a cheaper model runs the show":

1. **Context isolation.** A subagent reads files and burns tool-output tokens in *its own* context, then returns a compact summary. The orchestrator's context never fills up with raw file contents, so it stays cheap per turn and coherent across a long task.
2. **Tier arbitrage.** The expensive orchestrator generates few tokens (a plan, a synthesis). The high-volume generation — code, tests, boilerplate — happens on whatever tier that work actually needs, and mechanical work drops to the cheapest tier.

The savings come from *where the tokens are spent*, not from downgrading the thinking. Don't expect a fixed multiplier — the gain scales with how much reading and mechanical volume the task involves.

## The tiers

| Tier | Who | Model | Job |
| --- | --- | --- | --- |
| **Orchestrator** | your session (`/model`) | Opus 4.8 | plan, decompose, delegate, synthesize — stays lean |
| **Deep reasoning** | `deep-reasoner` | Fable | architecture, boundaries, hard types, heisenbugs, algorithms |
| **Domain build** | `web-developer`, `mobile-developer`, `monorepo-architect`, `animation-specialist`, `code-refactorer` | Opus | build features / screens / components; scaffold packages; motion; behavior-preserving refactors |
| **Review** | `clean-code-reviewer` | Opus | read-only review against the repo standards |
| **Mechanical** | `fast-worker` | Haiku | boilerplate, test skeletons, formatting, imports, barrels, renames |

`deep-reasoner` sits on Fable — the most capable model — because the hardest calls (architecture, boundaries, root-cause) are worth it and produce few tokens. Build and review sit on Opus by choice — code quality on the real deliverable is worth a top-tier model. So the savings here lean on context isolation plus offloading mechanical volume to Haiku, rather than on cheapening the build.

## Cost model

Per 1M tokens (input / output):

| Model | Input | Output | Relative output cost |
| --- | --- | --- | --- |
| Fable 5 | $10 | $50 | 10× Haiku |
| Opus 4.8 | $5 | $25 | 5× Haiku |
| Sonnet 5 | $3 | $15 | 3× Haiku |
| Haiku 4.5 | $1 | $5 | 1× |

The lever is **output volume × rate**. Keep the orchestrator's output small (plan + synthesis), let Opus generate the code that matters, and push the boilerplate to Haiku where a barrel-file sweep costs a tenth of what it would on Fable.

## How to orchestrate

1. **Scout, don't excavate.** Read only enough to plan — CLAUDE.md, the entry point, the relevant package's `index.ts`. Hand deep exploration to a subagent.
2. **Plan and present.** Map each step to a tier and show the plan before executing. Wait for a go-ahead on anything destructive or wide-reaching.
3. **Delegate to the right tier.** Route by the table above.
4. **Fan out.** Spawn independent steps in parallel — several agents in one turn — rather than serially. A screen for the `mobile` app and a page for the `web` app are independent; run them together.
5. **Synthesize and verify.** Resolve conflicts at the package boundaries, then confirm it builds/typechecks. Report what passed, failed, or was skipped.

## When NOT to orchestrate

Delegation has overhead — a subagent re-establishes context from scratch. For a one-file edit, a quick read, or a single obvious change, just do it directly. Orchestrate when the task spans multiple files, mixes reasoning with building, or has independent parts worth running in parallel.

## Common Mistakes

| Mistake | Fix |
| --- | --- |
| Orchestrator reads the whole repo itself | Scout only enough to plan; delegate deep exploration to a subagent |
| Orchestrator writes the bulk code itself | Route it — the orchestrator plans and synthesizes, it doesn't type volume |
| Everything on one model | Match the tier to the work; mechanical → `fast-worker` (Haiku) |
| Top model on boilerplate | Barrels, formatting, renames go to `fast-worker`, not Opus/Fable |
| Serial delegation of independent steps | Fan out — spawn independent agents in the same turn |
| Executing before showing the plan | Present the decomposition first; confirm destructive/wide steps |
| Using `deep-reasoner` to build a plain screen | `deep-reasoner` decides; the domain builders implement |
| Fable 5 as the default orchestrator | Opus 4.8 by default; Fable 5 only for the hardest long-horizon work |

## Review Checklist

- [ ] The orchestrator scouted, not excavated — heavy reading was delegated.
- [ ] Each step is routed to the cheapest tier that can do it well.
- [ ] Mechanical work (boilerplate, formatting, renames) went to `fast-worker`.
- [ ] Reasoning (architecture, boundaries, hard types, heisenbugs) went to `deep-reasoner`.
- [ ] Independent steps were fanned out in parallel, not run serially.
- [ ] A plan was presented before execution; destructive/wide steps were confirmed.
- [ ] Results were synthesized and the whole build/typecheck was verified.

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
