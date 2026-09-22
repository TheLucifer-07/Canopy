# 07 — Authentication, Authorization & Security Isolation

Canopy enforces strict authentication and project-level authorization across every API endpoint and client layer.

---

## 1. Authentication Mechanisms

### User JWT Tokens
- Issued upon successful registration (`/v1/auth/register`) or login (`/v1/auth/login`).
- Payload contains `sub` (User ID), `email`, and `exp` expiration time.
- Signed with HMAC-SHA256 (`AUTH_JWT_SECRET`).

### Machine API Tokens (`cnp_pat_*`)
- Created via `POST /v1/me/tokens` with explicit scope sets (e.g., `projects:read`, `versions:write`, `memory:read`).
- Plaintext token shown once to user (`cnp_pat_<32_random_bytes>`).
- Hashed via SHA-256 (`token_hash`) for storage and verification in `api_tokens` table.

---

## 2. Authorization & Cross-User Security Isolation

- **Repository-Level Checks:** Every repository method takes an `AuthContext` object (`userId`, `email`, `scopes`).
- **Owner Verification:** Core operations verify that `project.owner_id === authContext.userId` before returning or mutating any resource.
- **Enumeration Defense:** Attempting to access or mutate an unowned project, version, asset, lineage, memory, or Copilot conversation returns HTTP `404 PROJECT_NOT_FOUND` rather than `403 FORBIDDEN` to prevent resource enumeration attacks.
- **Tested Guarantee:** Covered by integration suite [`tests/integration/security-isolation.test.js`](file:///Users/animireddyhemachandu/Desktop/Canopy/tests/integration/security-isolation.test.js).
