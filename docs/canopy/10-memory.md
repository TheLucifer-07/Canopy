# 10 — Creative Memory Subsystem

The Creative Memory subsystem stores subjective interpretations, goals, constraints, and learnings (*what it meant*) without duplicating lineage facts (*what happened*).

---

## Invariant Enforcement (I-10)

- Domain check `looksLikeLineageFact()` rejects statements that merely restate version history (e.g. *"V2 was created by cropping image"*).
- Enforces distinction between authoritative lineage and creative interpretation.

---

## Memory Lifecycle & Statuses

- `active`: Authoritative memory active for Copilot context retrieval.
- `proposed`: AI-extracted memory proposal awaiting explicit user confirmation.
- `confirmed`: Proposed memory confirmed by user (transitions to `active`).
- `archived`: Soft-deleted memory excluded from Copilot retrieval.
- `superseded`: Memory replaced by an updated successor memory (`PATCH /v1/memories/:id`).

---

## Vector Indexing & Hybrid Retrieval

- Embeddings stored in `copilot_embeddings` (768-dim vectors).
- Hybrid search combines keyword search and cosine similarity retrieval over pgvector indexes (`HNSW` / cosine distance).
