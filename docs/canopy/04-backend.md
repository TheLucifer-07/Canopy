# 04 — Backend Fastify & Core Operations

The backend service (`services/api`) is a Fastify modular monolith that acts as the single write boundary for the platform (**One Write Path**).

---

## Server Initialization & Middleware Stack

Defined in [`services/api/src/server.js`](file:///Users/animireddyhemachandu/Desktop/Canopy/services/api/src/server.js):

- `@fastify/sensible`: Standardized HTTP errors and helpers.
- `@fastify/cors`: Configured cross-origin resource sharing (`config.corsOrigin`).
- `@fastify/multipart`: Multipart form-data handling for asset file uploads (up to 50MB).
- `authenticateRequest`: Route authentication hook supporting JWT Bearer tokens and Machine API tokens (`cnp_pat_*`).
- `sendApiError`: Centralized error handler converting domain and API errors into typed JSON payloads (`ApiError`).

---

## Core Operations Layer (`services/api/src/operations/core.js`)

Encapsulates all business operations:

1. `createProject`: Creates project with unique sequence counter.
2. `uploadAsset`: Content-addresses asset by SHA-256 hash, stores asset bytes, and generates thumbnail.
3. `createRootVersion`: Validates asset and inserts V1 root version (no parent edges).
4. `commitVersion`: Validates typed operations, checks parent version ancestry, creates child version, and updates lineage.
5. `forkProject`: Creates new project referencing source version without copying asset bytes ($O(1)$ fork).
6. `mergeVersions`: Determines Lowest Common Ancestor (LCA), detects conflicts, and creates multi-parent merge version.
7. `createMemory` & `proposeMemory`: Creates user-authored or AI-proposed Creative Memories.
8. `createSemanticDiff`: Reconciles declared delta, path summary, and observed visual diff.
