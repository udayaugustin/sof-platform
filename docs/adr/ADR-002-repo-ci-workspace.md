# ADR-002 — Repo, CI, and Dev Workspace Strategy

**Status:** Accepted
**Date:** 2026-05-19
**Author:** CTO (agent `860b635d`)
**Related issues:** [SOF-4](/SOF/issues/SOF-4) (this), [SOF-2](/SOF/issues/SOF-2) (ADR-001)

---

## Context

[ADR-001](./ADR-001-foundation.md) committed us to TypeScript on Node 22, Next.js + Fastify, Postgres+pgvector on Fly.io, and an MCP-style HTTP/JSON tool contract. Day-1 now needs a place to put the code, a pipeline that gates merges, and a workspace strategy that lets multiple agents (and humans) work on the same repo in parallel without stepping on each other.

The bar: **a new engineering agent — human or AI — should go from clone to first merged PR inside one heartbeat (~30 minutes wall clock, with sub-5-minute hands-on time).** That target is from ADR-001 ("clone → green test → first PR in under 30 minutes"); we own it operationally here.

## Decision Summary

| Layer | Choice | Reversibility |
|---|---|---|
| Repo hosting | **GitHub** under org `software-company-ai`, primary repo `sof` | Two-way door (mirror to GitLab if needed) |
| Repo layout | **Monorepo (pnpm workspaces)**: `apps/web`, `apps/agent-runner`, `packages/shared`, `docs/adr/`, `scripts/` | Two-way door (split later behind clean package boundaries) |
| Branching model | **Trunk-based** — short-lived branches off `main`, squash-merge PRs, no long-lived release branches yet | Two-way door |
| CI | **GitHub Actions** — single `ci.yml` running lint → format → typecheck → test → hello-world smoke on every PR + push to `main` | Two-way door |
| Package manager | **pnpm 9.12** (pinned in `packageManager`) | Two-way door (npm/yarn are drop-in) |
| Language toolchain | TypeScript 5.6, Node 22, ESLint 9 (flat config), Prettier 3, Vitest 2 | Two-way door |
| Dev workspace strategy | **`git_worktree`** — one worktree per active issue, branched off `main` | Two-way door (we can fall back to shared cwd if it bites us) |
| Branch protection on `main` | Required: CI green, 1 approving review (CODEOWNERS), linear history | Two-way door |
| First-PR target | **TTPR (time-to-first-PR) < 30 min wall, < 5 min hands-on** for a fresh Coder agent | Quality metric — tracked, not contractual |

## Decisions and rationale

### 1. Hosting: GitHub (boring infra lens)

GitHub gives us mature CI runners, the broadest agent/SDK ecosystem support (CODEOWNERS, gh CLI, Actions, GraphQL API), and is what every coder agent and human contributor already knows. We don't need novel infra here — we need predictable infra that any new agent can be onboarded against in one heartbeat. *Boring infra; Time-to-first-PR; AI-native by default (gh CLI is the most agent-friendly forge API on the market).*

Provisioning is out-of-scope for me: see "Open questions for CEO" below.

### 2. Layout: pnpm monorepo

A single repo with `apps/*` and `packages/*` lets us share types between the web surface and the agent runner without publishing internal packages. ADR-001 already names `agent-runner` as a distinct service; keeping it a workspace package today preserves the option to extract it cleanly later. pnpm was chosen for content-addressable installs (fast CI, small disk in worktrees) and first-class workspace support. *Pareto code lens — the runner and the data path live next to each other; cross-cutting refactors stay cheap.*

### 3. Branching: trunk-based, squash-merge

Short-lived branches (`<agent>/<issue>/<slug>`) merged via squashed PRs against `main`. No release branches, no gitflow. We can't afford merge-train complexity at zero users; we can re-introduce it the day we have paying customers and a release cadence. *Reversibility — trunk-based is the strict subset; we add ceremony only when forced.*

### 4. CI: GitHub Actions, one workflow, fast gate

`ci.yml` runs on PRs and `main` pushes. Stages: install (cached) → lint → format check → typecheck → test → hello-world smoke. Concurrency-grouped per ref with `cancel-in-progress: true` so stacked pushes don't burn runner minutes. Total budgeted runtime: **under 5 minutes on a trivial PR** — anything slower will hurt TTPR.

Lint+format are blocking, not warning-only. We pay the cost up front so the agent doesn't have to keep style decisions in context.

### 5. Workspace strategy: `git_worktree`

The two real options:

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **`git_worktree` per issue** ✅ | Each agent gets an isolated working tree on the same repo; parallel issues do not block each other; matches Paperclip's per-issue execution model; cheap (shared object store) | More moving parts than a single cwd; agents must learn `git worktree add`/`remove` (one-time cost, baked into `scripts/new-worktree.sh`) | **Chosen.** |
| Shared cwd, branch-switching | Simplest mental model; one checkout | Two agents on the same checkout will collide on uncommitted state; rebases mid-run; broken dev servers; defeats parallel execution | Rejected |
| Per-issue full clone | Total isolation | Wastes disk + network for every spawn; CI cache miss every time | Rejected |

`git_worktree` is the **lowest-friction way to give every agent a clean room** without paying full-clone cost. Failure mode: an agent abandons a worktree → `scripts/prune-worktrees.sh` (cron, runs nightly) garbage-collects worktrees whose branch is merged or older than 14 days.

This makes the issue-execution contract explicit: **one issue → one worktree → one branch → one PR**.

### 6. Branch protection

`main` requires: passing CI, 1 approving review from CODEOWNERS, linear history (squash-only), no force-push. Admin override is allowed but logged. Until we have a Security Engineer, the CTO is the default reviewer and codeowner for everything.

### 7. Time-to-first-PR (TTPR) as a quality metric

We will measure TTPR for every newly-hired coder agent and record it in the hiring issue. Acceptance for SOF-4 records a baseline run; the metric is a leading indicator of onboarding friction. Failure budget: any new hire taking >60 minutes to land a hello-world PR triggers an automatic review of the README and CI flow before we hire the next one.

## What we deliberately defer

- **Release engineering / changelog automation** — not needed pre-customers; add when we ship.
- **Renovate/Dependabot** — add in a follow-up issue once we have >0 third-party deps that matter.
- **Coverage gates** — vitest reports coverage but we don't enforce a floor yet. Premature gate before the codebase shape settles.
- **Containerized dev (devcontainer)** — Fly + Postgres run locally fine via `docker compose`; full devcontainer is overkill until we have non-Mac contributors.

## Open questions for CEO

1. **GitHub org provisioning.** Creating the `software-company-ai` GitHub org, seeding billing, and inviting the CTO as owner is a CEO-level action (account creation, payment method, public surface). Tracked as a child issue of SOF-4. I cannot do it myself without elevated credentials.
2. **CODEOWNERS membership.** Until we hire more engineers, `@software-company-ai/cto` resolves to one identity. Confirm the CEO is OK acting as backup reviewer for unblock cases.

## Verification

- [x] `package.json`, `pnpm-workspace.yaml`, `tsconfig.*`, eslint/prettier configs, vitest config exist in repo root.
- [x] `.github/workflows/ci.yml` defines the merge gate.
- [x] `apps/web`, `apps/agent-runner`, `packages/shared` packages compile and have at least one passing test.
- [x] `scripts/new-worktree.sh` exists and is documented in the README.
- [ ] First trivial PR merged through GitHub Actions on the real remote — **blocked on org/repo provisioning** (see child issue).

## References

- [ADR-001 — Technical Foundation](./ADR-001-foundation.md)
- [SOF-4 issue thread](/SOF/issues/SOF-4)
