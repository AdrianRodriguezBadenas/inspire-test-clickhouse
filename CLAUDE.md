# INSPIRE — workspace guide for Claude

This repository is a **fork of the INSPIRE template, instantiated as a live
project** — a ClickHouse-backed analytics service (see [README.md](README.md)).
INSPIRE is a software engineering methodology for the agentic era; the manual is at
[inspire.openbims.dev](https://inspire.openbims.dev), and the runtime is developed at
[github.com/Genomcore/inspire](https://github.com/Genomcore/inspire).

It wears two hats, and confusing them is the main way to get this repo wrong:

- **A product.** `inspire_kb/` holds this project's real knowledge base, `source/`
  its production code. The guardrail runtime is **live**.
- **An upstream contributor.** Improvements to the methodology made here are meant to
  flow back to INSPIRE core — but since 0.3 that happens through a **pull request to the
  plugin repo**, not by editing a staged copy in this repo. See *Contributing upstream*.

**Runtime version: 0.6.0** (see `.inspire.lock`). This fork was upgraded from 0.1.0 on
2026-08-17; the layout below is the post-upgrade one, and it is different in almost every
path from the pre-0.3 layout that older commits describe.

## Structure

The convention: **dotfolders = INSPIRE scaffolding**, non-dot dirs = the product
you build on top of it.

- `.claude/skills/` — the **14 agent skills** (`inspire-*`): the judgment half of the
  runtime, in three families:
  - **Specification** (8) — capture what the product is and why: `module` · `feature` ·
    `domain` · `screens` · `surface` (the suite's surface roster) · `prototype`
    (horizontal mock) · `spike` (external verticals) · `adr`.
  - **Codification** (1) — `inspire-code`: the coding stage that turns the KB into
    production code under `source/` (subcommands `tdd` · `review` · `debug` ·
    `fix-build` · `fix-vulns`), always re-anchoring to the ADRs, descriptors and
    acceptance criteria that specify it, and handing drift back to the specifying
    skills. Stack-agnostic, layering optional **stack profiles**
    (`inspire-code/profiles/`, resolved on demand from `00_bootstrap/stack.md`).
  - **Housekeeping** (5) — set up and keep the workspace coherent: `bootstrap`
    (foundation: language, stack, theme + the live design system), `extract`
    (brownfield onboarding), `task` (the ticket tracker), `workspace` (the pre-PR
    global review + vault structure), `lesson` (the lessons catalog).
  - Shared references live in `.claude/skills/_references/`.
- `.inspire/bin/` — the validators + golden fixtures: the mechanical half. Spec root is
  configurable via `SDD_SPEC_ROOT` (defaults to `inspire_kb/04_domain`).
  Test suite: `bash .inspire/bin/test/run-tests.sh` (56 cases).
- `.claude/inspire/hooks/` — enforcement hooks. `dispatch.sh` is the single
  `PreToolUse`/Bash entry point registered in `.claude/settings.json`; it routes by
  command pattern to `pre-commit.sh` (on `git commit`) and `pre-pr.sh` (on
  `gh pr create`). `session-start.sh` injects the project's `output_language` and the
  runtime version into every session.
- `.inspire.lock` — the fork's provenance: which release this project was materialized
  from. Written by the upgrade, never by hand.
- `inspire_kb/` — **this project's knowledge base**, not an empty skeleton: the
  navigable graph the product is specified in, and the source of truth the code is
  judged against. One layer per skill (`00_bootstrap`, `01_adr`, `02_modules`,
  `03_features`, `04_domain`, `05_screens`, `06_spikes`, `98_lessons`, `99_tracker`);
  each folder carries a README explaining its purpose and layout.
  `98_skill_learnings/` is a **closed archive** — the pre-0.6 long-form learnings, kept
  for the upstream conversation; see its README.
- `.manual/` — the INSPIRE **microsite / manual** (open `.manual/index.html`).

The two product-side dirs below are the product, not INSPIRE:

- `prototype/` — the **horizontal prototype**: the wide, shallow, mocked working model
  of the whole product. It keeps **no KB file** — its insights co-evolve the vault
  directly (features, screens, ADRs, design system). Vertical spikes live in their own
  external repos, their knowledge brought home under `inspire_kb/06_spikes/`.
- `source/` — the **production monorepo**: the root of the actual product code, realized
  from the KB. An ADR reaches `implemented` maturity when it lands here.

## Working in this repo

- **The runtime is materialized into this project, and you edit it in place.** Skills at
  `.claude/skills/`, validators at `.inspire/bin/`, hooks at `.claude/inspire/hooks/`.
  There is **no staging copy and no deploy step** — an edit is in force as soon as it is
  saved.
  > Commits before 2026-08-17 say the opposite ("edit `.inspire/`, never `.claude/`") and
  > tell you to run `.inspire/install.sh`. Both were true of the pre-0.3 layout and are
  > wrong now: `install.sh` no longer exists, and `.inspire/skills/` has been deleted.
- A restart of Claude Code is **not** needed for skill or hook *content* (both are read
  when they run), only when a brand-new skill directory is added, since the available-
  skills list is built at session start.
- **Keep the runtime generic.** The skills and validators must stay stack-agnostic and
  free of this product's domain vocabulary — that is what keeps them promotable
  upstream. This project's concrete content belongs in `inspire_kb/` and `source/`, and
  its stack-specific rules in an `inspire-code/profiles/` profile, never inlined in a
  skill.
- **Record methodology insights** with `/inspire_lesson note` — write-once, version-
  stamped. A lesson is a **single imperative line** that gets materialized into the
  skill; if the intent needs a paragraph, it is two lessons.
- Run the validator suite with `bash .inspire/bin/test/run-tests.sh` after touching
  anything under `.inspire/bin/`.

### This fork's local runtime additions

Five themes live here that **INSPIRE 0.6.0 does not ship**. Treat them as part of the
runtime, and keep them working when you change anything nearby:

1. **Escape-hatch ratchet** — `.inspire/bin/escape-hatch-ratchet.sh`: deliberate rule
   suppressions in `source/` may fall, never rise. Ceilings in `.escape-hatches.json`.
   Wired into `pre-commit` (scoped) and `pre-pr` (unscoped).
2. **Nothing untested** — `criteria-have-tests.sh` (every acceptance criterion carries a
   stable id claimed by a test via `/** @covers {id} */`) and
   `declared-errors-tested.sh` (every declared error appears as a literal in a test).
   Both lifecycle-progressive; both wired into `pre-pr`. Shared test discovery lives in
   `_lib.sh`, deliberately, so the two cannot disagree on what a test file is.
3. **Quality-gate layering** — `_references/quality-gates.md` plus a `## Quality gates`
   section in each stack profile.
4. **The mutation drill** — `inspire-code/references/tdd.md` step 6, and the reason this
   project has no Stryker: the drill is per-diff, with the agent as the mutation engine.
5. **Surface conventions** — `_references/conventions/`: what a caller observes per
   logical error, decided once at bootstrap. Note the collision: 0.6.0's own
   `_references/surface-scope.md` uses *surface* for a deliverable (`ui`/`headless`/
   `lib`), which is a different concept from a wire contract.

### Updating the runtime

The runtime is delivered as a Claude Code plugin, but **installing the plugin is not
required** — `materialize.sh` takes a plain path:

```bash
git clone https://github.com/Genomcore/inspire.git <path>
bash <path>/plugin/scripts/materialize.sh --mode plan \
  --plugin-root <path>/plugin --project-root "$(git rev-parse --show-toplevel)"
```

`--mode plan` is read-only. `--mode update` performs it, and resolves each conflicted
file from the command line: `--take-base <path>` takes the new release's version,
`--take-mine <path>` keeps ours, and an unresolved conflict keeps ours. Nothing is
registered in any config unless `--declare-marketplace` is passed.

**Before upgrading, extract this fork's runtime delta first** — a layout hop retires the
tree the edits live in, and the per-file diff against the old base is only cheap
beforehand. The 0.1.0 → 0.6.0 extraction is commit `013b4ca` (`inspire-carryover/`, added
there and removed in `HEAD` once the port was done): 45 added files verbatim plus one
patch per modified file. Recover it with `git show 013b4ca --stat` if you want the shape;
it is spent as a re-application tool, since its patches target a base the tree no longer
has.

### Contributing upstream

Promotion is a **PR to `Genomcore/inspire` against `plugin/base/…`** — the runtime's
source no longer lives in this repo. Two consequences worth knowing:

- `bin/test/` is never materialized into a project from 0.3 on, so a new validator's
  golden fixtures have no home here; they arrive with the PR. This fork keeps its own
  suite running from `.inspire/bin/test/` regardless.
- Nothing in this repo pushes anything anywhere. Upstream reads a fork by pulling it.

## Touching `source/` — read this before writing a test

These live in full in `.claude/skills/inspire-code/references/tdd.md`, which loads only
when the `inspire-code` skill is invoked. They are repeated here because this file loads
**every session**, and a rule that is not in context is not in force — the failure this
section exists to prevent has already happened once.

**Run `/inspire_code tdd` rather than writing tests freehand.** That is what loads the
conventions, the resolved stack profile and the surface convention. Freehanding is how a
test gets written against a rule nobody had open.

The three that get violated by accident:

1. **Assert the whole response, never a field or two.** For a collection or paginated
   response that means the envelope's exact key set plus the members' natural keys **in
   order** — not just a count. A count cannot tell a correct page from an off-by-one that
   returned the same number of wrong rows.
2. **Never build the expected value from the code under test.** Importing the constant
   you are asserting (`toHaveLength(DEFAULT_PAGE_SIZE)`) makes the test move with the
   bug. Where the spec states a literal, assert the literal.
3. **Run the mutation drill before calling it done** (`tdd.md` step 6): break the settled
   code on purpose, confirm the tests notice, revert. A survivor is a test gap, not a
   code bug. This is the only one of the three that catches itself — the other two rely
   on someone remembering, which is why the drill is not optional.

Infrastructure first: e2e runs against real ClickHouse, so it must be **healthy** (not
merely `Up`) before the first red test, and bringing it up is the operator's call.

**And a fourth, promoted here because it protects the other three: a flaky test is fixed,
never re-run.** A test that fails and passes on the next run makes red mean "maybe", and
every gate in this project is worth exactly what red is worth. Capture the failing run
before changing anything, name the causes you ruled out, and verify the fix by looping the
suite — one green run is the state the bug already produced. Full rule in `tdd.md`.
