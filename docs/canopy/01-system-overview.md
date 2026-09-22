# 01 — System Overview & Architecture

> **Platform:** Canopy Creative Evolution Infrastructure
> **Version:** 0.1.0

---

## 1. Executive Summary

Canopy is a platform for versioning, understanding, and preserving human + AI creative work in a single, authoritative, immutable ledger.

### Architectural Core Concepts

1. **Projects as Evolution Repositories:** A project represents a creative goal and owns an acyclic lineage graph of creative versions.
2. **Immutable Version Ledger:** Creative versions are immutable once written to PostgreSQL. Database-level constraints and grants revoke `UPDATE` and `DELETE` on version records.
3. **One Write Path:** All mutations enter through the Core Fastify REST API (`/v1`). Web, Android, and MCP clients consume identical REST contracts.
4. **Three Evidence Sources for Diff:**
   - *Declared Delta:* Deterministic from action records in `packages/domain`.
   - *Path Summary:* Text summary of version transitions generated via Groq reasoning.
   - *Observed Delta:* Multi-image visual analysis generated via Gemini Vision.
5. **Creative Memory:** User-authored durable memories (`active`) vs AI-extracted proposals (`proposed`). Stores subjective interpretation (*what it meant*) without duplicating lineage facts (*what happened*).
6. **Canopy Copilot:** Closed tool-set planner using Groq reasoning with SSE streaming and grounded citation validation.

---

## 2. Technology Stack & Boundaries

| Component | Framework / Technology | Purpose |
|---|---|---|
| **Core API Server** | Node.js, Fastify, Pure ESM JS | Single write boundary, authentication, project isolation, Core business logic |
| **Database** | PostgreSQL 16+, pgvector | Sole source of truth for projects, versions, assets, lineage, memories, & vector embeddings |
| **Web Client** | React 18, Vite, Tailwind CSS, Zustand, Fabric.js, React Flow | Interactive creative workspace, lineage DAG viewer, diff compare drawer, Copilot chat |
| **Android Client** | JavaScript, React Native, Expo | Phase 1 public/marketing foundation |
| **MCP Service** | Node.js, `@modelcontextprotocol/sdk`, Stdio | Standardized AI agent interface over `/v1` REST API |
| **AI Integration** | Gemini (`google-ai`), Groq (`groq`) | Gemini (vision diff, embeddings), Groq (path summary, Copilot planning & grounded Q&A) |
