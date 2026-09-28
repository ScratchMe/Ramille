---
name: hzblj-skills-why
description: >-
  Investigate why code is the way it is — design rationale, rejected alternatives, the incident or customer that forced a threshold. Use when the question is about motivation and history rather than mechanics. Enumerates the available evidence sources (git/gh, issue tracker, long-form docs, team chat, observability, error tracking, analytics warehouse), queries them in parallel with one subagent each, and returns a cited, confidence-calibrated read with the gaps named. Triggers on: why does this work this way, why did we pick, design rationale, historical context, archaeology, git blame, postmortem, regression, where did this number come from, rejected alternatives, tradeoffs, decision record, who decided, what forced this.
disable-model-invocation: true
---

# Why

Investigate the motivation and intent behind code. Why was it built this way? What edge cases were considered? What product, business, or operational constraint shaped the design? What alternatives were rejected, and why?

This is the opposite of reading the code. The code tells you **what** it does; it almost never tells you **why it exists**. That lives in commits, PRs, tickets, docs, chat threads, dashboards, and error trackers — all incomplete, all biased, some deleted. The skill's job is to gather that record honestly and hand back a calibrated read, not a satisfying story.

The default is **coverage, not minimalism**. You can't tell from the question alone which source holds the answer, so query every available one in parallel and treat a null result as a finding.

Builds on [orchestration](../hzblj-skills-orchestration/SKILL.md) — this is that fan-out pattern applied to one specific job.

## Operating posture

Work like a careful investigator piecing together a case from fragmentary records. When the record is thin, say so.

- **Evidence before narrative.** Collect the pieces, then see what story they support. Never pick a story and recruit evidence that fits.
- **Precision over polish.** The exact quote with a citation beats a smooth paraphrase. A reader should be able to verify any claim in under a minute.
- **Consider what you haven't seen.** What would you expect to find if the opposite reading were true, and did you look for it?
- **Name the gaps.** A cold thread, an unsearchable source, an unanswered question — document it. Don't paper over it with an authoritative guess.
- **Hedge on purpose.** Indirect evidence gets hedged language. The confidence calibration is the product, not a stylistic flourish.
- **No shortcut by code-reading.** Resist inferring intent from code shape. See [comments](../hzblj-skills-comments/SKILL.md): the comment that says *why* is evidence, the code that says *how* is not.

## Step 1 — Understand the target and the question

The **target** is a chunk of code, a pattern, a feature, or a named decision. The **question** is usually one of:

| Question shape | What you're really after |
| --- | --- |
| "Why was X designed this way?" | Design rationale |
| "Why X instead of Y?" | Tradeoffs and rejected alternatives |
| "What edge cases motivated this?" | Defensive reasoning |
| "What constraint led to this?" | External forcing function (customer, compliance, SLA) |
| "Why does this still exist?" | Dead-code territory |
| "Where did this number come from?" | A threshold traced to a metric, a p99, or an SLA |
| "What's the history of X?" | Broad archaeological sweep |

If the target is vague, infer it from context (open files, recent edits, what was just discussed), state your interpretation in one line so the user can redirect, and proceed. Don't block on a clarifying question you can answer yourself.

## Step 2 — Establish the code anchor

Anchor the investigation in concrete code before spawning anything. Every investigator needs this, and building it inline is cheap.

```bash
# Last-touch commits for the exact lines in question
git blame -L <start>,<end> <file>

# Full history through renames, with patches
git log --follow -p -- <file>

# Recent commits touching the file, PR numbers visible in the subjects
git log --oneline -20 -- <file>

# The full message of one commit — linked tickets usually live here
git log -1 --format=%B <commit>
```

Pull the PR body and its discussion for anything substantive:

```bash
gh pr view <number> --json title,body,author,createdAt,mergedAt,labels,closingIssuesReferences,comments,reviews
```

Capture the result as **seed context**: file paths and line ranges, key symbols, commit hashes, PR numbers, ticket IDs. Pass it to every investigator so nobody rediscovers it.

## Step 3 — Discover the sources, then fan out

**Discovery.** List the MCP servers available in this session (the `mcp__<server>__*` tools in your tool list; `claude mcp list` from the shell). Map each to exactly one evidence category. Source control is always available through `git` and `gh`. Where an MCP could fit two categories, pick its primary evidence and record the ambiguity in the coverage map.

**Fan out.** Spawn one `Agent` per category that has a matching source, all in a single message so they run concurrently. One investigator per category — never pool two MCPs into one agent, because each has its own query vocabulary and result shape.

| Field | Value |
| --- | --- |
| `subagent_type` | `general-purpose` |
| Model | Sonnet, or Haiku for a single-source keyword sweep. High-volume reading, low-volume output. |
| Prompt | [references/investigator-prompt.md](references/investigator-prompt.md) filled in with the seed context, the user's question, and the category row below |

### The roster

Each category owns evidence the others can't recover. Use this to know what to expect back, and how to name the gap when one returns empty.

