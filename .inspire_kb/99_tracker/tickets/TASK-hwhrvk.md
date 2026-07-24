---
id: TASK-hwhrvk
title: Authentication + tenant isolation for variant endpoints
created: 2026-07-24
updated: 2026-07-24
reporter: "@adrian.rodriguez"
closed_by: null
closed_at: null
epic: analytics
size: L
importance: Very High
skills: [feature, domain, code]
status: Open
blocked_by: []
related_to: []
---

## Description

Security review found two critical gaps on the variant endpoints. Currently deferred
(no auth module yet) but must be closed before any non-test deployment.

## Findings (from /inspire-code review · security)

- **No authentication.** `POST /variants`, `GET /variants`, `GET /variants/:id` are
  reachable with zero credentials — no guard, no global `APP_GUARD`.
- **IDOR / cross-tenant read.** `project_id` is taken from client input with no
  ownership check, so anyone can enumerate any project's data (PHI/PII-grade). Both
  the list filter and `get` are affected.

## Suggested follow-up

- Add authn (e.g. JWT guard) and derive tenant/project scope from the authenticated
  principal, not from client input; validate project membership before querying.
- This likely warrants its own auth module/feature — spec it via `/inspire-feature`
  + `/inspire-domain` before coding.

## Acceptance criteria

- [ ] Every variant endpoint requires authentication.
- [ ] A caller can only read/write variants for projects it owns; `project_id` is
      not trusted from client input.
