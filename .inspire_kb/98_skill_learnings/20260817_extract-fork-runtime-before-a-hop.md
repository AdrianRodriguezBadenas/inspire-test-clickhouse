---
id: 20260817_extract-fork-runtime-before-a-hop
kind: skill-learning
title: A layout hop turns a fork's runtime edits into residue, so extraction is a pre-upgrade step
skill: runtime
category: new-pattern
created: 2026-08-17
reporter: "@adrian.rodriguez"
inspire_version: "0.1.0"
template_sha: "d7587c0"
related_to: []
supersedes: null
---

## Trigger

The operator asked how to pull the latest INSPIRE, then — before anything ran — named the
real worry: *"lo que me preocupa sobretodo es los cambios que he podido aplicar yo sobre
la 0.1.0."* This fork sits at 0.1.0; upstream is at 0.6.0, 113 commits ahead, and has
changed delivery model entirely (staged `.inspire/` + `install.sh` → a Claude Code plugin
with `/inspire:init` and `/inspire:update`).

Reading the upgrade machinery before running it — `plugin/scripts/hops/0.3.0.sh` and
`hops/layouts.tsv` — showed three ways a **successful** upgrade silently loses or breaks
the fork's own runtime work. Not bugs in the hop: it does exactly what it says. Gaps in
what the upgrade knows about.

## Learning

**The upgrade path is fully specified for the files INSPIRE ships, and silent about the
files a fork adds.** That asymmetry is load-bearing, because fork→upstream promotion is
INSPIRE's stated design: a fork is *supposed* to grow validators, references and hook
blocks of its own. Three concrete failures, all from a correct run:

1. **A hop moves shipped files by name, so fork-added siblings are orphaned.** The
   `pre-0.3 → 0.3.0` hop has fourteen literal `hop_mv` lines for the fourteen shipped
   validators. This fork has three more in the same directory. They stay behind in the
   drained old root while every rule they live beside moves — and `.claude/bin/` survives
   as a directory that looks like residue and is not.
2. **The runtime holds literal intra-runtime paths, and a hop cannot fix the ones a fork
   authored.** Upstream's hooks are re-materialized from base, so *their* paths are
   correct after the move. The blocks this fork added inside those hooks still point at
   `.claude/bin/…` and `.inspire_kb/…`. Each is a gate that would silently stop running —
   the precise failure the fork's own hooks were written to refuse loudly.
3. **A whole container can lose its destination.** `bin/test/` never materializes from
   0.3 on. A fork's golden fixtures — which the runtime's own contribution standard
   requires for a new validator — have nowhere to live in a project any more. Ours are
   37 files with no destination in the target layout at all.

The upgrade ADR's **D4** ("layout verification asserts structure, never content") is right
and should not change: an operator who edited a skill is using INSPIRE correctly, and
content must never block an upgrade. But the corollary is that the operator carries
**100% of the re-derivation**, and nothing tells them what they are carrying. The missing
artifact is not a merge strategy — it is an **inventory**.

And the inventory is only cheap **before** the hop. Afterwards `.inspire/{skills,
templates}` is residue, the live tree no longer resembles the base it diverged from, and
the pre-hop layout that makes a per-file diff legible is gone. It stays recoverable from
git, but only if the fork knew to look — which is the same class of problem as a rule
that is written and never loaded.

One method note that made the extraction much smaller than feared: **check whether the
deployed copy is byte-identical to the staged source first.** Here `.claude/{skills,bin,
hooks}` matched `.inspire/` exactly, which collapsed an apparent 298-file delta to the
61 files that actually carry intent.

## Local change

Built `inspire-carryover/` (commit `013b4ca`) — the fork's runtime delta extracted while
the pre-hop layout still exists:

- `new-files/` — the 45 added files verbatim, tree relative to `.inspire/`.
- `patches/` — one patch per modified file (16), paths relative to `.inspire/` so a family
  can be applied with `git apply --directory=<new root>`.
- `README.md` — the five coherent themes the 61 files amount to, a per-file table of how
  far upstream moved each counterpart between 0.1.0 and 0.6.0, the old→new path mapping
  read off the hop, and the re-apply order.

Verified by extracting a clean checkout of the base commit and confirming all 16 patches
plus the combined one apply without conflict. Also confirmed by grep that none of the five
themes exists in the 0.6.0 base — so nothing had been superseded, which is a question the
extraction has to answer before it is worth doing at all.

## Upstream suggestion

1. **`--mode plan` should emit a carry-over inventory.** Fork-authored paths under the
   runtime roots, grouped by family, each with the destination it *would* have in the
   target layout — or `none`. This is a report, not new machinery: `plan` already
   classifies every file on disk and already has the manifests that distinguish shipped
   from added.
2. **A hop should not leave an unrecognized file behind silently.** Either relocate
   unknown files in a moved root to the same destination, or name each one individually as
   an orphan. Our three validators would have been lost inside a grouped summary line.
3. **Report stale intra-runtime paths after a hop.** Grep the operator-owned files for
   literal paths the hop just invalidated. A gate whose enforcer path is stale is worth a
   line in the report, because the tooling can see it before the gate fails to fire.
4. **Say where a fork's golden fixtures live** now that `bin/test/` never materializes.
   Adding a validator requires fixtures, and the layout has no place for them — the answer
   is presumably "in the plugin repo, arriving with the PR", but today that has to be
   inferred from a comment inside a hop script.
5. **Name extraction as a precondition in the update skill**, beside the `jq`/`yq` and
   clean-tree checks. It is the one step that gets materially more expensive after the
   upgrade rather than before it.
