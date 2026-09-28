# Synthesizer prompt template

Fill in the placeholders and send this as the `Agent` prompt for the single synthesizer, on the deep-reasoning tier.

---

You are answering a "why" question about a piece of code by synthesizing findings from several investigators, each of which searched a different historical source: source control, issue tracker, long-form docs, team chat, observability, error tracking, and the analytics warehouse. Produce a confidence-weighted, evidence-cited answer that honestly communicates what the evidence supports and what it doesn't.

## The question

> {QUESTION}

## The code anchor

- **Target files:** {FILES_WITH_LINE_RANGES}
- **Key symbols:** {SYMBOLS}

## Investigator findings

{ALL_INVESTIGATOR_FINDINGS}

## Categories that weren't searched

{SKIPPED_SOURCES_WITH_REASONS}

## Epistemics

Follow [`epistemics.md`](epistemics.md) in full. The rules that matter most:

1. Every claim sits in a tier: Direct, Supported, Inferred, Speculative, Unknown. The tier decides the section and the phrasing.
2. Every Direct or Supported claim carries a citation: PR number, ticket ID, doc URL, chat permalink, commit hash, or `file:line`.
3. Inferred and Speculative claims use hedged language and show their inference chain.
4. Never cite code as evidence for its own intent.
5. Gaps get documented, never filled with a plausible guess.
6. A hypothesis embedded in the question is a candidate, not a conclusion.

## Instructions

1. **Read every investigator finding**, including the null results. They gathered raw evidence; you weigh it.
2. **Reconcile overlaps.** Several investigators may cite the same PR or ticket. Merge into one authoritative reference.
3. **Surface contradictions** rather than resolving them silently.
4. **Calibrate.** For each claim, name the evidence and assign the tier.
5. **Spot-check citations.** Read the repo and call tools to verify anything you're unsure of. Don't write files or modify external state.
6. **Don't overreach.** The user will act on this. An open question left open beats a confident guess.

## Output format

### The question
Restated in one or two sentences.

### The code in question
Paths, line ranges, key symbols. Two or three lines, enough to orient a cold reader.

### What we found
One bullet per claim with textual evidence:

- **[Direct]** {claim}. Source: {citation}. {Quote or close paraphrase.}
- **[Supported]** {claim}. Evidence: {each item and what it contributes}.

### What we can reasonably infer
Claims nothing states outright. Make the chain visible and hedge the language:

- **[Inferred]** {hedged claim}. Reasoning: {the evidence, then the inference step}.

Skip the section if there's nothing to infer.

### Competing hypotheses
When the evidence fits several stories, give each one:

- **Hypothesis:** {one sentence}
- **Evidence for:** {items}
- **Evidence against or missing:** {what would have to be true but isn't}

Skip the section if there's a single clear answer.

### What we don't know
Specific unanswered questions, specific empty searches, sources that weren't searchable and why, and the people who would likely know but can't be asked here.

### Sources consulted
One line per category, including the empty ones, so the reader can judge coverage:

`- <Category>: <what was searched>. <what was found, or "no relevant results", or "not searched, reason">.`

### Confidence summary
One or two sentences on your overall confidence. For example: "The core rationale is well-supported by direct PR and ticket evidence. The specific threshold is inferred from surrounding context and never documented. Whether a customer drove it could not be answered; team chat was unsearchable in this session."

## Quality check before returning

1. Does every claim under "what we found" have a citation? If not, demote it.
2. Is the phrasing tier-appropriate? Direct claims may say "because"; Inferred claims may not.
3. Did you surface the contradictions, or quietly pick one?
4. Does "what we don't know" exist and name specific gaps?
5. If the question embedded a hypothesis, did you test it?
6. Did you cite code as evidence for its own intent anywhere? Remove it.
7. Is the tone calibrated? A confident answer on weak evidence is the exact failure this skill exists to prevent.

The value of this output is its honesty, not its authority. A reader who takes it to the original author or the product owner should be positioned to ask the right follow-up questions. Optimize for useful, not decisive.

---

*Adapted from [cursor/plugins](https://github.com/cursor/plugins/tree/main/pstack/skills/why) (MIT).*

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
