# 11 — Semantic Creative Diff

Semantic Creative Diff explains differences between two version nodes using three distinct evidence sources.

---

## Three Evidence Sources

1. **Declared Delta:** Deterministic operation facets extracted directly from typed action records in `packages/domain`. Requires zero AI model calls.
2. **Path Summary:** High-level summary of version transitions along the lineage path, generated via Groq (`llama-3.3-70b-versatile`).
3. **Observed Delta:** Comparative visual analysis of rendered asset bytes, generated via Gemini Vision (`gemini-2.5-flash`).

---

## Reconciliation & Discrepancies

- Facets evaluated across 8 creative dimensions: `composition`, `lighting`, `color`, `framing`, `subject`, `background`, `objects`, `typography`.
- Discrepancies between declared action records and observed vision output are explicitly tagged with notes and lower overall confidence scores.

---

## Graceful Degradation & Caching

- When AI models fail or daily budget limits are hit, diff gracefully returns `status: declared_only` or `status: partial`.
- Results cached in `semantic_diffs` using SHA256 hashes of `from_version_id`, `to_version_id`, `facet_schema_version`, and model IDs.
