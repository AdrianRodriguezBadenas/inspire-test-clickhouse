---
kind: inspire-code-profile
id: nestjs
layer: backend
---

## Layering
Domain-driven, four layers. **domain/** — pure TypeScript interfaces, types, enums;
no framework imports. **infrastructure/** — persistence entities, repositories
(data access + a `toDomain()` mapper), and adapters for external systems; HTTP calls
to other services are wrapped in a repository too. **application/** — services hold
the business logic; one primary service per aggregate, dedicated services for
complex flows (no God objects). **controllers/** — DTOs (request DTOs implement the
domain interface; response DTOs map in their constructor) + the controller. Business
logic never lives in a controller.

## Test conventions
- **Unit** (`*.spec.ts`) — services with their dependencies mocked (a typed
  auto-mock helper, not hand-rolled objects); assert the returned value **and** each
  collaborator call.
- **E2E** (`*.e2e-spec.ts`) — **written first**, from the acceptance criteria: they
  describe what a caller observes, which is this level. Controllers and DB repositories
  against a **real database**; mock only what sits outside the boundary and assert what
  crossed it — the outbound HTTP request that was made (intercept and assert URL, method
  and body), and the full payload plus topic/key of every event published. E2E never
  overrides providers.
- HTTP repositories (call an API, not a DB) are unit-tested — the contract is the
  parsing/mapping, not the transport.
- GIVEN/WHEN/THEN; use test-data builders so each test sets only the significant
  fields. Assert full response bodies and full persisted documents, built from the
  domain entity — never compared against the value under test.
- Run: `npm run test` (unit) · `npm run test:e2e` (e2e).

## Forbidden patterns
- Services throw a **generic `Error` with `cause`**, never HTTP exceptions —
  translating to HTTP is the controller/filter's job.
- **Repositories never validate input** — validation lives in the DTO (with a
  controller) or the service (without one).
- DI by concrete class when there is one implementation; an abstract class as the
  contract when there are several. Never interface + string token + `@Inject`.
- No ORM/DB technology in class names (`EmailTemplateRepository`, not
  `…MongooseRepository`).

## Review focus
- **api-contract**: request/response DTOs validate at the boundary
  (`class-validator`) and the OpenAPI/Swagger surface (`@ApiProperty`,
  `@ApiOperation`, `@ApiResponse`) matches the actual shape.
- **security**: OWASP checks on new endpoints, guards, and auth logic —
  authorization (not only authentication), input validation, no sensitive data in
  logs or error responses.

## Quality gates
**Absolute** (eslint — the agent hits these in its own loop and fixes them before
anything reaches the operator):
- `typescript-eslint` **`strictTypeChecked`**, not `recommendedTypeChecked` — it
  brings `no-non-null-assertion` and the stricter `any` rules with it.
- `complexity` (max 10) · `max-depth` · `max-lines-per-function` · `max-lines`.
- `eslint-plugin-import`: `import/no-cycle`, plus `import/no-restricted-paths` to make
  the four-layer boundary above a build error instead of a review comment
  (controllers → application → infrastructure; `domain/` imports nothing).
- `eslint-plugin-jest`: `expect-expect` (a test that asserts nothing — the
  characteristic failure of generated tests) · `no-disabled-tests` ·
  `no-focused-tests` · `no-conditional-expect`.

**Ratcheted** (aggregates; baseline kept outside the repo per Rule 3):
- **coverage** — `npm run test -- --coverage`; jest's `coverageThreshold` is the
  in-repo floor, the history lives in the metrics service.

**Dropped, with the reason** (Rule 2's third branch — a rule that does not hold here
is written down, never silently missing):
- **mutation score as a ratcheted metric.** Coverage proves a line ran, not that a
  test would fail if its behavior changed — so the gap is real. It is closed per-diff
  by the **mutation drill** ([`../references/tdd.md`](../references/tdd.md), step 6)
  with the agent as the mutation engine, not by a repo-wide score. Consequence, stated
  plainly: there is **no aggregate number** for test strength in this stack, and the
  drill is bounded to changed files — code that predates the drill is not covered by
  it. What buys the trade is that a diff-scoped drill needs no tool to own, no baseline
  to store, and no CI budget to defend.
- **Property-based testing** (`fast-check`) is the complement for `domain/` — pure
  types and rules with invariants. It tests the code with varied inputs; the drill
  tests the tests. Neither replaces the other.

**Escape hatches** (Rule 4 — named, justified, counted):
- `@typescript-eslint/ban-ts-comment` at `allow-with-description` — `@ts-expect-error`
  permitted with a reason, `@ts-ignore` never (expect-error expires by itself when the
  underlying error is fixed).
- `@eslint-community/eslint-plugin-eslint-comments`: `require-description` ·
  `no-unlimited-disable` · `no-unused-disable` — a suppression must name its rule and
  say why, and a stale one is an error rather than a fossil.
- The repo-wide count of suppressions plus `as any` / `as unknown as` / `x!` is
  **ratcheted in-repo** — the one baseline Rule 3 allows inside the repository, because a
  suppression is source text and the ceiling bump shows up in the same diff. Patterns and
  ceilings go in `.escape-hatches.json`; enforced by `.claude/bin/escape-hatch-ratchet.sh`
  from `pre-commit`.

Test-file relaxations are enumerated **per rule with a written reason**. Two legitimate
cases, and they are different in kind:

- **Untyped response boundaries** — HTTP/GraphQL payloads the types cannot prove. Debt:
  it shrinks as the boundary gets modelled.
- **Negative-path construction** — a test that feeds the wrong type to a validator
  (`null as unknown as string`) needs a cast, because the type system preventing it is
  the whole point of the code under test. **Structural, not debt**: its ratchet ceiling
  should hold, not drain, and the config should say so — a ceiling that invites a cleanup
  which cannot happen trains people to ignore it.

Never a blanket disable of the correctness rules for `**/*.spec.ts`.

## Build & verify
build: `npm run build` · lint: `npm run lint` · types: `npx tsc --noEmit` ·
tests: `npm run test` + `npm run test:e2e`

**Test infrastructure — check before the first red test** (the precondition in
[`../references/tdd.md`](../references/tdd.md)). The components come from `stack.md`'s
`## Test infrastructure`; the compose file realizes them:

- Inspect: `docker compose config --services` — every declared component has a service.
- Status: `docker compose ps` — a service must be **healthy**, not merely `Up`. Compose
  services carrying a healthcheck report both, and `Up` is where a flaky e2e suite comes
  from: the container exists, the server is still opening its ports.
- **Ask the operator to run** `docker compose up -d` (or `--wait`, which blocks until
  healthchecks pass). Do not start it silently — they may have it up on other ports or
  pointed at a shared instance.
- Then run `npm run test:e2e` once. A connection error is **not** red; it is a suite that
  never ran.
