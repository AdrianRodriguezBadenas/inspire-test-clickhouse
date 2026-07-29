# /inspire_code tdd — write production code test-first

**No implementation without tests first.** This reference carries two things: the
red-green-refactor loop with its test conventions, and the non-negotiable authoring
rules that hold for *any* code this skill writes (not only under `tdd`).

The unit of work is a **feature**: `tdd {feature-id}` implements the use case at
`.inspire_kb/03_features/{module}/{feature-id}.md`, and its **acceptance criteria
are the test list**. One testable criterion → at least one test. A criterion you
cannot write a test for is a spec problem — hand it back to `/inspire_feature`
before writing code.

> **Stack profile.** Resolve the active profile(s) first (SKILL.md → Stack
> profiles). When one is present, its `## Test conventions`, `## Layering`, and
> `## Forbidden patterns` refine the generic rules below, and its `## Build &
> verify` gives the exact commands to run. No profile → the generic rules stand.

## Workflow

1. **Clarify** — read the feature file and any action descriptor
   (`04_domain/{module}/{entity}/`) that specifies the behavior. Extract inputs,
   outputs, and edge cases from the acceptance criteria and the descriptor's
   contract. Do not invent behavior the KB doesn't state.
2. **Write failing tests** — one per acceptance criterion, using the project's test
   framework. Run them; confirm they fail for the right reason (red).
3. **Implement the minimum** — the simplest code that passes. No speculative
   generality.
4. **Verify** — run the tests (and the build) using the project's commands (green).
5. **Refactor** — with the tests as a safety net. Clean up; re-run.
6. **Mutation drill** — with code and tests settled, check that the tests were
   *complete*: break the code on purpose and confirm they notice (see below). A
   survivor sends you back to step 2, never to step 3.

Steps 1–5 prove the code does what the criteria say. Step 6 proves the **tests would
have caught it if it didn't** — the one thing a green suite cannot tell you about
itself.

## The mutation drill (step 6)

A green suite proves the tests *ran*. It cannot prove they would have **failed** had
the code been wrong — and that is the characteristic defect of generated tests: they
execute the line and assert nothing that pins its behavior down. The drill closes that
hole with the agent as the mutation engine, scoped to the change. It is a **check, not
a metric**: no score, no baseline, no ratchet ([`../../_references/quality-gates.md`](../../_references/quality-gates.md)).

**Preconditions.** The suite is green and the working tree is clean of unrelated
edits. Never drill on a red suite — a survivor means nothing when tests already fail.

**Scope.** Only the files this change touched, and within them the lines that carry
the acceptance criteria's behavior. Budget **k = 5–10 mutations per diff**, spent on
the layers where a silent wrong answer is worst: business logic and domain rules
first, wiring and DTOs last. This bound is the whole reason no tool is needed — the
performance engineering that a general mutation-testing tool exists to solve does not
apply to ten mutants.

**Catalogue** — targeted, judgment-chosen, never random. Judgment is what makes ten
mutants worth more than a thousand:

| Mutation | What a survivor tells you |
|---|---|
| Boundary: `>` ↔ `>=`, `<` ↔ `<=` | No test sits *on* the limit |
| Condition: invert a predicate, `&&` ↔ `\|\|` | A branch is entered but never asserted |
| Return the empty/default value (`[]`, `null`, `0`, the unmapped input) | The assertion accepts any shape |
| Delete an `await` | Nothing observes the ordering or the rejection |
| Delete a side-effecting call (a save, an emit, a log-and-continue) | A collaborator call is unverified |
| Swap two same-typed arguments | The mapping is asserted against itself |
| Error branch → success branch (drop a `throw`) | The declared error set is untested |

**Procedure.** One mutation at a time: apply it, run only the tests that cover the
file (the profile's `## Build & verify` commands, narrowed), record **killed** (a test
failed) or **survived** (all green), then **revert before the next one**. Never hold
two mutations at once, never leave one in the tree, and never commit with one applied
— finish by confirming `git diff` matches the pre-drill state exactly. Discard rather
than count: a mutation that fails to compile, and one that is semantically identical
to the original (it proves nothing either way). A mutated loop condition can hang —
run with a timeout and treat a timeout as killed.

**Reading the result.** Every survivor is a **test gap, not a code bug**: the code was
right before you broke it. Go back to step 2 and write the test that kills it, then
re-run the drill. Report survivors as `file:line — mutation applied → the test that
was missing`; a diff whose drill found nothing says the tests are load-bearing, which
is the only claim worth making at the end of a TDD cycle.

**What complements it, cheaply.** For pure functions with invariants — `domain/`
logic, parsers, mappers — property-based testing (`fast-check` or the stack's
equivalent) covers the orthogonal axis: the drill varies the *code* to test the tests,
properties vary the *inputs* to test the code. Neither substitutes for the other, and
random inputs behind a weak assertion still prove nothing.

## Test structure: GIVEN / WHEN / THEN

Every test has three phases, blank-line separated:

```
it('describes one behavior', () => {
  // GIVEN   — setup; the method-under-test arguments come last, close to WHEN
  // WHEN    — a single statement exercising the logic under test
  // THEN    — the assertions; variables used only for assertions are defined here
})
```

