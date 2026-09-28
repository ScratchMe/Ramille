---
name: hzblj-skills-unslop
description: >-
  Cut AI tells from writing and put a real voice back in. Use when drafting or editing any prose: READMEs, docs, commit messages, PR descriptions, changelogs, release notes, code comments, blog posts. Triggers on: unslop, slop, AI tells, sounds like AI, robotic, em dash, delve, tapestry, prose, writing style, tone of voice, README, PR description, commit message.
disable-model-invocation: true
---

# Unslop

Edit text to remove AI patterns and add human voice. This applies to everything you
write, not just documents someone asked for: PR bodies, commit messages, changelog
entries, and the prose paragraphs inside a `SKILL.md` all leak the same tells.

Two failure modes, not one. Slop is the obvious one. The other is what you get when
you strip the slop and stop there: correct, flat, voiceless text that reads like a
compliance form. Fix both in the same pass.

For prose that lives inside code, see [comments](../hzblj-skills-comments/SKILL.md).
The rule there is the same rule here, aimed at a smaller target.

## Process

1. Scan for the patterns below.
2. Rewrite. Preserve meaning, match intended tone.
3. Add soul (next section).
4. Self-audit. Ask "what makes this obviously AI generated?" and fix what is left.

## Adding soul

Removing patterns is half the job. Sterile, voiceless writing is just as obvious.

- Have opinions. React to facts instead of neutrally listing pros and cons.
- Vary rhythm. Short sentences. Then longer ones that take their time. Mix it up.
- Acknowledge complexity. "Impressive but also kind of unsettling" beats "impressive".
- Use "I" when it fits. First person is not unprofessional.
- Let some mess in. Perfect structure looks machine-made.
- Be specific. Not "this is concerning" but "there is something unsettling about
  agents churning away at 3am".

## Content

| Tell | Sounds like | Fix |
| --- | --- | --- |
| Puffery | "pivotal moment", "testament to", "evolving landscape", "setting the stage for", "indelible mark", "deeply rooted" | Cut it. State what happened. |
| Name-dropping | Listing outlets or sources with no context | Pick one, say what it actually said |
| Superficial -ing phrases | "highlighting...", "ensuring...", "reflecting...", "showcasing...", "fostering..." | Delete, or expand into a real claim with a real source |
| Promotional language | "nestled", "vibrant", "breathtaking", "groundbreaking", "renowned", "stunning", "must-visit" | Neutral description |
| Vague attributions | "Experts believe", "Industry reports suggest", "Some critics argue" | Name the source or delete the sentence |
| Formulaic challenges | "Despite challenges... continues to thrive" | Replace with specific facts |

```
Bad:  The Triwizard Tournament was a pivotal moment, a testament to the enduring
      spirit of magical cooperation, setting the stage for a new era at Hogwarts.
Good: Three champions entered the Triwizard Tournament. One came back dead, and
      the Ministry spent a year insisting otherwise.
```

## Language

| Tell | Sounds like | Fix |
| --- | --- | --- |
| AI vocabulary | additionally, crucial, delve, enduring, enhance, fostering, garner, interplay, intricate, landscape (abstract), pivotal, showcase, tapestry (abstract), testament, underscore, vibrant | Plain words |
| Fancy ways to say "is" | "serves as", "stands as", "boasts", "features" | "is" or "has" |
| "Not just X, but Y" | "not just a wand, but a bond" | State the point directly |
| Rule of three | Forcing ideas into groups of three | Use the natural number, even when it is two |
| Synonym cycling | Protagonist, main character, central figure, hero in one paragraph | Pick one and repeat it |
| False ranges | "from X to Y" where X and Y are not on a scale | List the items directly |

```
Bad:  The wand serves as a conduit for magic, showcasing an intricate interplay of
      craftsmanship, tradition, and intent.
Good: The wand channels magic. Ollivander matches the core to the wizard, and a
      borrowed wand fights back.
```

## Style

| Tell | Fix |
| --- | --- |
| Boldface overuse | Do not bold every proper noun or acronym |
| Title case headings | Sentence case |
| Decorative emojis | Remove from headings and bullets |
| Curly quotes | Straight quotes |

**No em dashes.** Avoid them entirely. Use periods or commas only. No parentheses, no
en dashes, no hyphen-as-dash substitutes. The em dash is an AI tell, and reaching for
parentheses instead just trades one tell for another. If a thought needs separation,
end the sentence or use a comma.

**Colons connect lists, not clauses.** A colon before a list or an example is fine. A
colon as a mid-sentence connector adds nothing. "If you are coming from traditional
automation: instead of registering event handlers, you describe conditions" carries
the same meaning without the colon and without the comparison framing. Rewrite so the
point stands alone: "Describing when the scheduler should fire works best as plain
English."

