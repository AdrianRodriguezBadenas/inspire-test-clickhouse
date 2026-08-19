---
id: 20260817_declared-gate-without-enforcer-blocks
kind: lesson
title: A declared gate whose enforcer is missing must block, never skip
skill: runtime
category: pattern
created: 2026-08-17
reporter: "@adrian.rodriguez"
inspire_version: "0.6.0"
template_sha: "6127024"
supersedes: null
related_to: ["20260730_a-rule-is-not-in-force-until-loaded-or-checked"]
---

When a config declares a gate whose enforcer is absent, fail loudly instead of skipping, because a gate that silently does not run is worse than no gate at all.
Not: guarding the call with an existence test that exits 0 when the script is missing.

> Example: `pre-commit.sh` emits an `error` finding when `.escape-hatches.json` exists and `.inspire/bin/escape-hatch-ratchet.sh` does not.