- `// GIVEN`, `// WHEN`, `// THEN` are the only comments the test needs. Skip GIVEN
  when there is no setup.
- **One test = one scenario.** A single WHEN and one asserted outcome. Never bundle
  several calls into one test — split them.
- **Group assertions by concern**, one blank line between groups: returned value
  first, then each collaborator/dependency verification as its own group.
- **Test behavior, not implementation.** Assert observable outcomes and contract,
  not private internals. Prefer the most user-facing query available.
- **Assert the full shape, not fields piecemeal.** For a response body or a
  persisted document, assert the whole object; build the expected value from the
  domain entity, never from the value under test (comparing a result against itself
  proves nothing).
- **Prefer exact values over weak matchers.** Reach for "any"/"contains"/regex
  matchers only for values that are genuinely non-deterministic (generated ids,
  timestamps) — each weakening hides drift.

## Mocking

- **Mock at the boundary, not the internals.** Replace external systems (network,
  DB where the test isn't an integration test, third parties) — not the collaborators
  whose interaction you are trying to verify. Over-mocking tests the mocks.
- **Keep mock setup out of the test body where the project has a convention for it**
  (shared fixtures / builders / factories). Use test-data builders so each test
  specifies only the fields significant to it and lets the rest be defaulted.
- **Integration/e2e tests use the real thing** (real DB, real providers) and mock
  only the outermost external HTTP — verify the request was actually made.

## Choosing the test level

Match the test to the layer, not the file:

| Layer under test | Mock | Real |
|---|---|---|
| Business logic / services (unit) | its dependencies (repos, clients) | the logic itself |
| HTTP/entry boundary (integration) | external systems | the boundary + wiring |
| Data access against a store (integration) | external HTTP | the store itself |

## Non-negotiable authoring rules

These hold for **every** subcommand that writes code (`tdd`, `debug`'s fix,
`fix-build`), and they are what `review` flags when violated. They are the
generic, stack-agnostic core — the toolchain enforces the mechanical rest.

### Never silence the toolchain
Fix the root cause; do not gag the messenger. Forbidden as a default move:
disabling lint rules inline, suppressing type errors (`@ts-ignore` /
`@ts-expect-error` / equivalents), `as any`, `as unknown as X` casts that bypass a
real type error, non-null assertions (`x!`) that disable null-checking at the call
site, and formatter-ignore pragmas. If the type-checker or linter reports a
problem, treat it as a real defect: change the code, the type, or the design.
Narrow with a guard / `??` / a type guard instead of asserting. The only acceptable
use is a documented, reviewed, time-boxed escape hatch — never silent. Concretely:
`@ts-expect-error` rather than `@ts-ignore` (it fails once the real error is fixed, so
it expires on its own), the rule named in the disable comment, a written reason beside
it, and a tracker id when the reason is "later". Those conditions are enforced, not
trusted — see [`../../_references/quality-gates.md`](../../_references/quality-gates.md)
Rule 4 (the linter refuses an undescribed suppression; the repo-wide count is
ratcheted and may only fall).

```ts
// Wrong — silences the symptom
const payload = response.data as any;
const email = user!.email;

// Right — model the type, and narrow explicitly
interface CreateUserResponse { id: string; email: string }
const payload: CreateUserResponse = response.data;
if (!user) throw new Error('user not found');
const email = user.email;
```

Where an invariant lives entirely in the type system (null-safety), encode it in
the signature (`NonNullable<T>`, a non-empty-array tuple) so misuse fails at compile
time — but keep the **runtime** check at the boundary layer, because external data
(JSON, request bodies, DB rows) is the realistic input and the type cannot prove it.

### Never swallow errors silently
A `catch` must do at least one of: re-throw (original or wrapped with `cause`),
handle meaningfully (fallback, compensating action), or log it when "do nothing" is
a conscious, explained choice. Empty `catch {}` blocks and `// swallow` comments are
forbidden — they make incidents undebuggable.

### Validate input at the boundary that owns it
Validate where the boundary is: at the entry DTO/schema when there is one, in the
application/service layer when there isn't. **Data-access code assumes valid input**
— pushing validation into it couples storage to domain rules and hides it from
callers.

### Never commit commented-out code
Delete it — git history is the archive. Exception: a single short comment explaining
*why* something non-obvious was removed.

### Never leave anonymous TODOs
A bare `// TODO` / `// FIXME` is forbidden. Every deferred item names an owner **and**
a closing trigger — and in INSPIRE the trigger is a real ticket:
`/inspire_task create`. If you can't name an owner or a trigger, it isn't
deferred, it's forgotten: do it now or open the ticket first.

## Anchoring back to the KB

- Each test traces to an **acceptance criterion**; if criteria and tests diverge,
  the feature file wins — update tests, or hand the criterion back to
  `/inspire_feature` if it's the criterion that's wrong.
- The implementation realizes an **action descriptor**; honor its inputs, outputs,
  touched entities, invariants, and declared error set. A behavior the code needs
  but the descriptor doesn't cover is a `/inspire_domain` hand-back, not an
  ad-lib.
