# Database Migrations

## Rules & Philosophy (Blueprint §25)

1. **PostgreSQL is the single source of truth.**
2. **pgvector is retrieval/indexing infrastructure, not the source of truth.**
3. **Forward-Only Migrations:** Schema changes occur exclusively via sequential, forward-only migrations.
4. **Grants:** Version and lineage tables are append-only; application role has SELECT and INSERT only (no UPDATE or DELETE).

## Phase 1 Migration Order

Run these in order against the configured PostgreSQL database:

1. `0000_init_pgvector.sql`
2. `0001_core_platform.sql`
3. `0002_atomic_version_creation.sql`
4. `0003_creative_evolution.sql`
5. `0004_copilot_retrieval.sql`
6. `0005_machine_tokens.sql`

`0001_core_platform.sql` creates:
- `profiles`
- `projects`
- `assets`
- `project_assets`
- `versions`
- `version_parents`
- `actions`
- `provenance`
- `version_annotations`
- `working_states`
- `memories`
- `idempotency_keys`

Ownership is enforced by the API repository queries and foreign keys; the database also contains immutable-history triggers and defines `next_project_sequence(project_id_arg uuid)`.

`0002_atomic_version_creation.sql` defines `create_core_version(...)`, the transactional RPC used by the API to create:
- one immutable `versions` row
- ordered `version_parents` rows
- one `actions` row
- one `provenance` row
- one mutable `version_annotations` satellite row

Run this migration before using the Phase 2 web commit flow.

`0003_creative_evolution.sql` adds Phase 3 creative evolution foundations:
- `project_forks`
- `semantic_diffs`
- `ai_requests`
- `create_project_fork(...)`

Run this migration before using Fork, manual Merge, Memory lifecycle extensions, Semantic Diff caching, or AI request logging.

`0004_copilot_retrieval.sql` adds project- and user-scoped Copilot conversations,
messages, pgvector-backed embedding metadata, and the authorization-checked
semantic search function used by grounded Copilot retrieval.

`0005_machine_tokens.sql` adds hashed, scoped machine tokens for MCP/CLI access.
Plaintext `cnp_pat_...` tokens are shown once by the API and are never stored in
the database.
