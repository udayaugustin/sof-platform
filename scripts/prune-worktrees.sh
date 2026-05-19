#!/usr/bin/env bash
# prune-worktrees.sh — remove worktrees whose branch is merged into main or older than 14 days.
set -euo pipefail

git fetch origin main --quiet || true
git worktree prune

CUTOFF="$(date -v-14d +%s 2>/dev/null || date -d '14 days ago' +%s)"

git worktree list --porcelain | awk '/^worktree /{print $2}' | while read -r WT; do
  [ -d "$WT" ] || continue
  # skip the primary worktree
  if [ "$WT" = "$(git rev-parse --show-toplevel)" ]; then continue; fi

  BRANCH=$(git -C "$WT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
  MTIME=$(stat -f %m "$WT" 2>/dev/null || stat -c %Y "$WT" 2>/dev/null || echo 0)

  MERGED=0
  if [ -n "$BRANCH" ] && git merge-base --is-ancestor "$BRANCH" origin/main 2>/dev/null; then
    MERGED=1
  fi

  if [ "$MERGED" = "1" ] || [ "$MTIME" -lt "$CUTOFF" ]; then
    echo "Removing $WT (branch=$BRANCH merged=$MERGED)"
    git worktree remove --force "$WT" || true
  fi
done
