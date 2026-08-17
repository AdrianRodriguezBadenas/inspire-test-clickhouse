---
id: 20260817_rule-needs-a-loader-or-a-checker
kind: lesson
title: A new skill rule goes where something loads it or something checks it
skill: runtime
category: pattern
created: 2026-08-17
reporter: "@adrian.rodriguez"
inspire_version: "0.6.0"
template_sha: "6127024"
supersedes: null
related_to: ["20260730_a-rule-is-not-in-force-until-loaded-or-checked"]
---

When adding a rule to a skill, put it where something loads it or something checks it — a validator, a hook, or CLAUDE.md — because a rule that is only written is not in force.
Not: prose added to a skill reference that nothing invokes and no gate enforces.

> Example: the escape-hatch ratchet moved from a paragraph in `quality-gates.md` to `.inspire/bin/escape-hatch-ratchet.sh` wired into `pre-commit`.
