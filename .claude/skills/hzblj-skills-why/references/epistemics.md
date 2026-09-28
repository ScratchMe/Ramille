# Epistemics

How to reason about confidence when the evidence is historical, fragmentary, and sometimes contradictory — and how to communicate that without flattening it into false certainty.

Code doesn't carry its own motivation. You can read what code does; you can't read why it exists. That lives in commits, PRs, tickets, docs, dashboards, and conversations, all incomplete, all biased, some missing entirely. Pretending otherwise produces confident-sounding guesses that mislead the reader.

## Confidence tiers

Every claim in the final output sits in one of these. The tier decides which section it goes in and how it's phrased.

| Tier | What it takes | Output section | Phrasing |
| --- | --- | --- | --- |
| **Direct** | An explicit citation that answers the question. Someone *wrote down* the why. | What we found | Confident, present tense. "This exists because X." Cite it. |
| **Supported** | Several indirect pieces converge. No single source states it. | What we found | Confident but visibly derived. "The evidence points strongly to X: …" Cite each piece. |
| **Inferred** | A reasonable reading of context; nothing states it. | What we can reasonably infer | Hedged. "appears to", "likely", "suggests". Show the chain. |
| **Speculative** | Plausible, but other explanations fit equally well. | Competing hypotheses | Explicitly a guess. "One possibility is X, but we found no direct evidence." |
| **Unknown** | You looked and couldn't find out. | What we don't know | Specific about *what was searched*. |

**Direct** looks like: a PR description saying "this fixes the bug where users with more than 1000 items couldn't paginate"; a ticket saying "customer Acme requested this in their security review"; a comment saying `// clamp to 100 because the upstream API rejects larger values`; a design doc with an "alternatives considered" section; a chat message from the author saying "switching approaches, the old one was flaky in CI".

**Supported** looks like: the PR title says "improve performance", the ticket carries a `perf` label, and every surrounding commit touches the same hot path.

**Inferred** looks like: the PR doesn't say why, but the error was live in production (per the incident channel timing) and the fix merged the same day, so it was likely a hotfix.

**Unknown** looks like: "We searched the tracker for `retry`, `backoff`, and ENG-4421, scanned the six PRs touching this file since 2023, and grepped for the literal `3000`. None surfaced a rationale." That is far more useful than "we couldn't find out".

## Phrasing guide

**Words that assert causation.** Use only with a citation immediately adjacent: "because", "the reason is", "was designed to", "fixes", "addresses", "solves", "the team decided".

**Words that hedge.** Use liberally for anything Inferred: "appears to", "seems to", "likely", "suggests", "is consistent with", "one reading is", "plausibly", "may have been", "the evidence points toward".

**Words to avoid entirely:**

| Avoid | Why |
| --- | --- |
| "obviously", "clearly", "of course" | If it were obvious the user wouldn't be asking. These almost always precede an unclear claim. |
| "just" (as in "it's just for performance") | Dismissive, and it hides uncertainty |
| "I think", "I believe" | You're synthesizing evidence, not offering an opinion. Say "the evidence suggests". |

## Avoid rationalization

Code that makes sense today may have been written for reasons that no longer apply, or for no good reason at all. Don't retrofit a clean rationale onto messy history. Specifically, resist:

- Assuming the author did the right thing and working backward to justify it.
- Reading a repeated pattern as intentional when it might be copy-paste.
- Turning absence of evidence into evidence of absence. "Nobody mentioned security, so it wasn't a concern" is not a finding.

## The sycophancy trap

`why` questions usually arrive with a hypothesis attached: "Why do we do it this way, I assume it's for performance?" Don't confirm it. Treat it as one candidate among several and check the evidence independently. If it holds, say so with citations. If it doesn't, say so and present what the evidence *does* support. The user's guess is a prompt for investigation, not a conclusion to validate.

## When evidence contradicts

Surface both sides. Don't pick the one that makes a tidier narrative. A common shape:

- **The ticket says** "we need this for customer X's compliance requirement."
- **The PR says** "cleaning up tech debt in this area."

Both can be true (the ticket motivated the work, the PR is the author's framing), or one can be wrong. Show both with citations and let the reader decide.

## When evidence is missing

An honest "we don't know" is one of the most valuable outputs this skill produces. It tells the reader the answer isn't in the obvious places, that they'll need to ask a human, or that the question isn't worth pursuing. Filling the gap with a confident guess actively harms them, because they'll act on it.

Name the gap concretely: what question you were answering, what sources you searched, what you searched for in each, and what came back.

## Calibration check before finalizing

1. Does every claim in "what we found" have a citation? If not, add one or move it down a tier.
2. Is the phrasing tier-appropriate? A Direct claim may use "because". An Inferred claim may not.
3. Are you citing code as evidence for its own intent? Remove it or reclassify it.
4. Is there a "what we don't know" section with specific gaps? If it's empty, be suspicious — historical investigations almost always have gaps.
5. If the question embedded a hypothesis, did you test it or rubber-stamp it?

---

*Adapted from [cursor/plugins](https://github.com/cursor/plugins/tree/main/pstack/skills/why) (MIT).*
