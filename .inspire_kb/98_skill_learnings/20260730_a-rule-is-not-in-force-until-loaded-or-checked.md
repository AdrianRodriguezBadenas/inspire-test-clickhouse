---
id: 20260730_a-rule-is-not-in-force-until-loaded-or-checked
kind: skill-learning
title: A written rule is not in force until something loads it or something checks it
skill: runtime
category: new-pattern
created: 2026-07-30
reporter: "@adrian.rodriguez"
inspire_version: "0.1.0"
template_sha: "d800fcb"
related_to: ["[[TASK-w3n8qr]]", "[[TASK-k4t9mz]]"]
supersedes: null
---

## Trigger

One session added several coding-stage rules to the runtime and then violated three of
them, in three different ways. The pattern only became visible because all three
happened close together.

1. **Written, unenforced.** Rule 4 of the new `quality-gates.md` specified an
   escape-hatch ratchet — a ceiling that may fall, never rise. Nothing counted anything.
   The rule read as installed for two commits.
2. **Written, not loaded.** `tdd.md` says to assert the whole response and never to build
   the expected value from the code under test. A test was then written that asserted
   `toHaveLength(DEFAULT_PAGE_SIZE)` — importing the very constant it asserted, so
   mutating the constant moved the expectation with it. The rule had been *edited by the
   same agent two hours earlier*; it was on disk and not in context, because the work was
   done in a plain conversational turn rather than under `/inspire_code tdd`.
3. **Written, not consulted.** `inspire-code`'s Rule 9 says to consult the tracker at the
   start of a multi-step subcommand. Skipped while working freehand. Running the skill
   properly afterwards surfaced, in one step: that the endpoints have no authentication at
   all (which answered an open policy question and closed four rows as not-applicable),
   and that a tracked "e2e wipes dev data" risk no longer matched the code — it described
   a table the suite stopped touching.

The operator named it directly: *"me preocupa que tenga que recordarlo, ¿no son reglas
establecidas?"* Established, yes. In force, no.

## Learning

**Rules degrade into decoration unless something loads them or something checks them.**
A rule's home determines whether it is ever applied, and INSPIRE currently has three
tiers with very different reliability:

- **Tier 1 — mechanically checked.** A validator or hook runs it every time. Cannot be
  forgotten. Only reachable for rules a machine can decide.
- **Tier 2 — loaded on demand.** Lives in a skill reference (`references/tdd.md`) and
  enters context only when that skill is invoked. Reliable *if* the operator or agent
  goes through the skill; invisible otherwise. This is where most of the methodology
  lives, and the freehand path bypasses all of it.
- **Tier 3 — always in context.** `CLAUDE.md` is loaded every session. Scarce and
  precious: too much here and none of it is read.

The failure mode is silent and systematic: an agent asked to "add a test" in
conversation does competent work that ignores tier 2 entirely, and nothing reports the
omission. Worse, the agent cannot self-diagnose it — it does not know what it did not
load.

Three corollaries worth stating separately, each earned the hard way in this session:

- **A gate that is specified but unbuilt is worse than an absent one**, because the
  config or the prose claims coverage that does not exist. When the escape-hatch enforcer
  was missing but its config present, the hook was made to fail loudly rather than skip.
- **Enforcement must be one-directional where the inverse is not a rule.** The
  criteria↔tests gate checks "every criterion has a test" and deliberately never asks
  "does every test have a criterion" — the inverse would push programming conventions
  (an unknown id returns not-found) into feature files. Reporting orphaned tests as a
  finding, which this session did once, inflates the contract.
- **The self-checking rule earns priority.** Of three assertion rules, only the mutation
  drill catches its own violation; the other two depend on someone remembering. That
  asymmetry is a ranking criterion for what to make mandatory.

## Local change

This fork made the tiers explicit rather than implicit:

- Built two validators (`escape-hatch-ratchet.sh`, `declared-errors-tested.sh`,
  `criteria-have-tests.sh`) moving three prose rules into tier 1, with golden fixtures;
  the validator suite went from 43 to 56 cases.
- Wired them into `pre-commit` / `pre-pr`, with a **missing enforcer + present config**
  treated as blocking.
- Promoted the three most-violated coding rules into `CLAUDE.md` (tier 3) with the
  instruction to run `/inspire_code tdd` rather than writing tests freehand, and an
  explicit note that only the mutation drill catches itself.
- Corrected `CLAUDE.md`, which still described the repo as the upstream template and told
  the reader **not** to run `install.sh` — a stale rule that actively blocked the correct
  action for five commits.

## Upstream suggestion

1. **Classify every rule in the runtime by tier, and treat tier 2 as a liability, not a
   resting place.** For each rule in a skill reference, answer: can a machine check this?
   If yes it belongs in `bin/`. If no, does it need to be in `CLAUDE.md`? A rule that is
   neither checkable nor context-resident is a rule that will be skipped, and saying so
   in the reference is more honest than implying it binds.
2. **Ship a `CLAUDE.md` section in the template** — the handful of coding-stage
   non-negotiables plus "invoke the skill rather than working freehand". `install.sh`
   already materializes product-side files; this is the same idea for the always-loaded
   tier. Today every fork must discover the need on its own, by violating a rule.
3. **Make `inspire-code` state its own bypass.** The skill should say, in its own text,
   that working on code outside it skips the infrastructure precondition, the derived test
   list and the tracker consult — so the cost of freehanding is documented where an agent
   reading the skill will see it.
4. **Consider a session-start reminder** naming the gates a project has installed. The
   `session-start` hook already injects `output_language` and the runtime version; the
   installed-gate list is the same class of always-needed context and would make tier 1
   visible before it fires rather than at commit time.
