# Canopy API Documentation

Canopy exposes a versioned REST API (`/v1`) implemented with Fastify.

## Specification

- Base path: `/v1`
- Auth: `Authorization: Bearer <jwt_or_pat>`
- Idempotency: Supported via `Idempotency-Key` header on mutating calls.
- Content: JSON for all payloads except multipart asset uploads (`POST /v1/assets`).
- OpenAPI specification will be placed at `docs/api/openapi.json`.