**Inline-header lists.** The tell is a bold label plus colon that restates the line
that follows, as in "**Performance:** Performance improved by 40%". Convert those to
prose. A bold lead-in that ends in a period, names the item, and is followed by
genuinely new detail is fine, not a tell. This paragraph is the allowed shape.

## Communication artifacts

| Tell | Sounds like | Fix |
| --- | --- | --- |
| Chatbot phrases | "I hope this helps!", "Let me know if...", "Of course!", "Certainly!", "Found the smoking gun!" | Remove |
| Cutoff disclaimers | "While specific details are limited..." | Find the source or drop the claim |
| Sycophantic tone | "Great question!", "You're absolutely right!" | Answer directly |

## Filler

| Tell | Fix |
| --- | --- |
| "In order to" | "To" |
| "Due to the fact that" | "Because" |
| "It is important to note that" | Delete the whole phrase |
| "could potentially possibly be argued that it might" | "may" |
| Generic conclusions such as "the future looks bright" | State a specific plan or fact, or cut the paragraph |

## Jargon

Abstract metaphor nouns read as technical and usually hide a plainer, more concrete
word: substrate, wedge, vector, locus, vantage, nexus, primitive (as a noun), harness
(as a metaphor), surface (as in "API surface"), bedrock, scaffolding (as a metaphor),
modality, paradigm, gold-plating, ratchet (as a metaphor), evacuate (for moving code),
endgame, north star, flywheel.

| Jargon | Plain word |
| --- | --- |
| substrate | base |
| wedge in | add |
| vector | way, method |
| gold-plating | more than the job needs |
| ratchet | the mechanism's real name, or "a limit that only tightens" |
| evacuate (code) | move out |
| endgame | the last phase |

## Plain speech

**Say what it does, not how it feels.** "The database stays close at hand", "SQL you
can read", and "types that follow your schema" all name a feeling. The fix names the
mechanism or a number: "`.toSQL()` returns the exact string sent to the database",
"a column rename fails the build". Ask what the sentence tells the reader to do or
know, then write that. If you cannot restate it as a concrete instruction, fact, or
number, cut it. One more check: if the sentence could appear unchanged in another
project's docs, it says nothing about this one. Cut it.

**Shorten or split dense sentences.** If the reader has to backtrack to parse a
sentence, break it in two or drop clauses. One idea per sentence.

**Active voice.** Catch "is/are/was/were" plus a past participle and name the actor.
"Queries are validated" becomes "the compiler validates queries". "The file is parsed
by the loader" becomes "the loader parses the file". Passive is fine only when the
actor is unknown or genuinely does not matter.

**Cut adverbs, or use a stronger verb.** "Runs quickly" becomes "is fast" or the
measured number. "Significantly improves" becomes the delta. An adverb propping up a
weak verb means the verb is wrong.

**Prefer the plain word.** "Utilize" becomes "use". "Leverage" becomes "use".
"Facilitate" becomes "help". "Numerous" becomes "many". "In the event that" becomes
"if". The fancier synonym is rarely clearer.

## Common mistakes

| Mistake | Why it is wrong | Do this instead |
| --- | --- | --- |
| Swapping em dashes for parentheses | Trades one tell for another and keeps the same clause pileup | End the sentence, or use a comma |
| Deleting every adjective and opinion | Produces flat, voiceless text, which is its own tell | Keep the judgement, drop the puffery |
| Running the pass only on documents | Commit messages, PR bodies, and changelogs leak the same tells | Run it on everything you write |
| Banning a word list mechanically | "Landscape" is fine for terrain, "surface" is fine for a physical one | Ban the abstract metaphor use, not the word |
| Rewriting a quote to fit the rules | Quotes and cited text are evidence, not your prose | Leave quoted material exactly as it is |
| Padding to hit three bullets | The rule of three is the tell | Ship two bullets when there are two |
| Stopping after the pattern scan | Step 4 catches what no checklist lists | Reread and ask what still reads as AI |

## Review checklist

- No em dashes anywhere. No parentheses used as a stand-in for one.
- No word from the AI vocabulary list survives unless it is load-bearing.
- Every attribution names a real source, or the sentence is gone.
- Headings are sentence case, emoji-free, and quotes are straight.
- No bold-label-colon line that restates the line after it.
- Every sentence states a fact, an instruction, or a number, and none of them would
  fit unchanged in another project's docs.
- Passive voice only where the actor genuinely does not matter.
- Sentence lengths vary. At least one opinion is on the page.
- Read it once more and answer: what still makes this obviously AI generated?

---

*Adapted from [cursor/plugins](https://github.com/cursor/plugins/tree/main/pstack/skills/unslop) (MIT). The pattern list is theirs; the tables, the common-mistakes section, and the review checklist are this repo's house style.*

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
