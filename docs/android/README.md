# Canopy Android

Phase 1 adds the React Native public-facing Android foundation under `apps/android`.

## Architecture

Android is a first-class Canopy client:

```text
Android -> Canopy REST API -> Core/repositories -> PostgreSQL/storage
```

Android does not access PostgreSQL, pgvector, object storage, Gemini, Groq, or
Core internals directly.

## Stack

- JavaScript
- React Native
- Expo
- `@canopy/api-client`
- Shared Canopy visual language

## Screens

- Home / public product overview.
- Features.
- How Canopy Works.
- Use Cases.
- Developers.
- Documentation.
- Pricing.

## API Contract

The app imports `@canopy/api-client`, the same JavaScript client used by Web and
the shared API tooling. Later authenticated/mobile workflows remain intentionally
outside Phase 1.

## Auth And Cache

Authentication and token storage are not part of Phase 1 Android.

## Build And APK

```bash
pnpm --filter @canopy/android build
```

This runs `expo export` and validates the JavaScript bundle. Use `pnpm --filter
@canopy/android android` to prebuild and launch the React Native app on a local
Android emulator or device.
