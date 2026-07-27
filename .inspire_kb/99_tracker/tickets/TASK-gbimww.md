---
id: TASK-gbimww
title: Retire the brace-expansion override once upstream ships a patched minimatch chain
created: 2026-07-27
updated: 2026-07-27
reporter: "@adrian.rodriguez"
closed_by: null
closed_at: null
epic: tooling
size: S
importance: Mid
skills: [code]
status: Open
blocked_by: []
related_to: [TASK-j01pke]
---

## Description

`source/package.json` carries `overrides.brace-expansion: ^5.0.8`, added on
2026-07-27 to bring `npm audit` to zero. It is a **knowingly accepted trade**: the
override forces a major across the tree and leaves `minimatch@3.1.5` broken at
runtime. This ticket exists so the trade is retired rather than forgotten — nobody
will reconstruct the reasoning from reading `package.json`.

## Context — the accepted breakage

`brace-expansion` changed its export shape between the vulnerable line and the fix:

- v1: `module.exports = expand` — a function
- v5: `module.exports = { EXPANSION_MAX, EXPANSION_MAX_LENGTH, expand }`

`minimatch@3` does `var expand = require('brace-expansion')` and later calls
`expand(pattern)`, so it now throws. Verified in place:

```
minimatch 3.1.5 → braceExpand('a{b,c}')                TypeError: expand is not a function
minimatch 3.1.5 → match('src/a.ts', 'src/*.ts')        true   ← patterns without braces still work
minimatch 3.1.5 → match('src/a.ts', '{src,test}/*.ts') TypeError: expand is not a function
```

**Blast radius: only patterns containing `{a,b}`.** The consumers are
`@nestjs/cli` → `fork-ts-checker-webpack-plugin` → `minimatch@3.1.5`, and
`jest@29` → `glob@7` → `minimatch@3.1.5`. Neither exercises brace patterns on the
paths the build and the 94 tests cover, which is why everything stays green — the
failure is latent, not absent.

Mitigation already applied: the `lint` script was `eslint "{src,test}/**/*.ts"` (a
brace pattern, so a live consumer of the broken path) and is now
`eslint src test --ext .ts`. It has not been executed, because eslint is still not
installed — see *Notes*.

## Why there was no non-override path

- The advisory's only patched release is `5.0.8`; the `1.x` and `2.x` lines have no
  fix, so no range on those lines can resolve to a safe version.
- Bumping jest to 30 does **not** help: `glob@10` → `minimatch@9` → `brace-expansion
  ^2.0.1`, still unpatched. Tried and reverted (it also breaks the
  `jest-mock-extended@3` peer).
- `@nestjs/cli` is already at latest (11.0.24); `npm audit fix --force` proposes
  *downgrading* it to 6.8.1, which is not a fix.
- Forcing `minimatch: ^10.2.5` alongside it (the version whose API matches
  `brace-expansion@5`) was attempted and abandoned — it cascades majors across
  devtools that expect `minimatch@3`/`@9`.

## Closing condition

Retire the override when **either** chain reaches a patched `brace-expansion`
without forcing it:

- `jest` adopts `glob@11` → `minimatch@10` → `brace-expansion ^5.0.5` (which
  resolves to 5.0.8+), **and**
- `@nestjs/cli` ships a `fork-ts-checker-webpack-plugin` that no longer pins
  `minimatch@3`.

Test removal the way `/inspire_code fix-vulns` prescribes: delete the override,
`npm install`, re-audit, and confirm `high` stays at 0 before keeping it out.

## Acceptance criteria

- [ ] `overrides.brace-expansion` removed from `source/package.json`.
- [ ] `npm audit` still reports 0 high / 0 critical without it.
- [ ] `require('minimatch').braceExpand('a{b,c}')` returns `['ab', 'ac']` instead of
      throwing.
- [ ] `npm run build`, `npm run test` and `npm run test:e2e` all pass.
- [ ] The other two overrides (`js-yaml`, `ws`) are test-removed in the same pass
      and dropped if no longer needed.

## Notes

The other two overrides added at the same time are lower risk (a patch and a minor,
no API change) but are also only necessary because their parents pin exactly:

| Override | Parent pinning it | Retire when |
|---|---|---|
| `js-yaml: ^5.2.2` | `@nestjs/swagger` 11.4.6 pins `5.2.1` exactly | swagger ships a release pinning ≥ 5.2.2 (12.x drops to `js-yaml@4`, unaffected) |
| `ws: ^8.21.1` | `@nestjs/graphql` 13.4.2 pins `8.20.1` exactly — `@next` still does | graphql ships a release pinning ≥ 8.21.0 |

Separate tooling gap, not blocking this ticket: `npm run lint` cannot run at all —
the script exists but **eslint is not installed**. Under INSPIRE that matters
because mechanical checks are meant to be the toolchain's job, not something an
agent re-reads by hand each session.
