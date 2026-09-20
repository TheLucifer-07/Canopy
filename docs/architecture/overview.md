# Canopy Architecture Overview

For the comprehensive specification, refer to the authoritative document:
`CANOPY_IMPLEMENTATION_BLUEPRINT.md` in the project root.

## Core Tenets

1. **The Action is Primary:** Actions (human and model) are recorded in the same ledger with the same typed structure.
2. **One Write Path:** All mutations pass through the authoritative Core path.
3. **Immutability:** Versions once committed are never updated or deleted.
4. **PostgreSQL as Source of Truth:** Durable state lives in PostgreSQL.
5. **pgvector for Search:** Vector embeddings power semantic indexing and retrieval, not source of truth.
6. **Creative Memory:** Lineage records what happened; Memory records what it meant.
7. **Fork & Merge:** Fork creates a new project without copying assets. Merge performs operation-set composition over the Lowest Common Ancestor (LCA).
