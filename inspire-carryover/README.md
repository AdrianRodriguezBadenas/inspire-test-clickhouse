# Runtime carry-over — local edits on INSPIRE 0.1.0

Everything this fork changed in the **guardrail runtime**, extracted so it can be
re-applied after upgrading to a newer INSPIRE. Product-side work (`.inspire_kb/`,
`source/`, `prototype/`, `.escape-hatches.json`) is **not** here — the upgrade tooling
leaves those alone by design.

- **Base:** INSPIRE 0.1.0, commit `2fa511b` (the *tagged* 0.1.0 — the upgrade ADR notes
  that two different runtimes both shipped as `0.1.0`; this fork descends from the
  tagged one, so version detection resolves cleanly).
- **Target at time of writing:** 0.6.0.
- **Delta:** 61 files under `.inspire/` — 45 added, 16 modified. `.claude/{skills,bin,hooks}`
  was verified byte-identical to `.inspire/`, so it is a deploy and contributes nothing
  extra to carry.

## Contents

| Path | What it is |
|---|---|
| `new-files/` | The 45 added files, verbatim, tree relative to `.inspire/`. Re-apply by copying. |
| `patches/` | One patch per modified file (16), paths relative to `.inspire/`. Re-apply by porting hunks. |
| `full-runtime.patch` | The whole delta in one file. Audit / fallback only. |

Patches are relative to `.inspire/`, so a family can be applied with
`git apply --directory=<new root for that family>` — see *Path mapping* below. Expect
most of them to conflict and need porting by hand: upstream rewrote almost every file
they touch.

## The five themes

The 61 files are five coherent pieces of work, not scattered tweaks. **None of the five
exists upstream at 0.6.0** — verified by grepping the 0.6.0 base for `escape-hatch`,
`mutation drill`, `Quality gates`, `@covers` and `surface convention`: zero hits outside
prose this fork itself edited. So nothing here has been superseded, and all five are
candidates for an upstream PR rather than things to reconcile.

### 1. The escape-hatch ratchet — deliberate suppressions may only decrease

Counts rule suppressions (`@ts-expect-error`, `as any`, `x!`, `eslint-disable`) in the
product code against per-pattern ceilings in `.escape-hatches.json`; `--update` can only
lower them. The one validator that reads `source/` instead of the KB, and deliberately
absent from `review.sh`'s default rule list so a KB review never starts judging product
code.

- `new-files/bin/escape-hatch-ratchet.sh` (173 lines) + 10 fixtures
- Wired into `hooks/pre-commit.sh` (scoped: only when the commit touches a configured
  scope dir) and `hooks/pre-pr.sh` (unscoped: last gate before merge)
- Both hooks **fail loudly if the config exists but the enforcer is not installed** — a
  declared gate that silently does not run is worse than no gate

### 2. Nothing untested — declared errors and acceptance criteria are traced to tests

Two validators, both lifecycle-progressive (warn while draft/planned, block from
accepted/in-progress on):

- `new-files/bin/declared-errors-tested.sh` (99 lines) — every error in a descriptor's
  `## Errors` appears as a literal in a test file. 5 fixtures.
- `new-files/bin/criteria-have-tests.sh` (141 lines) — every acceptance criterion carries
  a **stable id** claimed by a test through `/** @covers {id} */`. Two findings: *carries
  no id* and *is claimed by no test*. 5 fixtures.

The id convention (`{feature-id}-N`, assigned once, never renumbered, never in the test
name) is specified in the `inspire-feature/SKILL.md` patch. Deliberately one-directional:
it asks whether each criterion is tested, never whether each test is specified — a test
with no criterion is normal.

Shared test-file discovery lives in `patches/bin~_lib.sh.patch`
(`sdd_find_test_files`, `sdd_literal_in_tests`, `sdd_covers_in_tests`,
`SDD_TEST_SCOPE`, `SDD_TEST_GLOBS`, `SDD_FEATURES_ROOT`) so the two gates cannot drift
on what a test file *is*. Two bugs already paid for in there and worth keeping: the
hyphen globs (`*-spec.*` — `*.spec.*` does not match `create.e2e-spec.ts`) and the
`@covers` id boundary (`ANL-02-1` is a substring of `ANL-02-10`).

### 3. Quality-gate layering — which layer owns a rule

- `new-files/skills/_references/quality-gates.md` (136 lines) — absolutes vs ratchets,
  and why a threshold must live outside the author's write reach
- `patches/skills~inspire-bootstrap~SKILL.md.patch` — `stack` installs the in-repo gates
  from the resolved profiles, seeds `.escape-hatches.json` from what the code actually
  contains (measured *before* raising the lint set), and hands the server-side half to a
  tracker ticket instead of a printed checklist
