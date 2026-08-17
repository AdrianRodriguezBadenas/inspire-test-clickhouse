# /inspire_code review — judgment review of a diff

Review a working diff (or a scoped target) for the things a linter **cannot** catch.
Mechanical checks — formatting, unused imports, `any`/return-type rules, naming,
line length, import order, promise handling — are the toolchain's job. When one of
them slips through, the finding is the **missing gate**, not the instance: report it
as category `Tooling gap`, naming the layer that should own it
([`../../_references/quality-gates.md`](../../_references/quality-gates.md)) and the
rule or tool from the active profile's `## Quality gates`. Never re-read by hand what
a machine could refuse once. This skill spends its tokens only on judgment.

`review` is **read-only**: it reports, ranks, and names the fix (and the skill to
run for it). It never edits code — with one bounded exception, the mutation drill in
Phase 4, which applies and immediately reverts one mutation at a time and must leave
the tree exactly as it found it.

## Workflow

1. **Identify the change** — default to `git diff` / `git diff --cached`; a
   `<target>` may scope it to a path, a commit range, or a `<feature-id>`.
2. **Load the anchors** — the repo's `CLAUDE.md` files (primary coding source of
   truth), the relevant KB (the feature file(s), the action descriptor(s), and any
   ADR the change claims to realize), **and the active stack profile(s)** (SKILL.md
   → Stack profiles).
3. **Run Phase 0 inline**, then fan out phases 1–4 (see "Fan-out").
4. **Rank and report** in the output format below.

## Phase 0 — KB alignment (the INSPIRE differentiator)

This is what a generic code review does not do. Before judging the code on its own
terms, judge it against what the KB says it must be:

- **Acceptance criteria** (`03_features/{module}/{feature-id}.md`) — is every
  testable criterion the diff touches actually covered by a test?
- **Action descriptor** (`04_domain/{module}/{entity}/`) — does the code satisfy
  the contract: inputs, outputs, touched entities, invariants, declared error set?
  Flag behavior that exceeds or contradicts the descriptor.
- **ADR** (`01_adr`) — does the diff contradict a current ADR (present, not
  superseded or rejected) within its maturity's reach? If it claims to move an ADR to
  `implemented`, is the claim true?

A disagreement here is not automatically a code bug — it may be a spec gap. Classify
it: **code wrong → fix in the diff; spec wrong/missing → hand back** to
`/inspire_feature` / `/inspire_domain`. Render SDD-layer findings with the shared
format in [`../../_references/findings-format.md`](../../_references/findings-format.md).

## Phases 1–4 — universal quality (judgment only)

### Phase 1 · Architecture & design
- Code sits in the correct layer (business logic out of controllers/components).
- Shared logic lives in a shared place — not duplicated across features.
- New abstractions are justified — no premature generalization.
- Units are single-responsibility; boundaries validate their input.

### Phase 2 · Logic & correctness
- No semantic duplication the linter can't see (>~70% overlap across files).
- The algorithm is correct for the use case — not merely "it compiles."
- Edge cases handled: null, empty, boundary values, concurrent access.
- Error handling is specific and at the right level; async paths handle failure and
  timeout.

### Phase 3 · Security
- No hardcoded secrets, keys, or credentials.
- No injection / XSS vectors (unsanitized input into DOM, `eval`, dynamic queries);
  external URLs sanitized before use.
- Input validated at the boundary with correct constraints — not just "a validator
  exists."
- No sensitive data in logs or error responses.
- **Authorization** checked, not only authentication.

### Phase 4 · Testing strategy
- New code has tests of the right type for its layer.
- Tests follow GIVEN/WHEN/THEN and verify behavior, not implementation.
- Meaningful edge cases covered — not just the happy path.
- One test = one scenario; mocks are at the right boundary, not over-mocked.
  (Conventions in [`tdd.md`](tdd.md).)
- **Weak assertions are the finding.** A test that runs the new logic and asserts
  `toBeDefined`, a bare truthiness, or a matcher loose enough to accept a wrong value
  passes CI while proving nothing. Where the diff's tests look like that, say which
  mutation would survive them — that is the concrete claim, not "tests are weak".