| Category | Where it lives | What it uniquely surfaces | Query hints |
| --- | --- | --- | --- |
| **Source control** | `git`, `gh`, code comments, test names | Implementation-time rationale captured during review: the problem statement in a PR body, a review thread debating alternatives, a test name encoding the motivating edge case | `git log -S'<constant>'`, `git log --follow`, `gh pr view`, `gh search prs`, grep for the literal value |
| **Issue / ticket tracker** | Linear, Jira, GitHub Issues, Shortcut | The product or business forcing function: a named customer, a compliance deadline, a parent initiative, labels like `incident-followup` or `perf-regression` | Search the ticket IDs from commit messages, then the feature name, then the labels |
| **Long-form docs** | Notion, Confluence, Google Docs | Written-out design rationale: problem statements, explicit "alternatives considered", ADRs, postmortem action items | Search the feature name, the symbol names, "RFC", "ADR", "postmortem" |
| **Team chat** | Slack, Discord, Teams | Real-time deliberation that never reached a doc: fire-drill decisions, author-to-reviewer Q&A, the casual "we did X because Y" | Search the PR URL, the symbol name, the author's handle around the merge date, `#incident-*` channels |
| **Observability** | Datadog, Grafana, Sentry-adjacent APM | Infra reality that motivated the code: a monitor threshold matching a code constant, a metric spike in the week before the merge | Metrics named after the target, monitors created near the ship date, incident timelines |
| **Error tracking** | Sentry, Rollbar, Bugsnag | The specific exceptions that motivated defensive code: stack traces through the target, first-seen/last-seen bracketing the PR | Search issues whose stack includes the symbol; correlate first-seen with the ship date |
| **Analytics warehouse** | Snowflake, BigQuery, Databricks | Product and data reality: a usage ramp from zero that dates the launch, an experiment exposure table, the p99 a threshold was copied from | Query the event table around the ship date; check distributions for the magic number |

If the target code looks **defensive** — null guards, retries, timeouts, rate limits, feature flags, OOM handlers — tell every investigator to also run incident-flavored queries inside its own source. Defensive code almost always has an incident behind it.

### When to skip an investigator

Only with an explicit written justification that goes into the final Sources Consulted section. Two valid reasons:

- **No source available** for that category in this session. That's a gap to flag, not a choice: "Team chat: not searched, no matching MCP available, so the conversational record is unsearched."
- **Provably irrelevant**, not merely unlikely: "Error tracking: skipped, the target is a build-time script with no runtime path."

"It's a feature, not a bug, so error tracking won't have anything" is **not** sufficient. Run the search and let the null result speak. One empty investigator costs one subagent. A missed design doc costs a wrong answer.

## Step 4 — Synthesize

Spawn a single synthesizer on the deep-reasoning tier (the `deep-reasoner` agent, on Fable) using [references/synthesizer-prompt.md](references/synthesizer-prompt.md). It receives the investigator findings including every null result, the skipped categories with reasons, the code anchor, the user's question, and [references/epistemics.md](references/epistemics.md).

Weighing fragmentary, contradictory evidence and calibrating confidence is exactly the judgement call the top tier is for, and the output is short. This is the cheap half of the job.

## Step 5 — Present

Pass the synthesizer's output through. Light edits for clarity are fine. **Do not rewrite the confidence language.** Dropping the hedges to sound more authoritative is the precise failure mode this skill exists to prevent.

## Output format

**The question.** Restated in a line or two.

**The code in question.** Paths, line ranges, key symbols. Two lines, so a cold reader is anchored.

**What we found.** One bullet per claim that has direct textual evidence, each with a precise citation (PR number, ticket ID, doc URL, chat permalink, commit hash, `file:line`) and a quote.

**What we can reasonably infer.** Claims nothing states outright but the evidence supports. Make the chain visible: "Given A and B, C is likely because D." Hedged language throughout.

**Competing hypotheses.** When the evidence fits several stories, list each with its evidence for and against. Don't force a winner. Skip the section when there's a clear answer.

**What we don't know.** Specific unanswered questions, specific searches that returned nothing, sources that weren't searchable. "We searched the tracker for `rate limit`, `throttle`, and ENG-4421 and found no ticket discussing this threshold" is useful. "We don't know" is not.

**Sources consulted.** One line per category including the empty ones, formatted `- <Category>: <what was searched>. <what was found, or "no relevant results", or "skipped, reason">.` This coverage map is what lets the user judge breadth and redirect you.

If the `why` question is a precursor to changing the code, close with a **Preserve / Change / Avoid / Risk** constraint set built from the findings.

## Common Mistakes

| Mistake | Why it's wrong | Do this instead |
| --- | --- | --- |
| Confident storytelling from thin evidence | The user acts on it as if it were fact | A bullet with no citation belongs in Inferred or Hypotheses |
| Citing the code as evidence for its own intent | "It handles null because it checks for null" is mechanics, not motivation | Cite an external source, or label it inference |
| Recency bias | The newest commit is usually accretion, not the decision | Trace back through `--follow` to the shape's origin |
| Confirming the user's embedded hypothesis | "I assume it's for performance?" is a candidate, not a conclusion | Check it independently; report what the evidence supports |
| Skipping a source by anticipation | A skipped search is a blind spot; a null result is data | Run it, then report the null |
| Pooling several MCPs into one investigator | Each source has its own query vocabulary; pooling dilutes coverage | One investigator per category, always |
| Dropping the gaps section | The honest accounting is half the value | Name every unanswered question and empty search |
| Rewriting the synthesizer's hedges | Sounding decisive is the failure mode | Pass the calibration through untouched |

## Review Checklist

- [ ] The code anchor was built first and passed to every investigator.
- [ ] Available sources were enumerated at run time, not assumed.
- [ ] One investigator per category, all spawned in a single message.
- [ ] Every skipped category has a written justification in the output.
- [ ] Every Direct claim carries a citation you could follow in under a minute.
- [ ] Inferred claims use hedged language and show their inference chain.
- [ ] Contradictions are surfaced, not quietly resolved.
- [ ] A "what we don't know" section exists and names specific gaps.
- [ ] No claim treats the code as evidence for its own intent.
- [ ] The user's embedded hypothesis, if any, was tested rather than confirmed.

---

*Adapted for Claude Code from [cursor/plugins](https://github.com/cursor/plugins/tree/main/pstack/skills/why) (MIT). The per-source playbooks are folded into the roster table above; subagent tiers follow [orchestration](../hzblj-skills-orchestration/SKILL.md).*

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