- `patches/skills~inspire-code~profiles~{nestjs,react,_example,README}.md.patch` — a
  `## Quality gates` section per profile, including rules **dropped with their reason**
  (notably: `complexity` measured and rejected on real code — a 12-case dispatch switch
  scores 15 cyclomatic while being trivially readable)
- `patches/skills~inspire-extract~references~bootstrap-comparison.md.patch` — a
  brownfield source's installed gates migrate upward by default: they are evidence, not
  opinion, and the code already passes them
- `patches/skills~inspire-code~references~review-dimensions.md.patch` — a mechanical
  check that slips through is reported as category `Tooling gap` naming the config that
  should own it, not as the instance

### 4. The mutation drill — TDD step 6

A green suite proves the tests ran, not that they would have failed. The agent is the
mutation engine, scoped to the diff, k = 5–10 mutations, with a targeted catalogue and
a revert-between-each procedure. A check, not a metric: no score, no baseline, no tool.
(This fork already decided against Stryker; the drill is the replacement, and both stack
profiles record that trade-off explicitly under *Dropped, with the reason*.)

- `patches/skills~inspire-code~references~tdd.md.patch` — the drill (step 6), plus the
  test-infrastructure precondition ("no infrastructure, no red; no red, no TDD" —
  healthy, not merely `Up`, and started by the operator), plus the collection/pagination
  assertion rule (envelope's exact key set + members' natural keys in order — a count
  cannot tell a correct page from an off-by-one returning the same number of wrong rows)
- `patches/skills~inspire-code~SKILL.md.patch` — principles renumbered to 9; the drill
  and the infrastructure precondition promoted to principles
- `review-dimensions.md` — the drill on demand in Phase 4, the single bounded exception
  to `review` being read-only

### 5. Surface conventions — wire behavior decided once, at bootstrap

- `new-files/skills/_references/conventions/{README,rest,graphql,_example}.md` (390 lines)
  — what a caller observes per logical error, resolved from `stack.md`'s
  `surface_conventions:`
- `patches/skills~inspire-bootstrap~SKILL.md.patch` — selection + the closed-ended
  project-policy questions, asked once
- `patches/skills~inspire-domain~references~format-action.md.patch` and
  `~examples~canonical-action.md.patch` — the descriptor names the logical error, the
  convention maps it to a response; `**Surface deviation:**` is the only per-action
  override, and one without a written reason is a finding
- `patches/skills~inspire-feature~SKILL.md.patch` — criteria must **not** restate the
  convention's always-present cases, must cover every declared error, and must never be
  reverse-engineered from the test suite

> ⚠️ **Naming collision.** 0.6.0 introduced its own `_references/surface-scope.md`, where
> a *surface* is a deliverable that faces someone (`ui` / `headless` / `lib`) — a
> monorepo shell, not a wire contract. Different concept, same word. On promotion this
> theme needs renaming (e.g. *wire conventions*) or upstream will read as if one file
> contradicted the other.

## Per-file status against 0.6.0

`ours` is the size of this fork's edit; the last column is what upstream did to the same
file between 0.1.0 and 0.6.0.

| File (relative to `.inspire/`) | ours | Upstream 0.6.0 |
|---|---|---|
| `bin/criteria-have-tests.sh` | +141 | absent — ours only |
| `bin/declared-errors-tested.sh` | +99 | absent — ours only |
| `bin/escape-hatch-ratchet.sh` | +173 | absent — ours only |
| `bin/test/fixtures/**` (37 files) | new | **no destination** — see below |
| `skills/_references/quality-gates.md` | +136 | absent — ours only |
| `skills/_references/conventions/**` (4 files) | +390 | absent — ours only |
| `bin/_lib.sh` | +66 | changed (10+/10−) |
| `bin/README.md` | +18 | changed (9+/8−) |
| `hooks/pre-commit.sh` | +65 −11 | changed (18+/38−) |
| `hooks/pre-pr.sh` | +33 −1 | changed (18+/33−) — also gained a trust-summary line |
| `skills/inspire-bootstrap/SKILL.md` | +60 | changed (103+/23−) — surfaces delegation |
| `skills/inspire-code/SKILL.md` | +30 −9 | changed (65+/6−) — surface-roster awareness |
| `skills/inspire-code/profiles/README.md` | +9 | changed (15+/4−) |
| `skills/inspire-code/profiles/_example.md` | +12 | **untouched** — patch should apply clean |
| `skills/inspire-code/profiles/nestjs.md` | +88 −3 | changed (7+/0−) |
| `skills/inspire-code/profiles/react.md` | +40 | changed (6+/0−) |
| `skills/inspire-code/references/review-dimensions.md` | +27 −5 | changed (4+/2−) — new import-boundary dimension |
| `skills/inspire-code/references/tdd.md` | +189 −3 | changed (1+/1−) — nearly clean |
| `skills/inspire-domain/examples/canonical-action.md` | +1 −1 | changed (1+/1−) |
| `skills/inspire-domain/references/format-action.md` | +14 −2 | changed (1+/1−) |
| `skills/inspire-extract/references/bootstrap-comparison.md` | +11 | **untouched** — patch should apply clean |
| `skills/inspire-feature/SKILL.md` | +47 −2 | changed (54+/24−) — blast radius |

