---
id: TASK-w3n8qr
title: Install the project's quality gates and declare the aggregate-metrics service
created: 2026-07-29
updated: 2026-07-29
reporter: "@adrian.rodriguez"
closed_by: null
closed_at: null
epic: tooling
size: M
importance: High
skills: [bootstrap, code]
status: Open
blocked_by: []
related_to: []
---

## Description

`00_bootstrap/stack.md` now declares the quality gates this project is trusted through,
and the `nestjs` profile enumerates the concrete rules. The installed configuration is
below both. This ticket closes the distance, and carries the part no skill can install.

## Current state (measured 2026-07-29)

- `source/eslint.config.mjs:7` is on `tseslint.configs.recommendedTypeChecked`, not
  `strictTypeChecked` — so `no-non-null-assertion` and the stricter `any` rules are not
  in force.
- No `complexity` / `max-depth` / `max-lines-per-function` / `max-lines`.
- No `eslint-plugin-import` — neither `import/no-cycle` nor `import/no-restricted-paths`,
  so the four-layer boundary (`controllers → application → infrastructure`, `domain/`
  importing nothing) is a review comment rather than a build error.
- No `eslint-plugin-jest` — `expect-expect` in particular is missing, which is the rule
  that catches a generated test asserting nothing.
- No escape-hatch rules: `ban-ts-comment` is not pinned to `allow-with-description`,
  and `eslint-comments` (`require-description`, `no-unlimited-disable`,
  `no-unused-disable`) is absent.
- `package.json` declares no jest `coverageThreshold`.
- No external metrics service holds the coverage history.

## Suggested follow-up

1. **Raise the lint set** to what the profile specifies. Each rule enters **absolute**
   if the existing violations are few; where there are many it enters scoped to changed
   files, and the cleanup stays on this ticket. Never dropped silently.
2. **Escape-hatch ceiling.** Count the current suppressions plus `as any` /
   `as unknown as` / `x!`, commit that number as the ceiling, and wire a check that
   fails when it rises. Measure **before** step 1 — raising the lint set is what
   produces new suppressions, so the honest baseline only exists now.
3. **Coverage floor** in the jest config, set from what the suite currently achieves,
   not from an aspiration.
4. **Declare the aggregate-metrics service** in `stack.md` and install the in-repo
   bridge (CI job + reporter config). Until a service holds the history there is no
   ratchet, only a floor the same change can lower — that is the gap, and it is why
   this step is not optional.

## Operator-owned — outside every skill's reach

These cannot be installed by any `inspire-*` skill and must not be reported as done by
one. A flawless CI workflow protects nothing if the default branch accepts a red check.

- [ ] Protect the default branch so a failing check **blocks** the merge.
- [ ] Set the metrics service's own pass condition to something strict, and confirm it
      is enforced on pull requests rather than only reported.

## Acceptance criteria

- `npm run lint` fails on: a non-null assertion, a cross-layer import, a `@ts-ignore`,
  an undescribed `eslint-disable`, and a test with no assertion.
- Adding one escape hatch beyond the committed ceiling fails the check; removing one
  and lowering the ceiling passes.
- `stack.md`'s `## Quality gates` names the metrics service, and the "not declared yet"
  paragraph is gone.
- Both operator checkboxes above are ticked by a human, with the branch protection
  verified by an actual red check failing to merge.
