# Canopy

> A platform for versioning, understanding, and preserving the evolution of human + AI creative work.

The architecture preserves the complete creative loop:
```
CREATE → EDIT → CAPTURE → VERSION → BRANCH → FORK → MERGE → COMPARE → UNDERSTAND → REMEMBER → CONTINUE
```

---

## 1. What Canopy Is

Canopy is creative evolution infrastructure. It records every gesture—whether performed by a human designer or an AI model—in the same typed, parameterised ledger.

### Architectural Tenets
1. **PostgreSQL is the source of truth.** Immutability is enforced at the database level.
2. **pgvector is retrieval/indexing infrastructure**, not the source of truth.
3. **Core owns authoritative project state and business rules.**
4. **Intelligence operates on derived understanding** and AI capabilities (never writes to version records).
5. **Memory storage belongs to Core/PostgreSQL** (durable interpretation records). Retrieval/extraction belongs to Intelligence.
6. **One Write Path:** All mutations pass through the same Core path (`packages/domain`). Web, Android, and MCP consume identical contracts.
7. **Fork & Merge:** Fork is cross-project and copies zero assets. Merge is deterministic operation-set composition replayed over the Lowest Common Ancestor (LCA).
8. **Pure JavaScript:** Built using modern JavaScript (ESM). No TypeScript.

---

## 2. Repository Structure

```
canopy/
├── apps/
│   ├── web/                     React + Vite + Tailwind + Zustand + TanStack Query + Fabric.js
│   └── android/                 Architectural reservation for Kotlin + Compose client
│
├── services/
│   ├── api/                     Fastify modular monolith — the ONLY writer
│   └── mcp/                     MCP service boundary over /v1 API
│
├── packages/
│   ├── domain/                  Pure domain: entities, invariants, lineage algebra, LCA
│   ├── schemas/                 Zod validation schemas (single source of truth)
│   ├── api-client/              Canonical HTTP client for /v1 API
│   ├── ui/                      Shared UI primitives and design tokens
│   └── config/                  Constants, model IDs, limits, fidelity tiers
│
├── database/
│   ├── migrations/              Forward-only PostgreSQL + pgvector migrations
│   └── seeds/                   Demo project seed data
│
├── storage/                     Local/object storage boundary notes
│
├── tests/
│   ├── unit/                    Domain and schema unit tests
│   ├── integration/             Database and storage integration tests
│   ├── e2e/                     End-to-end user journey tests
│   └── ai-evals/                AI evaluation fixtures
│
├── docs/                        Architecture, API, and protocol documentation
├── scripts/                     Verification and lifecycle scripts
│
├── .env.example                 Environment configuration template
├── .gitignore                   Git ignore rules
├── docker-compose.yml           Optional local PostgreSQL + pgvector compatibility service
├── package.json                 Root monorepo workspace configuration
└── README.md
```

---

## 3. Current Implementation Phase

**Current Phase: Phase 4 Copilot and grounded retrieval hardening.**

Phase 1 established the authoritative Canopy Core:
- API-owned authentication issues signed access tokens.
- PostgreSQL + pgvector store project, asset, action, version, parent, working-state, memory, and Copilot metadata.
- The API storage abstraction stores private creative asset bytes locally by default.
- The API is the only write boundary.
- The domain package stays pure JavaScript with no HTTP, database, browser, or storage imports.

Phase 2 adds the first real web creative workspace:
- authenticated Canopy API session
- project list/create/open
- image import through the Canopy API
- canvas-first workspace shell
- local Zustand Working State for non-destructive edits
- explicit Save Version commit flow
- React Flow lineage rail from authoritative API relationships
- version explorer and metadata inspector

Phase 3 adds creative evolution foundations:
- reusable UI primitives in `packages/ui`
- cross-project Fork with zero asset-byte copy
- manual operation-set Merge with ordered multi-parent versions
- Creative Memory lifecycle: active, proposed, confirmed, archived, superseded
- declared/path Semantic Diff fallback with cache storage
- AI provider capability registry and request logging foundation

---

## 4. How to Install Dependencies

From the repository root:

