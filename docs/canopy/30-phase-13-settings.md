# Phase 13 — ⚙️ Settings (Account, Appearance, Preferences, Security, API Tokens, AI, Connected Services)

## 1. Overview

Phase 13 establishes the authoritative, persistent **Settings** system in Canopy across Web and Android.

Settings provides 7 core product sections:
1. **Account**: Read-only account parameters (email, handle, active status, creation timestamp) and session logout.
2. **Appearance**: Persisted visual and accessibility preferences (`theme`, `density`, `reduced_motion`).
3. **Preferences**: Creator workflow defaults (`default_landing`, `default_asset_view`, `email_notifications`, `activity_density`).
4. **Security**: Real JWT session parameters, hashed credential status, and truthful statements regarding unconfigured 2FA/SSO capabilities.
5. **API Tokens**: Personal Access Token (PAT) lifecycle management (create, list, revoke, single-view raw secret display) reusing Phase 10 infrastructure.
6. **AI Settings**: User-level Copilot groundedness, Semantic Diff analysis depth, proactive suggestions, and review of internal dual-provider engines (Gemini 1.5 + Groq LLaMA 3.3) with zero server credential leakage.
7. **Connected Services**: Truthful inspection of active platform protocols (MCP v0.1.0, AI Reasoning, PostgreSQL vector database) and honest empty states for unconfigured external OAuth integrations.

---

## 2. Architecture & Persistence Model

```
Web / Android
      ↓
Fastify API (/v1/me/settings)
      ↓
PostgreSQL Core Repository
      ↓
Supabase PostgreSQL (profiles.preferences JSONB & api_tokens tables)
```

### Persistence Design
- General user configuration (`appearance`, `preferences`, `ai`) is stored directly inside the existing `profiles.preferences` JSONB column on the `profiles` table. This avoids unnecessary duplicate tables and integrates with the existing profile architecture.
- API tokens reuse the dedicated `api_tokens` table created in Phase 10.
- No new migration is needed because `profiles.preferences` and `api_tokens` already provide the required schema.

---

## 3. API Contract

### Endpoints
- `GET /v1/me/settings` — Returns the consolidated user settings object (`account`, `appearance`, `preferences`, `ai`).
- `PATCH /v1/me/settings` — Partially updates appearance, preferences, and/or AI settings for the authenticated user.

### Validation Schema (`UserSettingsUpdateSchema`)
```javascript
z.object({
  appearance: z.object({
    theme: z.enum(['canopy-dark', 'system']).optional(),
    density: z.enum(['comfortable', 'compact']).optional(),
    reduced_motion: z.boolean().optional()
  }).optional(),
  preferences: z.object({
    default_landing: z.enum(['dashboard', 'projects', 'activity']).optional(),
    default_asset_view: z.enum(['grid', 'table', 'split']).optional(),
    email_notifications: z.boolean().optional(),
    activity_density: z.enum(['standard', 'detailed']).optional()
  }).optional(),
  ai: z.object({
    copilot_groundedness: z.enum(['strict', 'balanced', 'creative']).optional(),
    diff_detail_level: z.enum(['standard', 'deep', 'concise']).optional(),
    enable_suggestions: z.boolean().optional()
  }).optional()
}).strict()
```

---

## 4. Security & Tenancy Invariants

1. **Strict User Derivation**: Identity is derived exclusively from `authContext.userId` validated from JWT bearer tokens.
2. **Tenant Isolation**: User A cannot view or update User B's settings, nor view or revoke User B's API tokens.
3. **Zero Secret Leakage**:
   - Machine token secrets (`token_hash`) are never returned in list endpoints.
   - Raw plaintext tokens are returned strictly once upon creation.
   - Server-side AI API keys (Google Gemini, Groq) and database credentials are never transmitted to client browsers or mobile devices.
4. **Honest Capabilities**: No fake 2FA switches, fake password forms, or fake OAuth connect buttons are presented.

---

## 5. Web & Android Implementation

### Web (`apps/web`)
- Feature location: `apps/web/src/features/settings/`
- Navigation: `/app/settings` route with a 7-section sidebar (`AccountSettings.jsx`, `AppearanceSettings.jsx`, `PreferencesSettings.jsx`, `SecuritySettings.jsx`, `ApiTokensSettings.jsx`, `AiSettings.jsx`, `ConnectedServicesSettings.jsx`).
- Integrated into `WorkspaceShell.jsx` sidebar and profile dropdown menu.

### Android (`apps/android`)
- Feature location: `apps/android/src/features/workspace/SettingsSection.jsx`
- Section-based tabbed settings view integrated directly into `WorkspaceScreen.jsx`.

---

## 6. Verification & Test Coverage

- `tests/unit/api-client-settings.test.js`: API client getSettings and updateSettings unit tests.
- `services/api/tests/settings-routes.test.js`: End-to-end integration tests verifying GET/PATCH `/v1/me/settings`, schema validation, persistence, and strict cross-user tenancy isolation.
- `pnpm test`: 100% tests passing across all packages.
- `pnpm build`: Clean production builds.
- `pnpm verify`: Zero TypeScript violations; clean pure JavaScript foundation.
- `git diff --check`: 0 formatting or whitespace errors.
