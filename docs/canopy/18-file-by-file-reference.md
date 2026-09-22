# 18 — File-by-File Technical Directory

Exhaustive technical reference of files across the Canopy codebase.

---

## 1. Packages (`packages/`)

### `packages/domain/src/index.js`
- **Purpose:** Pure domain algebra, invariant definitions, LCA graph traversal, declared diff calculation, cycle detection, and memory validation.
- **Exports:** `INVARIANTS`, `DomainError`, `assertHumanActor`, `buildDeclaredDelta`, `validateParentSet`, `wouldCreateCycle`, `summarizeLineage`, `validateMemoryInput`, `findLowestCommonAncestor`, `collectPathVersionIds`, `collectOperationsForPath`, `detectMergeConflicts`, `composeMergeOperations`, `buildDeclaredDiff`.
- **Dependencies:** `@canopy/config`. Zero I/O or DB imports.

### `packages/schemas/src/index.js`
- **Purpose:** Single source of truth for request and response validation schemas using Zod.
- **Exports:** `HealthResponseSchema`, `ApiErrorSchema`, `ProjectSchema`, `CreateProjectSchema`, `AssetSchema`, `ImportVersionSchema`, `CommitVersionSchema`, `ForkProjectSchema`, `MergeVersionsSchema`, `CreateMemorySchema`, `DiffRequestSchema`, `CopilotMessageSchema`.

### `packages/api-client/src/index.js`
- **Purpose:** Universal HTTP client for browser, Node, and MCP services.
- **Exports:** `CanopyApiClient`.

### `packages/config/src/index.js`
- **Purpose:** Platform configuration constants, model IDs, fidelity tiers, and limits.
- **Exports:** `PLATFORM_NAME`, `PLATFORM_VERSION`, `ACTOR_TYPES`, `ACTION_TYPES`, `MEMORY_TYPES`, `MEMORY_STATUS`, `LIMITS`, `ERROR_CODES`.

---

## 2. Fastify Backend Service (`services/api/`)

### `services/api/src/server.js`
- **Purpose:** Fastify server builder, middleware registration, CORS, multipart support, error handling, route mounting.
- **Exports:** `buildServer()`.

### `services/api/src/routes/v1.js`
- **Purpose:** `/v1` REST API route definitions.
- **Exports:** `v1Routes()`.

### `services/api/src/operations/core.js`
- **Purpose:** Core business operations engine.
- **Exports:** `CoreOperations`.

### `services/api/src/repositories/postgresCoreRepository.js`
- **Purpose:** PostgreSQL database repository implementation.
- **Exports:** `PostgresCoreRepository`.

### `services/api/src/intelligence/index.js`
- **Purpose:** Semantic Creative Diff service.
- **Exports:** `SemanticDiffService`.

### `services/api/src/intelligence/copilot.js`
- **Purpose:** Copilot planning, context retrieval, SSE streaming, and citation validation.
- **Exports:** `CopilotService`, `COPILOT_TOOLS`.

---

## 3. Web Client App (`apps/web/`)

### `apps/web/src/App.jsx`
- **Purpose:** Main React single-page application containing AuthScreen, ProjectHome, ProjectWorkspace, VersionExplorer, CanvasStage, VersionDetail, Diff Compare, Memory Drawer, and Copilot Chat.

---

## 4. MCP Service (`services/mcp/`)

### `services/mcp/src/index.js`
- **Purpose:** MCP server implementing 7 read tools over `StdioServerTransport`.
- **Exports:** `createCanopyMcpServer()`, `start()`.

---

## 5. Android Client App (`apps/android/`)

### `apps/android/App.jsx`
- **Purpose:** React Native + Expo Phase 1 public/marketing application surface.