```bash
pnpm install
```

This installs dependencies across all workspaces (`apps/*`, `services/*`, `packages/*`) via pnpm workspaces.

---

## 5. PostgreSQL Setup

Start PostgreSQL with `docker compose up -d postgres` (or use an existing PostgreSQL 16+ instance with pgvector), then run the forward-only SQL migrations in order:

```bash
database/migrations/0000_init_pgvector.sql
database/migrations/0001_core_platform.sql
database/migrations/0002_atomic_version_creation.sql
database/migrations/0003_creative_evolution.sql
database/migrations/0004_copilot_retrieval.sql
```

The migrations enable pgvector, create API-owned auth and core tables, ownership-safe query targets, lineage parent tables, immutability triggers, the transactional `create_core_version(...)` function, Phase 3 fork/diff/AI request foundations, and Phase 4 Copilot retrieval tables.

Copy `.env.example` to `.env` and fill only the values required for your environment:

- Browser-safe: `VITE_API_URL`
- Server-only: `DATABASE_URL` or `PG*`, `AUTH_JWT_SECRET`, `STORAGE_PATH`
- Server AI boundaries: `GEMINI_*`, `GROQ_*`, `AI_DAILY_*`

Never expose `AUTH_JWT_SECRET`, `GEMINI_API_KEY`, or `GROQ_API_KEY` to Vite or browser code.

---

## 6. How to Start the Web App

```bash
pnpm dev:web
```

The Web client will be available at `http://localhost:5173`.

To build the web bundle:
```bash
pnpm build
```

---

## 7. How to Start the API

```bash
pnpm dev:api
```

The Fastify API server will be available at `http://localhost:3000`.
Health endpoint: `http://localhost:3000/health`

---

## 8. Phase 2 Workspace Flow

All project endpoints require `Authorization: Bearer <Canopy access token>`. The web app obtains this from the API-owned `/v1/auth/register` or `/v1/auth/login` endpoints and sends it through `packages/api-client`.

Implemented:
- `POST /v1/projects`
- `GET /v1/projects`
- `GET /v1/projects/:projectId`
- `POST /v1/projects/:projectId/assets`
- `GET /v1/assets/:assetId/url`
- `POST /v1/projects/:projectId/versions/import`
- `POST /v1/projects/:projectId/versions`
- `POST /v1/versions/:versionId/continue`
- `GET /v1/projects/:projectId/lineage`
- `POST /v1/projects/:projectId/fork`
- `POST /v1/projects/:projectId/merge`
- `POST /v1/projects/:projectId/memories`
- `POST /v1/projects/:projectId/memories/propose`
- `GET /v1/projects/:projectId/memories`
- `PATCH /v1/memories/:memoryId`
- `POST /v1/memories/:memoryId/confirm`
- `POST /v1/memories/:memoryId/archive`
- `POST /v1/diffs`

The supported web lifecycle is:

```text
Sign in -> Create Project -> Upload Image -> Import V1 -> Edit Working State -> Save Version V2 -> Continue from V1 -> Save Version V3 -> Fork / Merge / Remember / Compare -> Read Lineage
```

Versions are immutable. Parent edges are ordered and multi-parent capable. Working State is local/editor state until the explicit Save Version action succeeds.

The browser never writes directly to PostgreSQL or object storage. Authoritative operations go:

```text
Web -> Canopy API -> Core operations -> PostgreSQL + storage abstraction
```

---

## 9. Tests and Verification

```bash
pnpm test
pnpm build
pnpm verify
node scripts/test-api-startup.js
```

The committed tests cover pure domain invariants and route-level Core behavior with injected repositories. Database constraints and ownership checks are encoded in migrations and API repositories; run them against PostgreSQL before exercising the real repository.

---

## 10. What is Intentionally NOT Implemented Yet

Reserved for later phases:

- AI image generation or editing
- live Gemini or Groq provider calls
- observed visual diff from provider output
- Android Copilot and expanded Copilot/MCP integrations
- MCP tools
- Android client features
- AI memory extraction
- AI merge
- collaboration, roles, plugins, browser extensions, public developer API, video/audio timelines
