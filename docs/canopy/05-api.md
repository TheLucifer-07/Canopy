# 05 — API Endpoint Reference (/v1) & OpenAPI Spec

All versioned API endpoints are mounted under `/v1` in [`services/api/src/routes/v1.js`](file:///Users/animireddyhemachandu/Desktop/Canopy/services/api/src/routes/v1.js).

---

## Complete Route Inventory

### Auth & Tokens
- `POST /v1/auth/register`: User account creation (`email`, `password`, `display_name`). Returns access token.
- `POST /v1/auth/login`: Authentication with email/password. Returns access token.
- `GET /v1/me/tokens`: List API machine tokens for authenticated user.
- `POST /v1/me/tokens`: Create scoped machine token (`cnp_pat_*`).
- `DELETE /v1/me/tokens/:tokenId`: Revoke machine token.

### Projects & Workspace
- `POST /v1/projects`: Create project (`name`, `creative_goal`).
- `GET /v1/projects`: List user projects.
- `GET /v1/projects/:projectId`: Get project details.
- `POST /v1/projects/:projectId/fork`: Cross-project fork from source version.

### Assets & Versions
- `POST /v1/projects/:projectId/assets`: Upload multipart asset file.
- `GET /v1/assets/:assetId/url`: Get asset preview/download URL.
- `POST /v1/projects/:projectId/versions/import`: Create V1 root version from imported asset.
- `POST /v1/projects/:projectId/versions`: Commit new version from typed operations.
- `POST /v1/projects/:projectId/merge`: Merge multiple tip versions.
- `POST /v1/versions/:versionId/continue`: Set working state continue point.
- `GET /v1/projects/:projectId/lineage`: Fetch lineage DAG (versions, parent edges, tips, branch points).

### Memories & Diffs
- `POST /v1/projects/:projectId/memories`: Create user-authored Creative Memory (`active`).
- `POST /v1/projects/:projectId/memories/propose`: Propose AI-extracted memory (`proposed`).
- `GET /v1/projects/:projectId/memories`: List project memories.
- `PATCH /v1/memories/:memoryId`: Edit memory statement/rationale.
- `POST /v1/memories/:memoryId/confirm`: Confirm proposed memory to active.
- `POST /v1/memories/:memoryId/archive`: Archive memory.
- `POST /v1/diffs`: Generate three-source semantic diff between two versions.

### Copilot
- `POST /v1/projects/:projectId/copilot/messages`: Stream grounded answer via SSE.
- `GET /v1/projects/:projectId/copilot/conversations`: List Copilot conversations.
- `GET /v1/copilot/conversations/:conversationId`: Fetch Copilot conversation details.

---

## OpenAPI 3.1 Specification

- Script: [`scripts/generate-openapi.js`](file:///Users/animireddyhemachandu/Desktop/Canopy/scripts/generate-openapi.js)
- Specification Artifact: [`docs/api/openapi.json`](file:///Users/animireddyhemachandu/Desktop/Canopy/docs/api/openapi.json)
