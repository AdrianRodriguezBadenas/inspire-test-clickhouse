---
id: TASK-88lo0t
title: Install Railway's GitHub App so push-to-deploy actually works
created: 2026-08-19
updated: 2026-08-19
reporter: "@adrian.rodriguez"
closed_by: null
closed_at: null
epic: tooling
size: XS
importance: Medium
skills: [code]
status: Open
blocked_by: []
related_to: []
---

## Description

`adr-railway-deployment-topology` decides that deployments are git-linked. They are not, yet:
Railway reports for the `api` service

    enabled: false · canEnable: false · reason: NO_INSTALLATION

because Railway's **GitHub App is not installed** on
`AdrianRodriguezBadenas/inspire-test-clickhouse`. A push reaches GitHub and nothing reaches
Railway, so every deployment so far was triggered by hand against a named commit.

## Why this is an operator task and cannot be automated

Installing a GitHub App is a **browser consent flow**: GitHub requires the account owner to
approve the installation and choose which repositories it may read. No API token can perform
it on the owner's behalf, which is the point of the design — so this ticket exists rather than
a script.

## What to do

1. Railway → service `api` → **Settings → Source**, connect the repository; it offers to
   install the app. Or go straight to `github.com/apps/railway/installations/new`.
2. Grant it `inspire-test-clickhouse`.
3. Verify by pushing a change under `source/` and confirming a deployment appears, then
   pushing a knowledge-base-only change and confirming **no** deployment appears — the second
   half is the one worth checking, because it is what `watchPatterns` exists for.

## Already done, so do not redo it

`watchPatterns` is set to `source/**` and verified correct against the documentation:
patterns operate from the repository root even when a Root Directory is set, so no leading
slash or `/source` prefix is needed. It was briefly suspected of blocking deploys; it was not
the cause.
