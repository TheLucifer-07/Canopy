# Phase 10 — 🔌 MCP / Developers

## 1. Overview & Objective

Canopy Phase 10 delivers the developer and AI agent integration surface. Through the Model Context Protocol (MCP) and authenticated REST APIs, external tools (such as Claude Desktop, Cursor, and automated pipelines) can securely inspect creative history, versions, lineage DAGs, assets, Semantic Diffs, and confirmed Creative Memories.

---

## 2. Architecture & Invariants

```text
AI Agent / MCP Client (Claude Desktop / Cursor)
                  ↓ (stdio / JSON-RPC)
          Canopy MCP Server
                  ↓ (HTTP + Bearer cnp_pat_...)
           Canopy REST API
                  ↓
          PostgreSQL Database
```

### Architectural Guarantees:
1. **MCP is an Interface, Not Business Logic**:
   - The MCP service does not connect directly to PostgreSQL or run internal SQL queries.
   - All tool invocations are forwarded to the Canopy REST API using standard `@canopy/api-client`.
2. **Safe Read Philosophy**:
   - Default MCP tools are strictly read-only.
   - No arbitrary shell execution, database manipulation, or filesystem access is exposed.
3. **Strict Ownership Isolation**:
   - Every request is validated against the authenticated user principal.
   - Cross-user queries for unauthorized project IDs return `404 Not Found` or `403 Forbidden`.
4. **Authority Invariants**:
   - **Creative Memory**: Only `active` (confirmed) memories are returned. Proposed/unreviewed AI extractions remain excluded.
   - **Semantic Diff**: MCP diff tools expose the canonical three-facet diff model (Declared Delta, Path Summary, Observed Delta).

---

## 3. MCP Server & Tool Surface

The Canopy MCP Server registers 9 safe read-only tools:

| Tool Name | Scope | Input Schema | Description |
|---|---|---|---|
| `canopy_list_projects` | `projects:read` | `{}` | List creative projects owned by token principal |
| `canopy_get_project` | `projects:read` | `{ project_id: UUID }` | Get project metadata, lineage count, and tip versions |
| `canopy_list_versions` | `versions:read` | `{ project_id: UUID }` | List ordered versions for an authorized project |
| `canopy_get_version` | `versions:read` | `{ version_id: UUID }` | Get version record, action, provenance, and signed asset URL |
| `canopy_get_lineage` | `versions:read` | `{ project_id: UUID }` | Retrieve full lineage DAG (parents, branches, merges, tips) |
| `canopy_get_asset` | `assets:read` | `{ asset_id: UUID }` | Get asset dimensions, MIME type, hash, and signed URL |
| `canopy_compare_versions`| `versions:read` | `{ from_id: UUID, to_id: UUID }` | Compute or retrieve three-facet Semantic Diff |
| `canopy_search_history` | `versions:read` | `{ project_id: UUID, query: string }` | Search project versions and active memories |
| `canopy_get_memory` | `memory:read` | `{ project_id: UUID, type?: string }` | List confirmed active Creative Memories |

---

## 4. Personal Access Tokens (PAT)

Machine authentication uses cryptographically secure Personal Access Tokens (`cnp_pat_...`):

- **Generation**: `POST /v1/me/tokens` returns the raw token string **ONCE** at creation.
- **Storage**: The API hashes the token with SHA-256 (`token_hash`) and stores only the first 16 characters (`token_prefix`) for display.
- **Revocation**: `DELETE /v1/me/tokens/:tokenId` sets `revoked_at = now()`. Revoked tokens are immediately rejected with `401 Unauthorized`.
- **Security**: Raw tokens are never stored in plaintext, logged, or returned in subsequent `GET /v1/me/tokens` requests.

---

## 5. Developer Surfaces

### Web (`apps/web/src/features/developers/`)
- **MCP Overview**: Quickstart guides, architecture principles, and client configuration snippets for Claude Desktop, Cursor, and CLI.
- **MCP Tools Explorer**: Interactive catalog of all 9 MCP tools with schema and return shapes.
- **API Keys / PAT Manager**: Token creation modal with one-time copyable secret, scope selection, and one-click revocation.
- **API Reference**: Detailed documentation of authenticated REST API routes.

### Android (`apps/android/`)
- **Developer Access Section**: Mobile-friendly summary of MCP status, connection parameters, and tool capabilities.

---

## 6. Verification

- `pnpm test` — Validates MCP server registration, tool contracts, token generation, and authorization constraints.
- `pnpm build` — Clean production builds of Web and Android packages.
- `pnpm verify` — Pure JavaScript and Foundation diagnostics passed.
- `git diff --check` — Clean formatting with zero whitespace violations.
