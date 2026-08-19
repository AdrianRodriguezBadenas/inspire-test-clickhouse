---
id: 20260817_extract-runtime-edits-before-upgrading
kind: lesson
title: Extract this fork's runtime edits before running a runtime upgrade
skill: runtime
category: pattern
created: 2026-08-17
reporter: "@adrian.rodriguez"
inspire_version: "0.6.0"
template_sha: "6127024"
supersedes: null
related_to: ["20260817_extract-fork-runtime-before-a-hop"]
---

Before upgrading the runtime, extract this fork's own runtime edits into a reviewable bundle, because a layout hop retires the tree they live in and the per-file diff against the old base is only cheap beforehand.
Not: upgrading first and reconstructing the fork's side from git afterwards.

> Example: `inspire-carryover/` — 45 added files verbatim plus one patch per modified file, each verified to apply onto the pre-upgrade base.
