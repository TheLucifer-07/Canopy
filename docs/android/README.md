# Canopy Android

Phase 5 adds an Android client boundary under `apps/android`.

## Architecture

Android is a first-class Canopy client:

```text
Android -> Canopy REST API -> Core/repositories -> PostgreSQL/storage
```

Android does not access PostgreSQL, pgvector, object storage, Gemini, Groq, or
Core internals directly.

## Stack

- Kotlin
- Jetpack Compose
- Compose Navigation-ready structure
- Ktor client
- kotlinx.serialization
- Room cache for projects and versions
- DataStore token boundary
- Coil for immutable asset URLs
- Hilt

## Screens

- Projects: project list with loading, empty, and error state hooks.
- Lineage: vertically scrollable versions from the existing lineage API.
- Version Detail: asset image, metadata, action, actor/model, parent/version info.
- Copilot field: present from Version Detail/project context. Provider calls remain
  server-side through the Canopy API.

## API Contract

DTOs mirror current `/v1` REST responses. There is no OpenAPI generation pipeline
in the current repository, so this phase adds the smallest deterministic Kotlin
contract layer and documents that generated clients should replace it when
`docs/api/openapi.json` generation lands.

## Auth And Cache

The app uses the same email/password API as Web. Passwords are never stored.
Access tokens are encrypted with an Android Keystore AES key and the ciphertext is
stored in DataStore. Room is read-only cache, not source of truth.

## Build

```bash
pnpm --filter @canopy/android build
```

In this environment, Gradle is not installed, so Android compile/emulator
verification is blocked. The package scripts report that explicitly instead of
pretending the app was compiled.