**Mutation drill on demand.** When the diff is critical (auth, payments, data
mutations, an integration) or its tests read as weak, run the drill from
[`tdd.md`](tdd.md) step 6 against the changed files — *this is the one exception to
`review` being read-only*: it edits, reverts each mutation immediately, and must leave
`git diff` byte-identical to how it found it. Report survivors; never leave a mutation
in the tree. Skip it when the suite is red — a survivor is meaningless then.

## Build verification

Confirm the change builds and tests pass, using the active stack profile's
`## Build & verify` commands when present, else the project's own (e.g. `lint`, a
type-only check, `build`, `test`). If the project uses a private package registry
and install fails with 401/403, authenticate first — the command is project-specific
(see [`fix-build.md`](fix-build.md)). Report pass/fail per step; don't inline the
raw output.

## Fan-out (thorough mode)

For a large or critical diff, run phases 1–4 as **parallel dimension agents**, one
per dimension, then synthesize — the same batch pattern `/inspire_module review`
uses. Each agent gets the diff + the loaded anchors and reports findings in the
row format below. The dimensions:

| Dimension | Focus (what the agent hunts for) |
|---|---|
| architecture | Clean-code / SOLID / DRY / KISS, layering, cyclomatic complexity, unjustified abstraction |
| correctness-chaos | Every way it breaks: edge cases, race conditions, partial failures, timeouts, corrupt state — run especially on critical flows (auth, payments, data mutations, integrations) |
| tests | Coverage of new logic, edge cases, mocking correctness, a regression test for each fix |
| duplication | Copy-pasted / >70%-similar logic across files; propose unification |
| dead-code | Unused exports/vars/types, orphaned files, commented-out blocks left behind by the change |
| surface-boundaries | Only when a surface roster exists (`00_bootstrap/surfaces.md`): an import reaching from one surface's `Package` path into another's — cross-surface sharing belongs in a `lib` package |

**Add one agent per active stack profile's `## Review focus` entry** (e.g.
api-contract, styling, a11y, security) — the stack-concrete lenses layered on top of
the universal dimensions above. A profile with no `## Review focus`, or no profile
at all, just means the universal set.

Scale to the change: a small diff runs inline; "review thoroughly" / a critical flow
runs the full fan-out. Keep dimensions read-only.

## Output format

```markdown
## Code Review — {target} | {date}

### KB alignment (Phase 0)
- ADRs: {ok | contradicts adr-xxx} · Descriptor: {satisfied | gap} · Acceptance criteria: {N/N covered}
- Hand-backs: {none | /inspire_domain <id>: <why>; /inspire_feature <id>: <why>}

### Tooling: lint {PASS/FAIL} · types {PASS/FAIL} · build {PASS/FAIL} · tests {PASS/FAIL}
Escape hatches: {n} (ceiling {m}) — {new ones in this diff, file:line, with their reason}
Mutation drill: {not run | k mutations, n survived} — {file:line — mutation → the missing test}

### Issues (judgment-based)
| Severity | Category | File:Line | Description | Fix |
|---|---|---|---|---|
| BLOCKING | Security | src/foo:42 | Hardcoded API key | Move to env var |
| BLOCKING | Correctness | src/bar:15 | Race on concurrent update | Optimistic lock |
| WARNING | Architecture | src/baz:8 | Business logic in controller | Move to service — `/inspire_code tdd` |
| WARNING | Tooling gap | eslint.config | Layer boundary reviewed by hand | `import/no-restricted-paths` |

### Verdict: READY | NEEDS FIXES ({n} blocking, {m} warnings)
```

`BLOCKING` = must fix before merge (security, correctness, KB contradiction).
`WARNING` = should fix. Always name the file:line and the concrete fix (and the
skill to run when the fix is a hand-back). A `Tooling gap` points at the config that
should own the rule, not at the code that broke it. An escape hatch added by the diff
without a written reason, or one that pushes the count past its ceiling, is
`BLOCKING` — the hatch itself is legitimate, going silent or over the ceiling is not.
