# INSPIRE — workspace guide for Claude

This repository is a **fork of the INSPIRE template, instantiated as a live
project** — a ClickHouse-backed analytics service (see [README.md](README.md)).
INSPIRE is a software engineering methodology for the agentic era; the manual is at
[inspire.openbims.dev](https://inspire.openbims.dev).

It wears two hats, and confusing them is the main way to get this repo wrong:

- **A product.** `.inspire_kb/` holds this project's real knowledge base, `source/`
  its production code. The guardrail runtime is **live** in `.claude/`.
- **An upstream contributor.** Improvements to the methodology made here are meant to
  flow back to INSPIRE core, which is why the runtime is still edited at its versioned
  source (`.inspire/`) rather than in the deployed copy.

## Structure

The convention: **dotfolders = INSPIRE scaffolding**, non-dot dirs = the product
you build on top of it.

- `.inspire/` — the **guardrail runtime**, staged dormant (see below):
  - `.inspire/skills/` — the 13 agent skills (`inspire-*`): the judgment half of
    the runtime, in three families:
    - **Specification** (7) — capture what the product is and why: `module` ·
      `feature` · `domain` · `screens` · `prototype` (horizontal mock) · `spike`
      (external verticals) · `adr`.
    - **Codification** (1) — `inspire-code`: the coding stage that turns the KB into
      production code under `source/` (subcommands `tdd` · `review` · `debug` ·
      `fix-build` · `fix-vulns`), always re-anchoring to the ADRs, descriptors and
      acceptance criteria that specify it, and handing drift back to the specifying
      skills. Stack-agnostic, layering optional **stack profiles**
      (`inspire-code/profiles/`, resolved on demand from `00_bootstrap/stack.md`) —
      the template ships lean `react` + `nestjs` defaults; a fork adds its own.
    - **Housekeeping** (5) — set up and keep the workspace coherent: `bootstrap`
      (greenfield foundation: language, stack, theme + the live design system),
      `extract` (brownfield onboarding — fan out scanners over an existing codebase
      into KB candidates), `task` (the ticket tracker), `workspace` (the pre-PR
      global review + vault structure), `learn` (the skill-learnings journal —
      write-once, timestamp-named, version-stamped insights about the skills
      themselves, captured in a fork and bound upstream to INSPIRE core).
  - `.inspire/bin/` — the validators + golden fixtures: the mechanical half. Spec
    root is configurable via `SDD_SPEC_ROOT` (defaults to `.inspire_kb/04_domain`).
    Test suite: `bash .inspire/bin/test/run-tests.sh`.
  - `.inspire/hooks/` — enforcement hooks: git-time `pre-commit` / `pre-pr`, and
    `session-start` (injects the project's `output_language` — and the runtime
    version from `.inspire.lock` — into every session).
  - `.inspire/templates/` — files materialized on the product side at
    instantiation (the `prototype/` + `source/` README stubs).
  - `.inspire/install.sh` — the instantiation script.
  - `.inspire/manifest.json` — the runtime **release identity** (`version` +
    `released`); `install.sh` freezes it into a fork's root `.inspire.lock`
    (provenance: which release the fork was instantiated from), which `inspire-learn`
    stamps onto every learning.
- `.inspire_kb/` — **this project's knowledge base**, not an empty skeleton: the
  navigable graph the product is specified in, and the source of truth the code is
  judged against. One layer per skill (`00_bootstrap`, `01_adr`, `02_modules`,
  `03_features`, `04_domain`, `05_screens`, `06_spikes`, `98_skill_learnings`, `99_tracker`); each folder carries a
  README explaining its purpose and layout.
- `.manual/` — the INSPIRE **microsite / manual** (canonical explanation;
  published at inspire.openbims.dev; source here — open `.manual/index.html`).
The two product-side dirs below are the product, not INSPIRE. They **exist here**,
created by `install.sh` from `.inspire/templates/` when this fork was instantiated, and
re-running it leaves them alone:

- `prototype/` — the **horizontal prototype** (product-side, non-dot): the wide,
  shallow, mocked working model of the whole product. It keeps **no KB file** — its
  insights co-evolve the vault directly (features, screens, ADRs, design system).
  Vertical spikes live in their own external repos, their knowledge brought home
  under `.inspire_kb/06_spikes/` (skill `inspire-spike`).
- `source/` — the **production monorepo** (product-side, non-dot): the root of the
  actual product code, realized from the KB. An ADR reaches `implemented` maturity
  when it lands here.

### Template vs deployed layout — why the runtime is staged in `.inspire/`

Claude Code auto-loads skills from `.claude/skills/` and runs hooks registered in
`.claude/settings.json`. The skills also reference each other and the validators via the
**deployed** paths (`.claude/skills/…`, `.claude/bin/…`). In the upstream template the
runtime is staged **dormant** under `.inspire/` so the skills do not fire while the
template itself is being edited.

**Here the runtime is live**, and `.inspire/` keeps a second job: it is the versioned
source a fork edits, so an improvement can be promoted upstream. That is why the two
trees exist side by side in this repo, and why editing the deployed one is a mistake
rather than a shortcut.

Deploying (or re-deploying, after editing `.inspire/`) is one command:

```bash
bash .inspire/install.sh
```

It copies `.inspire/{skills,bin,hooks}` → `.claude/{skills,bin,hooks}`, makes the
scripts executable, and re-freezes `.inspire.lock` with the deploying commit. The rest
of its steps are **create-if-absent, never clobber**, so on an already-instantiated fork
like this one they all report "left as-is": the hooks in `.claude/settings.json`, the
live `05_screens/design-system.md`, `prototype/`, `source/`, and the project's own
`README.md` (it only removes the *template's* methodology README, recognised by its
tagline).

So re-running it is routine, not risky — it is how an edit under `.inspire/` becomes the
runtime that actually executes. The one thing it does overwrite is `.claude/{skills,bin,
hooks}`, which is precisely why nothing should ever be edited there.

## Working in this repo

- **Edit the runtime in `.inspire/`, never in `.claude/`.** `.inspire/` is the
  versioned source; `.claude/` is a deployed copy that `install.sh` **overwrites**, so
  an edit made there is lost on the next deploy and never reaches upstream. This is the
  single most important rule in this file.
- **Deploy with `bash .inspire/install.sh`.** It is idempotent and safe to re-run: it
  copies `.inspire/{skills,bin,hooks}` → `.claude/`, and leaves `prototype/`, `source/`,
  the project `README.md`, the live design system and an existing `settings.json`
  untouched. It also re-freezes `.inspire.lock` with the deploying commit, which is the
  fork's provenance record. Until it runs, the hooks and the skills keep executing the
  previous version — a fixed rule that has not been deployed is not in force.
- A restart of Claude Code is **not** needed for skill or hook *content* (both are read
  when they run), only when a brand-new skill directory is added, since the available-
  skills list is built at session start.
- **Keep the runtime generic.** The skills and validators must stay stack-agnostic and
  free of this product's domain vocabulary — that is what keeps them promotable
  upstream. This project's concrete content belongs in `.inspire_kb/` and `source/`, and
  its stack-specific rules in a `inspire-code/profiles/` profile, never inlined in a
  skill.
- **Record methodology insights** with `/inspire_learn note` — write-once, version-
  stamped, so a change made here can be carried to INSPIRE core with its reasoning
  intact.
- Run the validator suite with `bash .inspire/bin/test/run-tests.sh` after touching
  anything under `.inspire/bin/`.
