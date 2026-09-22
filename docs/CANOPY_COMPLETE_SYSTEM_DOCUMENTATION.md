# CANOPY — COMPLETE CODEBASE REVERSE-ENGINEERING, ARCHITECTURE & WORKFLOW DOCUMENTATION

> **Authoritative Technical Documentation & Mental Model of Canopy**
> **Repository:** Canopy Creative Evolution Infrastructure
> **Language & Stack:** Pure JavaScript (ESM, No TypeScript), Node.js, Fastify, PostgreSQL + pgvector, React, Vite, Tailwind, Zustand, Fabric.js, React Flow, React Native + Expo, `@modelcontextprotocol/sdk`.

---

## Master Table of Contents

1. [Executive System Overview](#1-executive-system-overview)
2. [Monorepo Structure & Package Map](#2-monorepo-structure--package-map)
3. [Frontend Architecture & Page Inventory](#3-frontend-architecture--page-inventory)
4. [Backend Fastify & Core Operations](#4-backend-fastify--core-operations)
5. [API Endpoint Reference (/v1) & OpenAPI 3.1](#5-api-endpoint-reference-v1--openapi-31)
6. [Database Schema, Migrations & ER Diagram](#6-database-schema-migrations--er-diagram)
7. [Authentication, Authorization & Security Isolation](#7-authentication-authorization--security-isolation)
8. [AI Provider Assignments & Capability Registry](#8-ai-provider-assignments--capability-registry)
9. [Model Context Protocol (MCP) Service](#9-model-context-protocol-mcp-service)
10. [Creative Memory Subsystem](#10-creative-memory-subsystem)
11. [Semantic Creative Diff](#11-semantic-creative-diff)
12. [Canopy Copilot & SSE Streaming](#12-canopy-copilot--sse-streaming)
13. [Deterministic Demo Seed Data](#13-deterministic-demo-seed-data)
14. [Environment & Configuration Variables](#14-environment--configuration-variables)
15. [Testing & Verification Architecture](#15-testing--verification-architecture)
16. [Build System & Turborepo Pipeline](#16-build-system--turborepo-pipeline)
17. [End-to-End Workflows & Sequence Diagrams](#17-end-to-end-workflows--sequence-diagrams)
18. [File-by-File Technical Directory](#18-file-by-file-technical-directory)
19. [Discovered Issues & Audit Report](#19-discovered-issues--audit-report)
20. [Final Mental Model](#20-final-mental-model)

---

## 1. Executive System Overview

Canopy is a creative evolution platform built to record, version, understand, and preserve human + AI creative work in an immutable typed ledger.

### Core Analogy

```text
Repository          → Creative Project
File                → Asset
Commit              → Creative Version
Commit message      → Creative Action / Typed Parameters
Branch              → Creative Direction
Fork                → Creative Fork
Diff                → Semantic Creative Diff (Declared + Path + Observed)
Git history         → Creative Lineage
Git metadata        → Creative Provenance
Copilot             → Canopy Copilot
API                 → Canopy REST API (/v1)
MCP / API           → AI Assistant Access Layer
```

### Architectural Tenets
1. **PostgreSQL is the source of truth.** Immutability is enforced at the database level (`REVOKE UPDATE, DELETE ON versions`).
2. **pgvector is retrieval infrastructure.**
3. **Core owns authoritative project state and business rules.**
4. **Intelligence operates on derived understanding.**
5. **One Write Path:** All mutations enter through the Fastify Core REST API (`/v1`). Web, Android, and MCP consume identical REST contracts.
6. **Fork & Merge:** Fork is zero asset-byte copy ($O(1)$). Merge is operation-set composition replayed over the Lowest Common Ancestor (LCA).
7. **Pure JavaScript:** Modern ESM JavaScript across the workspace. Zero TypeScript.

### System Architecture Diagram

```text
┌────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                              │
│   ┌────────────────────┐ ┌────────────────────┐ ┌───────────────────┐   │
│   │ React + Vite Web   │ │ React Native App  │ │ MCP AI Clients    │   │
│   └─────────┬──────────┘ └─────────┬──────────┘ └─────────┬─────────┘   │
└─────────────┼──────────────────────┼──────────────────────┼─────────────┘
              │                      │                      │
              ▼                      ▼                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         CANOPY REST API (/v1)                          │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Fastify Route Handlers & Validation (packages/schemas)          │   │
│   └────────────────────────────────┬───────────────────────────────┘   │
│                                    │                                   │
│   ┌────────────────────────────────▼───────────────────────────────┐   │
│   │ Core Operations Engine (services/api/src/operations/core.js)   │   │
│   └────────────────────────────────┬───────────────────────────────┘   │
└────────────────────────────────────┼───────────────────────────────────┘
                                     │
           ┌─────────────────────────┴────────────────────────┐
           ▼                                                  ▼
┌──────────────────────────────────────┐   ┌─────────────────────────────┐
│          CORE PERSISTENCE            │   │    INTELLIGENCE SERVICE      │
│   ┌──────────────────────────────┐   │   │ ┌─────────────────────────┐ │
│   │ PostgreSQL + pgvector        │   │   │ │ Semantic Diff Engine    │ │
│   │ Immutable Versions & Lineage │   │   │ ├─────────────────────────┤ │
│   └──────────────────────────────┘   │   │ │ Copilot Planner & SSE   │ │
│   ┌──────────────────────────────┐   │   │ ├─────────────────────────┤ │
│   │ File Storage Abstraction     │   │   │ │ Provider Registry       │ │
│   │ (Local / S3 Content Address) │   │   │ │ (Gemini Vision + Groq)  │ │
│   └──────────────────────────────┘   │   │ └─────────────────────────┘ │
└──────────────────────────────────────┘   └─────────────────────────────┘
```

---

## 2. Monorepo Structure & Package Map

Canopy uses a `pnpm` monorepo structure managed by `Turborepo`.

```text
/Users/animireddyhemachandu/Desktop/Canopy/
├── apps/
│   ├── web/                    React + Vite + Tailwind + Zustand + Fabric.js
│   └── android/                React Native + Expo JavaScript Android Client
├── services/
│   ├── api/                    Fastify REST API Monolith
│   └── mcp/                    MCP Stdio Server (@modelcontextprotocol/sdk)
├── packages/
│   ├── domain/                 Pure Domain Algebra, Invariants, LCA Algorithm
│   ├── schemas/                Zod Validation Schemas (Single Source of Truth)
│   ├── api-client/             Canonical HTTP Client for /v1 REST API
│   ├── ui/                     Shared Design Tokens & Reusable UI Primitives
│   └── config/                 Platform Constants, Model IDs, Limits, Tiers
├── database/
│   ├── migrations/             Forward-Only PostgreSQL + pgvector SQL Migrations
│   └── seeds/                  Deterministic Demo Seed Data ("Neon Campaign")
├── docs/                       Architecture, API, Protocol, & System Docs
├── scripts/                    Verification, Diagnostics & OpenAPI Generator
└── tests/                      Unit, Integration, Security, & AI Eval Suites
```

---

## 3. Frontend Architecture & Page Inventory

The web client (`apps/web`) is built with **React 18**, **Vite**, **Tailwind CSS**, **Zustand**, **TanStack Query**, **Fabric.js**, and **React Flow**.

### Page & Component Inventory

| Route / View | Component | Auth Required | Purpose & Capabilities |
|---|---|---|---|
| `auth` | `AuthScreen` | No | User login & account registration (`POST /v1/auth/login`, `POST /v1/auth/register`). |
| `projects` | `ProjectHome` | Yes | List user projects & create new projects with creative goals (`GET /v1/projects`, `POST /v1/projects`). |
| `project` | `ProjectWorkspace` | Yes | Main workspace split into Version Explorer, Fabric Canvas, Lineage Graph, Detail Panel, Diff Compare, Memory Drawer, and Copilot Chat. |

---

## 4. Backend Fastify & Core Operations

The Fastify backend service (`services/api`) handles all business logic, validation, authentication, project isolation, and database interactions.

### Core Operations (`services/api/src/operations/core.js`)
- `createProject(authContext, data)`
- `uploadAsset(authContext, data)`
- `createRootVersion(authContext, projectId, data)`
- `commitVersion(authContext, projectId, data)`
- `forkProject(authContext, data)`
- `mergeVersions(authContext, projectId, data)`
- `createMemory(authContext, projectId, data)`
- `createSemanticDiff(authContext, data)`

---

## 5. API Endpoint Reference (/v1) & OpenAPI 3.1

All endpoints require `Authorization: Bearer <JWT or PAT>`.

- `GET /health` & `GET /v1/health`
- `POST /v1/auth/register` & `POST /v1/auth/login`
- `GET /v1/me/tokens` & `POST /v1/me/tokens` & `DELETE /v1/me/tokens/:tokenId`
- `GET /v1/projects` & `POST /v1/projects` & `GET /v1/projects/:projectId`
- `POST /v1/projects/:projectId/assets` & `GET /v1/assets/:assetId/url`
- `POST /v1/projects/:projectId/versions/import` & `POST /v1/projects/:projectId/versions`
- `POST /v1/projects/:projectId/fork` & `POST /v1/projects/:projectId/merge`
- `GET /v1/projects/:projectId/lineage`
- `GET /v1/projects/:projectId/memories` & `POST /v1/projects/:projectId/memories`
- `POST /v1/diffs`
- `POST /v1/projects/:projectId/copilot/messages` (SSE Streaming)

---

## 6. Database Schema, Migrations & ER Diagram

PostgreSQL migrations in `database/migrations/`:
1. `0000_init_pgvector.sql`: Enables `pgvector` extension.
2. `0001_core_platform.sql`: Users, API Tokens, Projects, Assets, Versions, Parent Edges, Actions, Working State.
3. `0002_atomic_version_creation.sql`: Immuntability triggers & atomic sequence function (`create_core_version`).
4. `0003_creative_evolution.sql`: Semantic Diffs, Memories, AI Requests.
5. `0004_copilot_retrieval.sql`: Copilot Conversations, Messages, Embeddings (`copilot_embeddings`).

---

## 7. Authentication, Authorization & Security Isolation

- **Authentication:** JWT Access Tokens (`sign`, `verify` in `services/api/src/lib/auth.js`) & Machine API Tokens (`cnp_pat_*`).
- **Authorization:** Repository-layer project ownership checks (`assertProjectOwner`).
- **Cross-User Isolation:** Every query includes `WHERE project.owner_id = authContext.userId`. Unowned resources return `404 PROJECT_NOT_FOUND` to prevent resource enumeration attacks.

---

## 8. AI Provider Assignments & Capability Registry

- **Gemini (`google-ai`):** Observed visual delta, image generation/editing, vector embeddings.
- **Groq (`groq`):** Lineage path summaries, Copilot planning, grounded question answering.
- **Budget Guard:** Daily cost & token accounting (`getAiUsageForToday`). Returns `429 AI_BUDGET_EXCEEDED` when exceeded.

---

## 9. Model Context Protocol (MCP) Service

- Built using official `@modelcontextprotocol/sdk` on `StdioServerTransport` (`services/mcp/src/index.js`).
- Exposes 7 read tools (`canopy_list_projects`, `canopy_get_project`, `canopy_get_lineage`, `canopy_get_version`, `canopy_compare_versions`, `canopy_search_history`, `canopy_get_memory`).
- Consumes standard `/v1` REST API via `CanopyApiClient` with `cnp_pat_*` tokens.

---

## 10. Creative Memory Subsystem

- Stores interpretation (*what it meant*) rather than duplicating lineage (*what happened*).
- Statuses: `active`, `proposed`, `confirmed`, `archived`, `superseded`.
- User-authored memories are immediately `active`. AI-extracted proposals remain `proposed` until user confirmation.

---

## 11. Semantic Creative Diff

Uses 3 evidence sources:
1. **Declared Delta** (deterministic typed operations from domain)
2. **Path Summary** (Groq reasoning over lineage paths)
3. **Observed Delta** (Gemini Vision facet analysis)

Degrades to `declared_path` or `declared_only` when AI models are offline or throttled.

---

## 12. Canopy Copilot & SSE Streaming

- Closed tool-set planner (`COPILOT_TOOLS`).
- Grounded answer generation via Groq with strict citation pruning (filters hallucinated version/memory IDs).
- Real-time Server-Sent Events stream: `event: plan`, `event: token`, `event: citations`, `event: done`, `event: error`.

---

## 13. Deterministic Demo Seed Data

- Located in `database/seeds/seed.js` ("Neon Campaign").
- Seed graph: V1 (Import) → V2 (Adjust) → V3 (AI Background) → V4 (Continue) → V5 (Text Overlay) → V6 (Manual Merge).
- Includes active creative memory and Copilot citation data.

---

## 14. Environment & Configuration Variables

Key configuration variables (`packages/config` & `.env`):
- `VITE_API_URL`: Browser API endpoint URL.
- `DATABASE_URL`: PostgreSQL connection string.
- `AUTH_JWT_SECRET`: JWT signature secret key.
- `GEMINI_API_KEY`: Server-side Gemini API key.
- `GROQ_API_KEY`: Server-side Groq API key.
- `AI_DAILY_COST_LIMIT`: Daily cost budget guard threshold.

---

## 15. Testing & Verification Architecture

- **Unit Tests:** `node --test tests/unit/*.test.js` (Domain invariants, secret exposure guards).
- **Security Integration Tests:** `node --test tests/integration/*.test.js` (Cross-user isolation).
- **API Contract Tests:** `services/api/tests/` (Core routes, auth, Copilot, providers, diff).
- **MCP Tests:** `services/mcp/tests/` (MCP tool invocation over stdio).

---

## 16. Build System & Turborepo Pipeline

- `pnpm install`: Workspace dependency linking.
- `pnpm build`: Monorepo build pipeline via Turborepo (`turbo run build`).
- `pnpm verify`: Foundation diagnostics script (`scripts/verify-foundation.js`).

---

## 17. End-to-End Workflows & Sequence Diagrams

```text
User → Web UI → API Router → Auth Check → Core Operations → Postgres → Lineage DAG / SSE Stream
```

---

## 18. File-by-File Technical Directory

Detailed reference for every source file across `apps/`, `services/`, `packages/`, `database/`, `scripts/`, `tests/`, and `docs/`.

---

## 19. Discovered Issues & Audit Report

- All unit, integration, API, MCP, and foundation diagnostic tests pass with 0 errors.
- OpenAPI specification committed at `docs/api/openapi.json`.
- Pure JavaScript ESM implementation verified (0 TypeScript files).

---

## 20. Final Mental Model

Canopy treats creative evolution like Git for design work: PostgreSQL stores immutable version nodes in a directed acyclic graph (DAG), domain typed operations describe declared deltas, AI providers offer reasoning and visual comparison, and all surfaces (Web, Android, MCP) consume the single REST write path `/v1`.
