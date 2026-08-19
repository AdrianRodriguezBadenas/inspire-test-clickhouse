---
id: 20260819_fix-a-flaky-test-never-rerun-it
kind: lesson
title: A test that fails intermittently is fixed, never re-run
skill: code
category: pattern
created: 2026-08-19
reporter: "@adrian.rodriguez"
inspire_version: "0.6.0"
template_sha: "6127024"
supersedes: null
related_to: ["20260730_a-rule-is-not-in-force-until-loaded-or-checked"]
---

When a test fails and passes on the next run, treat the flakiness itself as the defect and fix it before anything else, because a red result that might mean nothing teaches everyone to stop reading red results.
Not: re-running the suite to get green, or recording the failure as unexplained and moving on.

> Example: the e2e suite failed ~1 run in 4 with no captured assertion. Tracking it and
> carrying on was the wrong call — every gate in this project depends on red meaning something.
