---
id: 20260817_criteria-gate-stays-one-directional
kind: lesson
title: The criteria gate asks only whether each criterion is tested
skill: feature
category: pattern
created: 2026-08-17
reporter: "@adrian.rodriguez"
inspire_version: "0.6.0"
template_sha: "6127024"
supersedes: null
related_to: ["20260730_a-rule-is-not-in-force-until-loaded-or-checked"]
---

When checking acceptance criteria against tests, ask only whether every criterion is tested and never whether every test is specified, because a test with no criterion is normal — it may come from the surface convention, an ADR invariant, or ordinary engineering.
Not: reporting an orphaned test as a finding, which inflates the contract with programming conventions.
