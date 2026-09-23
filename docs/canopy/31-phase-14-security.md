# Phase 14 — 🛡️ Security (Sessions, API Tokens, OAuth, Two-Factor Authentication, Ownership Isolation)

## 1. Overview

Phase 14 establishes the authoritative, truthful **Security** surface across Canopy Web and Android.

The surface delivers 5 core sections:
1. **Security Overview**: Concise, factual review of authenticated account identity, active sessions, API token volume, password encryption method, and truthful representation of unconfigured multi-factor/SSO boundaries.
2. **Sessions**: Information on the active JWT bearer session (HMAC-SHA256, 7-day TTL) and explicit clarification that multi-device session tracking and remote revocation are not configured.
3. **API Tokens (PAT)**: Complete machine-token credential lifecycle (listing with non-secret prefixes, generation with single-view plaintext token display, revocation with explicit confirmation modal, strict user ownership).
4. **OAuth Connections**: Truthful declaration that external identity providers (Google, GitHub, Figma) are not configured for this prototype deployment.
5. **Two-Factor Authentication (2FA)**: Truthful declaration that TOTP and WebAuthn hardware keys are not configured in this prototype deployment, with zero decorative/fake toggles.

---

## 2. Architecture & Security Invariants

```
Web / Android
      ↓
Fastify API (/v1/me/security, /v1/me/tokens)
      ↓
PostgreSQL Core Repository
      ↓
Supabase PostgreSQL (Authoritative Storage)
```

### Security Invariants
1. **Zero Trust for Client-Supplied Identity**: Identity is derived solely from verified cryptographic JWT bearer tokens (`authContext.userId`). Request body `userId` parameters are never used as authority.
2. **Cross-Tenant Isolation**: User A cannot read, modify, or revoke User B's security posture, sessions, or API tokens.
3. **Single-View Token Plaintext**: When generating a Personal Access Token (`cnp_pat_...`), the raw token plaintext is returned once in the creation HTTP response and never persisted in plaintext or returned in list endpoints.
4. **No Server Credential Leakage**: Database URLs, service role keys, JWT signing secrets, Gemini/Groq AI provider keys, and password hashes are never exposed in API responses or logs.
5. **Factual UX**: The interface does not invent arbitrary "Security Scores" (e.g. 87%), fake 2FA switches, or fake OAuth connect buttons.

---

## 3. API Contract

### Endpoints
- `GET /v1/me/security` — Returns the current user's security posture and metadata (`account`, `session`, `api_tokens`, `two_factor`, `oauth`, `password`, `recent_activity`).
- `GET /v1/me/tokens` — Lists active machine tokens (returns `id`, `name`, `token_prefix`, `scopes`, `revoked_at`, `last_used_at`, `created_at`; omits `token_hash`).
- `POST /v1/me/tokens` — Generates a new machine access token (returns metadata + single-view `token`).
- `DELETE /v1/me/tokens/:tokenId` — Revokes an existing machine token for the authenticated user.

---

## 4. Web & Android Implementation

### Web (`apps/web`)
- Primary feature path: `apps/web/src/features/security/`
  - `SecurityOverview.jsx`: Grid-based factual posture breakdown.
  - `SessionsSection.jsx`: Active bearer session inspection and logout.
  - `ApiTokensSection.jsx`: PAT lifecycle management with creation modal, scope selection, single-display token banner, and revocation confirmation dialog.
  - `OAuthSection.jsx`: Truthful unconfigured OAuth state.
  - `TwoFactorSection.jsx`: Truthful unconfigured 2FA state.
  - `SecurityView.jsx`: Unified 5-section layout with sidebar navigation.
- Accessible via `/app/security` and embedded directly in `/app/settings` -> Security.

### Android (`apps/android`)
- Feature path: `apps/android/src/features/workspace/SettingsSection.jsx`
- Pure React Native + Expo implementation with tabbed security view, token generation, single-view token secret display, and confirmation-protected token revocation.

---

## 5. Verification & Test Coverage

- `tests/unit/api-client-security.test.js`: API client unit tests for `getSecurityStatus()`.
- `services/api/tests/security-routes.test.js`: End-to-end integration tests verifying unauthenticated 401 rejections, accurate security status payload, strict cross-user tenancy isolation, and PAT token security.
- `pnpm test`: 100% test pass rate across all packages.
- `pnpm build`: Clean production builds for Web and mobile bundles.
- `pnpm verify`: Zero TypeScript violations; pure JavaScript validated.
- `git diff --check`: 0 formatting or whitespace errors.
