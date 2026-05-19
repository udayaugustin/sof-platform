# sof — Software Company

AI-native software engineering company. Monorepo for the product surface, the agent runner, and the shared libraries that connect them.

> New here? **Skip to [Clone → First PR in one heartbeat](#clone--first-pr-in-one-heartbeat).** Target: under 30 minutes wall clock, under 5 minutes hands-on.

---

## What lives where

```
sof/
├── apps/
│   ├── web/             # Next.js product surface (App Router)
│   └── agent-runner/    # Node worker: Anthropic SDK + MCP-style tool contracts
├── packages/
│   └── shared/          # Cross-cutting types and helpers
├── docs/adr/            # Architecture Decision Records (one-way doors)
├── scripts/             # new-worktree.sh, prune-worktrees.sh
├── .github/workflows/   # CI (GitHub Actions)
└── pnpm-workspace.yaml
```

Foundation in [ADR-001](./docs/adr/ADR-001-foundation.md). Repo / CI / workspace in [ADR-002](./docs/adr/ADR-002-repo-ci-workspace.md).

## Prerequisites

- Node **22+** (`nvm use 22` or `mise use node@22`)
- pnpm **9.12+** (`corepack enable && corepack prepare pnpm@9.12.0 --activate`)
- Git **2.40+** (for `git worktree`)
- Docker (for local Postgres + Redis — only needed when you boot the runner)

## Clone → First PR in one heartbeat

For a fresh Coder agent (human or AI). Each step is timed against a 30-minute total budget.

```bash
# 0 — Clone the repo                                                 (~30s)
git clone https://github.com/udayaugustin/sof-platform.git
cd sof-platform

# 1 — Install dependencies (pnpm store is content-addressable, fast) (~60s)
pnpm install --frozen-lockfile

# 2 — Verify green locally before opening a PR                       (~30s)
pnpm ci   # runs lint + format + typecheck + test

# 3 — Spin a worktree for your assigned issue                        (~10s)
scripts/new-worktree.sh SOF-123 my-change   # or whatever issue id
cd .worktrees/SOF-123
pnpm install

# 4 — Make a trivial change, commit on your branch                   (~60s)
echo "// hello, sof" >> apps/web/src/placeholder.ts
git add apps/web/src/placeholder.ts
git commit -m "SOF-123: trivial change"

# 5 — Push and open a PR                                             (~30s)
git push -u origin HEAD
gh pr create --fill --base main

# 6 — CI runs (lint / format / typecheck / test / hello-world smoke) (~3-4 min)
# 7 — Approving review from CODEOWNERS → squash-merge                (~1 min)
```

If you exceeded 30 minutes, that's a bug in this onboarding — open an issue against SOF and tag the CTO.

### Required scripts

| Script                                 | What it does                                           |
| -------------------------------------- | ------------------------------------------------------ |
| `pnpm lint`                            | ESLint (flat config) — blocking                        |
| `pnpm format`                          | Prettier check — blocking                              |
| `pnpm typecheck`                       | `tsc -b` across workspaces                             |
| `pnpm test`                            | Vitest across workspaces                               |
| `pnpm ci`                              | All of the above in one shot — run this before pushing |
| `scripts/new-worktree.sh SOF-### slug` | Create an isolated worktree branched off `main`        |
| `scripts/prune-worktrees.sh`           | Remove merged/old worktrees (runs nightly in CI cron)  |

## Branching model

Trunk-based. One issue → one short-lived branch → one squash-merged PR. Branches are named `<agent-or-user>/<SOF-###>/<short-slug>`. `main` is the only protected branch.

## Dev workspace strategy: `git_worktree`

We use `git worktree` per active issue (see [ADR-002](./docs/adr/ADR-002-repo-ci-workspace.md)). One worktree → one branch → one PR. Multiple agents work in parallel against the same repo without colliding on uncommitted state, dev-server ports, or build caches.

The `.worktrees/` directory is gitignored. Cleanup is automatic via `scripts/prune-worktrees.sh`; manual cleanup is `git worktree remove .worktrees/SOF-###`.

## CI gates

`.github/workflows/ci.yml` runs on every PR and `main` push:

1. `pnpm install --frozen-lockfile` (cached)
2. `pnpm lint`
3. `pnpm format` (Prettier check)
4. `pnpm typecheck`
5. `pnpm test`
6. `hello-world` smoke (depends on the above)

Targets: cold cache < 5 min, warm cache < 90 s on a trivial PR. Anything slower hurts time-to-first-PR (TTPR) and gets a fix-it issue.

## Architecture decisions

Read these before changing anything load-bearing:

- [ADR-001 — Technical Foundation](./docs/adr/ADR-001-foundation.md)
- [ADR-002 — Repo, CI, and Dev Workspace Strategy](./docs/adr/ADR-002-repo-ci-workspace.md)

If you are about to introduce a one-way door (schema migration, public API contract, infra provider), open an ADR PR **before** the code PR.

## License & contributing

Internal. Discuss in the SOF Paperclip workspace.
