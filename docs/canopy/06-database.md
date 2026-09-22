# 06 — Database Schema, Migrations & ER Diagram

Canopy uses **PostgreSQL 16+** with the **pgvector** extension as its sole authoritative store.

---

## Entity Relationship Diagram

```text
               ┌──────────────┐
               │    USERS     │
               └──────┬───────┘
                      │
           ┌──────────┴──────────┐
           ▼                     ▼
┌────────────────────┐ ┌────────────────────┐
│     API TOKENS     │ │      PROJECTS      │
└────────────────────┘ └─────────┬──────────┘
                                 │
           ┌─────────────────────┼─────────────────────┐
           ▼                     ▼                     ▼
┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐
│      VERSIONS      │ │     MEMORIES       │ │    SEMANTIC DIFFS  │
└──────────┬─────────┘ └─────────┬──────────┘ └────────────────────┘
           │                     │
           ├─────────────────────┼─────────────────────┐
           ▼                     ▼                     ▼
┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐
│    PARENT EDGES    │ │ COPILOT EMBEDDINGS │ │COPILOT CONVERSAT'NS│
└────────────────────┘ └────────────────────┘ └────────────────────┘
```

---

## Database Migration Breakdown

### Migration 0000 (`0000_init_pgvector.sql`)
- Enables `CREATE EXTENSION IF NOT EXISTS vector;`.

### Migration 0001 (`0001_core_platform.sql`)
- `users`: `id`, `email`, `password_hash`, `display_name`, `created_at`.
- `api_tokens`: `id`, `user_id`, `name`, `token_hash`, `token_prefix`, `scopes`, `revoked_at`, `last_used_at`.
- `projects`: `id`, `owner_id`, `name`, `creative_goal`, `version_sequence_counter`, `archived_at`.
- `assets`: `id`, `content_hash`, `media_type`, `mime`, `storage_key`, `byte_size`.
- `versions`: `id`, `project_id`, `sequence`, `asset_id`, `label`, `actor_type`, `action_type`. Immutability enforced by trigger.
- `version_parents`: `version_id`, `parent_version_id`, `parent_index`, `role`.

### Migration 0002 (`0002_atomic_version_creation.sql`)
- Creates function `create_core_version(...)` for transactional sequence assignment and version creation.

### Migration 0003 (`0003_creative_evolution.sql`)
- `semantic_diffs`: `id`, `project_id`, `cache_key`, `from_version_id`, `to_version_id`, `status`, `diff_json`.
- `memories`: `id`, `project_id`, `type`, `statement`, `status`, `origin`, `source_refs`.
- `ai_requests`: `id`, `project_id`, `purpose`, `provider`, `model`, `input_tokens`, `output_tokens`, `cost`.

### Migration 0004 (`0004_copilot_retrieval.sql`)
- `copilot_conversations` & `copilot_messages`.
- `copilot_embeddings`: `id`, `project_id`, `source_type`, `source_id`, `embedding vector(768)`.
