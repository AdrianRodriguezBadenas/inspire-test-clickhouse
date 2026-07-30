---
kind: inspire-code-profile
id: react
layer: frontend
---

## Layering
Presentation stays dumb; logic flows outward through thin layers. **Components** —
render + local UI state only; no business logic, no direct data access. **Hooks** —
orchestrate state and side effects, expose intent to components. **Use-cases /
services** — the business logic, framework-free where possible. **Repository /
infrastructure** — all data access behind an interface, with a mock/real switch so
the UI is testable without a backend. Global state in a dedicated store, not in
prop-drilled component state.

## Test conventions
- **Unit / component** — the component test runner + Testing Library; query by role
  first (`getByRole` > `getByText` > `getByTestId`), assert what the user sees, not
  internals.
- **E2E** — the project's browser test runner against the running app.
- GIVEN/WHEN/THEN. **Mocks are centralized** (a `tests/**/mocks/` layer), never
  inline per-test; a test overrides only the fields it cares about.
- Run: `npm run test` · `npm run test:e2e`.

## Forbidden patterns
- **No business logic or data fetching in components** — push it to a hook /
  use-case.
- **No inline mocks** — register them in the shared mock layer.
- **No hardcoded user-facing strings** — labels, errors, and tooltips go through the
  i18n / constants layer.
- **Sanitize external URLs** before using them in `href`/navigation; never
  `dangerouslySetInnerHTML` with unsanitized input.

## Review focus
- **styling**: uses the design-system tokens (`05_screens/design-system.md`) and the
  shared component layer; no hardcoded colors/spacing, no ad-hoc one-off styles.
- **accessibility**: interactive elements are keyboard-navigable with correct roles,
  labels, and focus management; forms announce errors.
- **security**: forms, auth, and navigation validate input and guard against
  XSS/open-redirect.

## Quality gates
**Absolute** (eslint):
- `typescript-eslint` **`strictTypeChecked`**, not `recommendedTypeChecked`.
- `complexity` (max 10) · `max-depth` · `max-lines-per-function` — a component that
  trips these is one that should have been split, or had its logic pushed into a hook.
- `eslint-plugin-import`: `import/no-cycle`, plus `import/no-restricted-paths` so
  components cannot reach infrastructure directly — the `## Layering` boundary
  enforced instead of reviewed.
- `eslint-plugin-jsx-a11y` — accessibility belongs here, not in a lens a human
  re-reads on every diff; the `accessibility` review focus above then covers only what
  lint cannot see (focus management, announcement order).
- the test runner's lint plugin: `expect-expect` · `no-disabled-tests` ·
  `no-focused-tests`.

**Ratcheted** (aggregates; baseline kept outside the repo per Rule 3):
- **coverage** — the test runner's threshold as the in-repo floor.
- **bundle size**, when the project ships to browsers — a budget that may shrink,
  never grow.

**Dropped, with the reason** (Rule 2's third branch):
- **mutation score as a ratcheted metric** — replaced by the per-diff **mutation
  drill** ([`../references/tdd.md`](../references/tdd.md), step 6). Same trade as the
  backend profile: no aggregate number for test strength, no coverage of code older
  than the drill, in exchange for no tool to own and no baseline to keep honest. On
  components the highest-value mutations are the render-path ones — invert a conditional
  render, drop a `key`, swap a handler's argument — because a test that only asserts
  "renders without crashing" survives every one of them.

**Escape hatches** (Rule 4 — named, justified, counted):
- `@typescript-eslint/ban-ts-comment` at `allow-with-description`; `@ts-expect-error`
  over `@ts-ignore`, since it expires once the real error is fixed.
- `@eslint-community/eslint-plugin-eslint-comments`: `require-description` ·
  `no-unlimited-disable` · `no-unused-disable`.
- Counted and ratcheted in-repo (`.escape-hatches.json`, enforced by
  `.claude/bin/escape-hatch-ratchet.sh`) alongside `as any` / `x!` and any
  `eslint-disable` of `jsx-a11y` — an accessibility suppression is the one most worth
  seeing a number for, because nothing else in the pipeline notices it. Give it its own
  pattern id rather than folding it into the general count, so it cannot hide behind a
  budget spent on type casts.

## Build & verify
build: `npm run build` · lint: `npm run lint` · types: `npx tsc --noEmit` ·
tests: `npm run test` + `npm run test:e2e`
