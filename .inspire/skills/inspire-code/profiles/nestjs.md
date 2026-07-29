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
- **E2E** (`*.e2e-spec.ts`) — controllers and DB repositories against a **real
  database**; mock only outbound external HTTP (intercept and assert the request was
  made). E2E never overrides providers.
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
  **ratcheted in-repo** (a committed ceiling, checked by the pre-commit / CI job) —
  the one baseline Rule 3 allows inside the repository, because a suppression is source
  text and the ceiling bump shows up in the same diff.

Test-file relaxations are enumerated **per rule with a written reason** — the
`any`-safety rules at untyped HTTP/GraphQL response boundaries are the legitimate
case. Never a blanket disable of the correctness rules for `**/*.spec.ts`.

## Build & verify
build: `npm run build` · lint: `npm run lint` · types: `npx tsc --noEmit` ·
tests: `npm run test` + `npm run test:e2e`
