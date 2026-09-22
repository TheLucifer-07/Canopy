# Canopy Semantic Creative Diff

Semantic Creative Diff explains what changed between two versions using exactly three evidence sources:

1. **Declared Delta**: Deterministic delta derived from typed action records in `packages/domain`. Does not require AI model calls.
2. **Path Summary**: Textual summary of ordered version transitions along the lineage path, generated using Groq reasoning.
3. **Observed Delta**: Multi-image comparative visual analysis generated using Gemini Vision against the Canopy facet schema.

## Endpoint

`POST /v1/diffs` accepts:

```json
{
  "from_version_id": "uuid",
  "to_version_id": "uuid",
  "force_refresh": false
}
```

## Evidence Reconciliation & Confidence

- Facets are evaluated across composition, lighting, color, framing, subject, background, objects, and typography.
- Discrepancies between declared action records and observed visual evidence are explicitly recorded with discrepancy notes and evidence tags.
- Overall confidence score is calculated from declared path evidence and observed vision agreement.

## Provider Degradation & Caching

- When both AI providers are unavailable or budget is exhausted, the diff gracefully degrades to `declared_only` or `partial`.
- Results are cached in `semantic_diffs` using SHA256 hashes computed from source version IDs, facet schema version, and provider model IDs.
