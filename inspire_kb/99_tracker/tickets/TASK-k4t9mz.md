---
id: TASK-k4t9mz
title: Answer the surface-policy decisions per transport so tests stop deriving them
created: 2026-07-30
updated: 2026-07-30
reporter: "@adrian.rodriguez"
closed_by: null
closed_at: null
epic: tooling
size: S
importance: High
skills: [bootstrap, domain, code]
status: Open
blocked_by: []
related_to: [TASK-w3n8qr]
---

## Description

`00_bootstrap/stack.md` resolves `surface_conventions: [graphql, rest]`, which supplies
the derived half of the wire contract — the mapping from a logical error to what a
caller observes. The rest is **not** derivable: two competent engineers legitimately
disagree, so each convention offers a default and refuses to pretend it is a technical
answer. Recorded as *not decided yet* rather than defaulted in silence.

**Two surfaces, so the questions split.** `adr-graphql-query-transport` makes GraphQL
query-only, so every write-side question (validation status, collision, error body) is
the `rest` convention's, not GraphQL's — and the GraphQL policy rows about
expected-domain-error shape do not apply here at all. `stack.md` groups them
accordingly; answer them per surface, and record an inapplicable row as **N/A**, not as
open.

**Answer the auth precondition first.** Nothing in the KB says either surface is
authenticated. If neither is, four of the open rows are moot and should be closed as
N/A in one stroke — asking about token expiry on an unauthenticated API is how a
convention set collects rows nobody can act on.

Until they are answered, the convention's defaults apply. The cost of leaving them open
is not abstract: `/inspire_code tdd` derives its test list from the criteria ∪ the
descriptor's declared errors ∪ the convention's always-present cases, so the first test
written against an unanswered row **pins whatever the agent picked** as though it were
the contract.

## The decisions, by surface

Each is closed-ended; the convention files
(`.claude/skills/_references/conventions/{graphql,rest}.md`, `## Project policy`) carry
the options and the default. `stack.md`'s `## Surface conventions` is the authoritative
list — this is the reasoning behind the hard ones.

**Precondition — is either surface authenticated?** Nothing in the KB says so. A "no"
closes four rows as N/A at once.

**GraphQL (read):**
1. **Absent variant on a single-item query** — `null` in `data` with no error, or a
   project `NOT_FOUND` in `errors`. Highest-impact of the set: query-only surface
   (`adr-graphql-query-transport`), so this is the most-exercised path in the product.
   Default: `null` with no error — "not found" is a valid answer to a query, not a
   failure to answer.
2. **Nullability of list fields** — `[T!]!` or nullable. Default: `[T!]!`.
3. **Partial success on a multi-field query** — allowed (`data` and `errors` together,
   the protocol's own semantics) or all-or-nothing. Default: allowed, and then every
   test asserts both halves.

**HTTP (write):**
4. **Validation failure status** — `400` or `422`. The live one:
   `analytics.variant.create` already declares `missing_required_field` and
   `invalid_enum_value` and neither has an observable response, so the e2e for ANL-01
   cannot be written from the spec today. Default: `400`.
5. **Natural-key collision on insert** — `409`, or not an error at all. Read the ADR
   before answering: an insert never updates, and out-of-order `version_date` values are
   legal, so two records for the same `(project_id, collection, uri)` may be the designed
   behavior rather than a collision. Deciding it is *not* an error is a valid answer and
   the more likely one.
6. **Error body shape** — `problem+json` or a project schema. Default: `problem+json`.

**Both, only if authenticated:**
7. **Where the auth check runs** — HTTP middleware (a real `401`/`403`, no GraphQL body,
   because nothing executed) or an in-execution guard (`200` + a code, optionally lifted
   via `extensions.http`). Verified against `@apollo/server` 5: execution errors default
   to `200`, pre-execution parse/validation errors are `400`, and any error can override
   its status through `extensions.http`. Default: in-execution guard, status lifted.
8. **Auth error code vocabulary** — `UNAUTHENTICATED` / `FORBIDDEN` or project names.
   These are **not** Apollo codes: they were `AuthenticationError` / `ForbiddenError`
   classes in Apollo Server 2–3, removed in 4. The built-in enum is
   `INTERNAL_SERVER_ERROR` · `GRAPHQL_PARSE_FAILED` · `GRAPHQL_VALIDATION_FAILED` ·
   `PERSISTED_QUERY_NOT_FOUND` · `PERSISTED_QUERY_NOT_SUPPORTED` · `BAD_USER_INPUT` ·
   `OPERATION_RESOLUTION_FAILURE` · `BAD_REQUEST`. Default: keep the pre-4 names — the
   shared vocabulary outlived the classes.
9. **Expired credential** — same code as an absent one, or distinct. Default: distinct,
   because the client's remedy differs (refresh vs re-login).

## Suggested follow-up

- Run `/inspire_bootstrap stack`, answering the auth precondition first and then the rest
  in one pass; it writes them into `stack.md`'s `## Surface conventions` tables.
- Where an answer departs from the convention default, keep the reason in the row — the
  next reader needs the why, not just the what.
- No action descriptor needs editing for any of this: the whole point is that the answer
  lives once in `stack.md`. Only a genuine per-action departure gets a
  `**Surface deviation:**` note.

## Acceptance criteria

- Every row in `stack.md`'s `## Surface conventions` tables names a decision or **N/A**
  with the reason it does not apply; none reads
  *not decided yet*.
- Each row that differs from the convention's default carries its reason.
- No status code, error code or null-vs-error choice is restated in any action
  descriptor — except as an explicit `**Surface deviation:**` with a written reason.
