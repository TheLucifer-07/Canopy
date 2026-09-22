# Canopy API Error Reference

Canopy API endpoints return standardized, typed JSON error payloads for all non-2xx HTTP responses.

## Error Response Structure

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable explanation of the error.",
    "retryable": false,
    "request_id": "req-1"
  }
}
```

## Error Codes Taxonomy

| Error Code | HTTP Status | Description |
|---|---|---|
| `UNAUTHENTICATED` | 401 | Missing, invalid, or expired JWT or PAT token. |
| `INSUFFICIENT_SCOPE` | 403 | Machine API token (`cnp_pat_*`) lacks required scope. |
| `PROJECT_NOT_FOUND` | 404 | Project does not exist or caller does not own it. |
| `VERSION_NOT_FOUND` | 404 | Specified version ID does not exist in project lineage. |
| `ASSET_NOT_FOUND` | 404 | Specified creative asset ID does not exist. |
| `MEMORY_NOT_FOUND` | 404 | Specified Creative Memory ID does not exist. |
| `VALIDATION_FAILED` | 422 | Request body or query parameters failed Zod schema validation. |
| `AI_BUDGET_EXCEEDED` | 429 | Daily AI cost or token budget limit reached for the project. |
| `COPILOT_RATE_LIMITED` | 429 | Copilot request frequency limit exceeded (20 req/min). |
| `MCP_RATE_LIMITED` | 429 | MCP tool request frequency limit exceeded. |
| `AI_PROVIDER_UNAVAILABLE` | 503 | Gemini or Groq model provider service unavailable. |
| `AI_PROVIDER_FAILED` | 502 | Provider returned an invalid or malformed output payload. |
