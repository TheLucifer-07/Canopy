# Canopy Android Client

## Architectural Position

Canopy Android is the React Native public-facing mobile client. It consumes the same REST contracts as Canopy Web and shares the Canopy brand language without duplicating backend logic.

## Stack & Capabilities

- **Language & UI**: JavaScript, React Native, Expo.
- **Scope**: Phase 1 public foundation with Home, Features, How It Works, Use Cases, Developers, Docs, and Pricing views.
- **Shared contract**: `@canopy/api-client` is the JavaScript API boundary.

## Current Implementation Phase

The previous Kotlin/Compose implementation was removed. Phase 1 deliberately does not implement authentication, workspace, lineage, or other later roadmap phases on Android.

## Build

```bash
pnpm --filter @canopy/android build
```

This produces an Expo JavaScript export. To run the React Native app on an Android emulator or device:

```bash
pnpm --filter @canopy/android start
pnpm --filter @canopy/android android
```

Set `EXPO_PUBLIC_API_URL` when the public app needs to resolve a non-default API host.
