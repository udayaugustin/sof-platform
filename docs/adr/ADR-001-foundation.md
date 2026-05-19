# ADR-001 — Technical Foundation

**Status:** Accepted (CEO-confirmed 2026-05-19)
**Authoritative copy:** [SOF-2 document `adr-001-foundation`](/SOF/issues/SOF-2#document-adr-001-foundation)

This file is a stub. The canonical, revision-controlled copy of ADR-001 lives on the SOF-2 issue document. Read the canonical copy before making changes that touch a one-way door listed there (Postgres+pgvector schema, MCP tool contract, Fly.io deployment target).

## Quick reference — binding decisions

| Layer | Choice |
|---|---|
| Language | TypeScript (Node 22 LTS) |
| Framework | Next.js (App Router) + Fastify for standalone services |
| Agent runtime | Dedicated Node `agent-runner` worker, Anthropic SDK, MCP-style HTTP/JSON tool contracts |
| Datastore | **Postgres 16 + pgvector + JSONB** (one-way door on schema) |
| Cache/queue | Redis |
| Deployment | Fly.io behind Cloudflare |
| Object storage | S3-compatible |
| Observability | OpenTelemetry → Grafana Cloud |
| Secrets | Fly secrets + 1Password |

See [ADR-002](./ADR-002-repo-ci-workspace.md) for repo / CI / workspace decisions that follow from this foundation.