Cheap wins: `tdd.md`, `format-action.md`, `canonical-action.md`, `profiles/_example.md`
and `bootstrap-comparison.md` barely moved upstream. The real porting work is
`inspire-bootstrap/SKILL.md`, `inspire-feature/SKILL.md`, `inspire-code/SKILL.md` and
both hooks.

## Path mapping — where each family lands after the upgrade

The `pre-0.3 → 0.3.0` hop moves the roots. Verified against `plugin/scripts/hops/0.3.0.sh`
and `hops/layouts.tsv`:

| pre-0.3 (here now) | 0.3+ |
|---|---|
| `.claude/bin/*.sh` | `.inspire/bin/*.sh` |
| `.claude/hooks/*.sh` | `.claude/inspire/hooks/*.sh` |
| `.claude/skills/**` | `.claude/skills/**` — unchanged |
| `.inspire_kb/` | `inspire_kb/` |
| `.inspire/{skills,templates,install.sh,manifest.json}` | retired — the staged-source model is gone |
| `.claude/bin/test/` | **nothing** — `bin/test/` never materializes from 0.3 on |

Three consequences that will bite if unhandled:

1. **The hop moves only the 14 shipped validators, by name.** Our three extras are not
   in that list, so they stay behind in `.claude/bin/` while everything else moves to
   `.inspire/bin/`. Move them manually.
2. **The hooks reference `$PROJECT_ROOT/.claude/bin/…` as a literal path** — for
   `review.sh`, `escape-hatch-ratchet.sh`, `declared-errors-tested.sh` and
   `criteria-have-tests.sh`. Every one of those must become `.inspire/bin/…` after the
   hop, or the gates silently do not run (which our own error branches are written to
   refuse — they will fire, loudly, which is the design working).
3. **The fixtures have no home in a project any more.** `bin/test/` is not materialized
   from 0.3 on, so the 37 fixtures and the `run-tests.sh` workflow only make sense in
   the plugin repo (`plugin/base/bin/test/`). They are preserved here for the upstream
   PR; do not try to re-plant them under `.inspire/bin/test/`.

Also: `hooks/pre-commit.sh` greps for `^.inspire_kb/04_domain/` and `pre-pr.sh` passes
`.inspire_kb/04_domain` / `.inspire_kb/03_features` as arguments. After the KB move those
literals become `inspire_kb/…`. Upstream's own rewrite of these hooks handles its half;
our added blocks carry these paths and must be updated with them.

## Re-apply order

1. Upgrade first, on a branch, and let `/inspire:update` finish. At its per-file
   questions, answer **base** for everything: this bundle is the copy of record for our
   side, so taking base keeps the diff comprehensible instead of merging blind.
2. Copy the 8 hand-authored files that upstream has no counterpart for
   (`bin/*.sh` ×3, `_references/quality-gates.md`, `_references/conventions/` ×4) into
   their new roots.
3. Port `_lib.sh` — additive only, no upstream line touched. Should be mechanical.
4. Port the two hooks, fixing the `.claude/bin/` → `.inspire/bin/` and `.inspire_kb/` →
   `inspire_kb/` paths as you go.
5. Port the skill prose, cheapest first (see the table). Re-check every relative link:
   `../_references/…` depth is unchanged, but upstream may have moved the section a
   pointer lands in.
6. Verify: the acceptance test is that the gates still **fire**. Break something on
   purpose — add an `as any` past the ceiling, drop a `@covers`, delete a test for a
   declared error — and confirm each of the three validators reports it. A gate that
   installs cleanly and refuses nothing is the failure mode all of this exists to
   prevent.

## Then: upstream

All five themes are absent from 0.6.0 and were built here for reasons that are not
specific to this product. The path is a PR to `Genomcore/inspire` against
`plugin/base/…`, where the fixtures also finally have a home. Rename the *surface
conventions* theme first — see the collision note above.
