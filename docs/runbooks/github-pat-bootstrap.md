# Day-1 GitHub PAT permissions checklist

**Status:** canonical bootstrap runbook
**Owner:** CTO
**Audience:** anyone provisioning a new agent-driven repo under this org (or any successor org), or rotating the PAT.
**Why this exists:** [SOF-18](https://github.com/udayaugustin/sof-platform/issues) (post-mortem of [SOF-10](https://github.com/udayaugustin/sof-platform/issues)) — the org's first PAT shipped with `Contents`, `Administration`, `Workflows`, `Metadata` but **not** `Pull requests` or `Actions`. The very first CTO-driven PR attempt failed with `403 Resource not accessible by personal access token`. The same class of failure had already cost a heartbeat in [SOF-10](https://github.com/udayaugustin/sof-platform/issues) when `Workflows: rw` was missing on an earlier attempt. We are baking the full table here so we stop discovering missing scopes one blocked PR at a time.

---

## 1. Generate the PAT

Open: **https://github.com/settings/personal-access-tokens** (Settings → Developer settings → Personal access tokens → Fine-grained tokens → **Generate new token**).

Settings to use:

- **Token name:** `sof-platform-agent-<YYYY-MM-DD>` (date helps with rotation).
- **Resource owner:** the account/org that owns the agent repo (currently `udayaugustin`; will be `wisright-sof` after the org migration).
- **Repository access:** **Only select repositories** → pick `sof-platform` (do not use "All repositories" — least privilege).
- **Expiration:** 90 days max. Calendar a rotation issue at +75 days.

## 2. Required repository permissions (day-1 set)

Grant exactly the permissions in this table. **Every row is load-bearing — a missing row will silently break a CLI/API call that a future agent run depends on.**

| Permission         | Access         | Why we need it on day 1                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Pull requests**  | Read and write | Open, comment on, review, and merge PRs via `gh pr ...` and `POST /repos/.../pulls`. **Missing this is the SOF-18 failure mode** — `403 Resource not accessible by personal access token` on PR create.                                                                                                                                                                                                |
| **Contents**       | Read and write | Push branches (`git push`), read repo files via API, commit via REST. The most basic write scope; without it nothing works.                                                                                                                                                                                                                                                                            |
| **Workflows**      | Read and write | Required when an agent PR touches any file under `.github/workflows/*.yml` (CI gates, release pipelines). Without it, pushes that include workflow edits are rejected even if `Contents: rw` is granted. SOF-10 hit this.                                                                                                                                                                              |
| **Actions**        | Read           | Read CI run status via `gh run list`, `gh run view`, and `GET /repos/.../actions/runs/...`. Required by any poll/wait loop that watches a workflow run. Reading run logs and re-running failed runs need this.                                                                                                                                                                                         |
| **Metadata**       | Read           | Mandatory baseline — GitHub auto-grants this and it cannot be removed from a fine-grained PAT. Listed here so the checklist is complete.                                                                                                                                                                                                                                                               |
| **Administration** | Read and write | Required to **manage branch protection** (`PUT /repos/.../branches/{branch}/protection`), repo settings (visibility, default branch, topics), and to create new repos under the owner via `POST /user/repos` or `POST /orgs/.../repos`. Day-1 yes — SOF-10 used this to apply ADR-002 §6 branch protection. Drop to read-only only if branch protection / repo settings will be human-managed forever. |

### Optional / situational rows

Add only if the listed workflow applies:

| Permission      | Access         | When to add                                                                                                                     |
| --------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Issues**      | Read and write | If agents will open/comment on GitHub issues (we currently use Paperclip issues, not GitHub issues — so leave **off** for now). |
| **Deployments** | Read and write | When we wire a real deploy target (Fly.io, Render). Not needed yet.                                                             |
| **Secrets**     | Read           | If we ever need to inspect Actions secrets programmatically (rare; usually managed via UI).                                     |
| **Webhooks**    | Read and write | If an agent will configure webhooks (e.g. for ChatOps). Not needed yet.                                                         |

### Permissions to **leave off**

- **All organization-level permissions** (when the resource owner is an org). The PAT should be repo-scoped only. Org admin is a separate one-way door that should require its own approval and audit trail.
- **Codespaces, Copilot, Dependabot alerts, Pages**: not used by the agent fleet.

## 3. Hand the PAT to the agent fleet

1. Copy the token value **once** (GitHub will not show it again).
2. Paste it as a comment on the provisioning Paperclip issue (currently [SOF-10](https://github.com/udayaugustin/sof-platform/issues) at bootstrap; future rotations get their own issue) prefixed `🔒 PAT:`. Paperclip comments are company-private.
3. On the next heartbeat the receiving agent runs:

   ```bash
   echo "<pat>" | gh auth login --with-token --git-protocol https --hostname github.com
   ```

   This stores the credential in the **macOS keychain via `gcm-core`** (the system credential helper used by `git` on this host). Both CEO and CTO agents run as the same OS user, so the credential is shared automatically — no per-agent copy.

## 4. Verify before declaring the bootstrap done

Run these four checks. All must pass before the issue is closed.

```bash
# 4a — gh sees the token, hostname, and scopes
gh auth status -h github.com -t

# 4b — token can read repo metadata
gh api /repos/<owner>/<repo> --jq '.full_name, .visibility, .default_branch'

# 4c — token can write PRs (the SOF-18 gate)
gh api -X GET /repos/<owner>/<repo>/pulls --jq 'length'  # any 2xx is sufficient; 403 means PR scope missing

# 4d — token can read CI runs
gh api /repos/<owner>/<repo>/actions/runs --jq '.workflow_runs[0].status' 2>/dev/null || echo "no runs yet (ok)"
```

A clean `gh auth status` output looks like:

```text
github.com
  ✓ Logged in to github.com account <user> (keyring)
  - Active account: true
  - Git operations protocol: https
  - Token: github_pat_*****
  - Token scopes: 'gist', 'read:org', 'repo', 'workflow'  # classic-style summary; fine-grained PATs show the API permissions list
```

If any of 4a–4d fail with `403 Resource not accessible by personal access token`, the corresponding row in §2 is the one to fix — go back to the PAT settings page and toggle it.

### Important `gh` keychain note

`gh` reads the PAT from the macOS keychain on every call. **When you rotate or replace the PAT, you do not need to re-run `gh auth login`** as long as you update the same keychain entry (or just re-run `gh auth login --with-token` with the new value to overwrite). `gh` picks up the change immediately on the next invocation — no shell restart, no re-auth dance.

To overwrite cleanly:

```bash
echo "<new-pat>" | gh auth login --with-token --git-protocol https --hostname github.com
```

## 5. Rotation

- **Calendar a child issue 75 days after issuance** titled `Rotate sof-platform PAT (expires <date>)`.
- At rotation: generate a new PAT with the same §2 permissions, deliver via the §3 path, run §4 to verify, then revoke the old token from the same GitHub settings URL.
- Never let an agent's only credential lapse on weekend or holiday — keep at least 7 days of slack on the expiry.

## 6. References

- [SOF-10](https://github.com/udayaugustin/sof-platform/issues) — original provisioning issue + plan (where bootstrap history lives).
- [SOF-18](https://github.com/udayaugustin/sof-platform/issues) — the PR-create permission gap incident that motivated this checklist.
- [ADR-001](../adr/ADR-001-foundation.md) — credential-handoff principles.
- [ADR-002 §6](../adr/ADR-002-repo-ci-workspace.md) — branch protection (uses `Administration: rw`).
- GitHub docs on fine-grained PATs: <https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#fine-grained-personal-access-tokens>.
