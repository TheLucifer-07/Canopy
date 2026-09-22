# 19 — Discovered Issues & Audit Report

Documentation audit and verification findings across the Canopy repository.

---

## 1. Verified Compliance Summary

- **Pure JavaScript ESM:** 100% verified. 0 TypeScript files found across the monorepo.
- **Unit & Invariant Tests:** 100% passing (`node --test tests/unit/*.test.js`).
- **Security Isolation Tests:** 100% passing (`node --test tests/integration/*.test.js`).
- **Full Monorepo Suite:** 100% passing (`pnpm test`).
- **Foundation Diagnostics:** 100% passing (`pnpm verify`).
- **API Health Check:** Fastify server initializes clean (`node scripts/test-api-startup.js`).
- **OpenAPI 3.1 Spec:** Generated and committed at [`docs/api/openapi.json`](file:///Users/animireddyhemachandu/Desktop/Canopy/docs/api/openapi.json).
- **Monorepo Build:** Turborepo build passes across all packages (`pnpm build`).
- **Git Whitespace:** 0 formatting errors (`git diff --check`).

---

## 2. Discovered Issues & Observations

1. **Secret Exposure Unit Test Scope:** `no-secret-exposure.test.js` initially attempted to read generated mobile build artifacts when searching recursively inside `apps/android`. Fixed by filtering source file extensions (`.js`, `.jsx`, `.json`, etc.).
2. **React Native Android Environment Dependency:** The Android runtime requires Expo CLI and a configured emulator/device. JavaScript smoke tests and Expo bundle export remain runnable in headless CI.
3. **Chunk Size Warning:** Vite build produces a single JavaScript chunk (`dist/assets/index-D0UdT1RN.js`, 568 kB) exceeding the 500 kB default Vite warning threshold. Application functions correctly without runtime issues.
