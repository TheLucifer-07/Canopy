# 02 — Monorepo Architecture & Package Map

Canopy uses a `pnpm` workspace managed by `Turborepo`.

---

## Workspace Map

### Apps (`apps/`)

- [`apps/web`](file:///Users/animireddyhemachandu/Desktop/Canopy/apps/web): React 18 SPA built with Vite, Tailwind CSS, Zustand state management, Fabric.js canvas editor, and React Flow DAG graph visualization.
- [`apps/android`](file:///Users/animireddyhemachandu/Desktop/Canopy/apps/android): React Native + Expo JavaScript Android public client.

### Services (`services/`)

- [`services/api`](file:///Users/animireddyhemachandu/Desktop/Canopy/services/api): Fastify REST API modular monolith providing authentication, Core operations, database persistence, and AI intelligence pipelines.
- [`services/mcp`](file:///Users/animireddyhemachandu/Desktop/Canopy/services/mcp): Model Context Protocol server exposing read tools over stdio.

### Packages (`packages/`)

- [`packages/domain`](file:///Users/animireddyhemachandu/Desktop/Canopy/packages/domain): Pure domain invariants, declared delta calculations, cycle detection, and LCA merge algebra (Zero I/O, zero HTTP/DB imports).
- [`packages/schemas`](file:///Users/animireddyhemachandu/Desktop/Canopy/packages/schemas): Single source of truth for request and response validation schemas using Zod.
- [`packages/api-client`](file:///Users/animireddyhemachandu/Desktop/Canopy/packages/api-client): Universal JavaScript HTTP client for `/v1` REST API.
- [`packages/ui`](file:///Users/animireddyhemachandu/Desktop/Canopy/packages/ui): Reusable UI primitives (Button, Badge, etc.) and design system helpers.
- [`packages/config`](file:///Users/animireddyhemachandu/Desktop/Canopy/packages/config): Platform constants, error codes, model IDs, upload limits, and fidelity tiers.

### Database (`database/`)

- [`database/migrations`](file:///Users/animireddyhemachandu/Desktop/Canopy/database/migrations): Sequential forward-only SQL migration scripts (0000 to 0004).
- [`database/seeds`](file:///Users/animireddyhemachandu/Desktop/Canopy/database/seeds): Deterministic demo project seed data ("Neon Campaign").
