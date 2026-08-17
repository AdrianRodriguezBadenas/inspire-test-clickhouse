# 98 · Skill learnings — closed archive

> **This layer is closed as of the 0.6.0 upgrade (2026-08-17). Write nothing new here.**
>
> INSPIRE 0.6.0 retired `inspire-learn` in favour of `inspire-lesson`, and the new home
> is [`../98_lessons/`](../98_lessons/). It is **not a rename**: a *lesson* is a single
> imperative line that gets materialized into the skill, while a *learning* below is
> long-form reasoning aimed at the INSPIRE core team. The two files kept here are
> preserved verbatim, with their original `0.1.0` version stamp, because that reasoning
> is the material an upstream contribution is built from — and write-once means they are
> never rewritten to fit a newer schema.
>
> The one-line lessons distilled from them live in `../98_lessons/` and carry
> `related_to` back to the learning each came from.

### Corrections found by running the upgrade

`20260817_extract-fork-runtime-before-a-hop` was written from **reading** the 0.6.0
upgrade machinery, before running it. The run disproved two of its three findings. The
learning is write-once and stays as written; the record is corrected here, and anything
carried upstream should carry these corrections with it.

- **"A hop leaves an unrecognized file behind silently."** Wrong. Both `--mode plan` and
  `--mode update` name every fork-added path individually — `yours — INSPIRE never
  shipped this` — and the report groups them under RUNTIME rather than burying them in a
  count. What survives of the finding is narrower: the hop does not *relocate* them, so
  they stay in the root everything else vacated. Even that cost nothing here, because
  `.inspire/bin/` was the pre-0.3 staging source and already held all three validators at
  the 0.3+ destination.
- **"A fork's golden fixtures have nowhere to live."** Half wrong. True of a *fresh*
  0.6.0 install, which never materializes `bin/test/`. Not true of this upgrade: the hop
  left the pre-0.3 staged tree in place, `run-tests.sh` came with it, and the 56-case
  suite ran from `.inspire/bin/test/` unchanged.
- **"Fork-authored intra-runtime paths go stale."** Confirmed, and it was the real cost:
  the hook blocks this fork had added still pointed at `.claude/bin/` and `.inspire_kb/`,
  and the shared `_lib.sh` helpers were reverted with the base — which the validator suite
  caught as 9 failures with one root cause.
- **New, not in the learning:** upstream's own `inspire-bootstrap/SKILL.md` carries 8
  relative links one level too shallow (`../../inspire_kb/…` where every other 0.6.0
  skill correctly uses `../../../`). Left unfixed here on purpose, to avoid drift at the
  next upgrade; it belongs in the upstream PR.

The **self-learning layer** — durable, version-stamped insights about the
`inspire-*` **skills themselves**, captured in a fork and bound *upstream* to
INSPIRE core. Where the rest of the knowledge base describes the **product**, this
layer describes how the **methodology fit** the product: where a skill helped, where
it got in the way, and what a fork changed locally.

Forks diverge from the template and rarely merge back. This layer is the
low-friction alternative to a git merge: instead of propagating code, a fork emits
**learnings** that the central INSPIRE team harvests to inform the next release.

- **Skill:** `inspire-learn` (`note` · `list` · `show` · `purge`).
- **Write-once & timestamp-named:** one `YYYYMMDD_<slug>.md` per learning,
  flat, created once and never edited. The date prefix lets an org sweep select a date
  range by string comparison on the first 8 characters — no frontmatter read. The
  on-disk contract (naming, write-once rules, frontmatter schema, enums, purge/sweep)
  lives in the `inspire-learn` skill's `references/learnings-format.md`.
- **Version-stamped:** every node freezes the `inspire_version` it was captured on
  (read from the root `.inspire.lock`), so upstream can tell whether a newer release
  already addressed it.
- **Authored in English**, regardless of the project's `output_language` — its
  reader is the cross-org INSPIRE core team, not the product team. This is the one
  deliberate exception to the output-language rule.

## Relationship to the tracker (`99_tracker`)

Both are trackers, aimed at different audiences:

| | `99_tracker` skill-feedback ticket | `98_skill_learnings` node |
|---|---|---|
| Audience | this project's team | the central INSPIRE team |
| Lifetime | transient — closed when acted on | durable — kept as a versioned record |
| Question | "someone here should act on this friction" | "this generalizes; INSPIRE core should adopt it" |

A recurring or confirmed friction ticket **graduates** into a learning: the ticket
tracks the local fix, the learning carries the generalizable insight upstream and
links back with `[[TASK-…]]`.

## Centralization

Consumption is always a **pull from above**: an external INSPIRE-core agent pulls the
org's forks and reads the raw `**/.inspire_kb/98_skill_learnings/*.md` (plus each fork's
`.inspire.lock` for its version), clusters the learnings by skill and theme, and feeds
them into INSPIRE core's own ADRs / tracker for the next release. Because learnings are
write-once and date-prefixed, the pull keeps a **date cursor** and reads only files
newer than it (comparing the first 8 characters), so it never re-processes what it
already ingested. The fork writes learnings and never contacts upstream.

> This is a **template skeleton**. On a new project the folder starts empty (just
> this `README.md`); `inspire-learn` fills it in as the fork accumulates learnings.
