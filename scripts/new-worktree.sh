#!/usr/bin/env bash
# new-worktree.sh — create an isolated worktree for a SOF issue.
# Usage: scripts/new-worktree.sh SOF-123 [short-slug]
set -euo pipefail

ISSUE="${1:?usage: $0 SOF-### [slug]}"
SLUG="${2:-work}"
AGENT="${USER:-anon}"

BRANCH="${AGENT}/${ISSUE}/${SLUG}"
WT_ROOT="${SOF_WORKTREE_ROOT:-$(pwd)/.worktrees}"
WT_PATH="${WT_ROOT}/${ISSUE}"

mkdir -p "$WT_ROOT"

if git worktree list --porcelain | grep -q "worktree ${WT_PATH}$"; then
  echo "Worktree already exists at ${WT_PATH}"
  exit 0
fi

git fetch origin main --quiet || true
git worktree add -b "$BRANCH" "$WT_PATH" origin/main

echo "Worktree ready:"
echo "  path:   ${WT_PATH}"
echo "  branch: ${BRANCH}"
echo "Next:    cd ${WT_PATH} && pnpm install"
