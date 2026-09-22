# 15 — Testing & Verification Architecture

Canopy implements automated unit, integration, API contract, and security isolation tests.

---

## Test Suites Inventory

1. **Domain & Invariant Unit Tests:** [`tests/unit/domain.test.js`](file:///Users/animireddyhemachandu/Desktop/Canopy/tests/unit/domain.test.js)
   - Tests invariants I-1 to I-11, cycle detection, parent validation, LCA merge algebra, and memory lineage fact checks.
2. **Secret Exposure Guard Test:** [`tests/unit/no-secret-exposure.test.js`](file:///Users/animireddyhemachandu/Desktop/Canopy/tests/unit/no-secret-exposure.test.js)
   - Ensures server-only AI keys (`GEMINI_API_KEY`, `GROQ_API_KEY`) are never referenced or imported by browser or Android client source files.
3. **Cross-User Security Isolation Integration Tests:** [`tests/integration/security-isolation.test.js`](file:///Users/animireddyhemachandu/Desktop/Canopy/tests/integration/security-isolation.test.js)
   - Verifies 404 access denial when User B attempts to view or mutate User A's projects, lineage, memories, or forks.
4. **API Route & Auth Contract Tests:** [`services/api/tests/`](file:///Users/animireddyhemachandu/Desktop/Canopy/services/api/tests/)
   - Tests route validation, idempotency key retries, PAT token authentication, Copilot planning, provider registry, and Semantic Diff fallback.
5. **MCP Server Tests:** [`services/mcp/tests/mcp.test.js`](file:///Users/animireddyhemachandu/Desktop/Canopy/services/mcp/tests/mcp.test.js)
   - Tests MCP SDK tool listing and tool invocation over stdio.

---

## Verification Commands

- `pnpm test` — Run full test suite across packages.
- `pnpm verify` — Run foundation diagnostics script (`scripts/verify-foundation.js`).
- `node scripts/test-api-startup.js` — Test Fastify server initialization and health endpoint.
- `node scripts/generate-openapi.js` — Generate and verify committed OpenAPI 3.1 schema.
