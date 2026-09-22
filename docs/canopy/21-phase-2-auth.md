# 21 - Phase 2 Authentication

Phase 2 adds real Canopy account authentication to Web and React Native Android while preserving the Phase 1 public UI.

## Backend Contract

The client uses the existing Fastify API contract:

- `POST /v1/auth/login` with `email` and `password`.
- `POST /v1/auth/register` with `email`, `password`, and optional `display_name`.
- Authenticated requests use `Authorization: Bearer <access_token>`.
- Session restoration validates a stored token by calling the authenticated `GET /v1/me/tokens` endpoint.

Password rules match the backend: a valid email address and a password of at least 8 characters.

## Unsupported Prototype Flows

The backend does not currently expose password reset endpoints or OAuth providers. The Web and Android clients therefore do not show fake OAuth buttons and do not pretend to send reset email.

Email verification is not part of this prototype.

## Web Architecture

Web auth is componentized under:

- `apps/web/src/pages/auth`
- `apps/web/src/components/auth`
- `apps/web/src/features/auth`
- `apps/web/src/services/auth`
- `apps/web/src/stores/auth`

`AppRoutes` owns route-level protection through the auth store:

- Unauthenticated `/app/*` requests redirect to `/login`.
- Login preserves the intended protected destination.
- Authenticated users visiting `/login`, `/signup`, `/forgot-password`, or `/reset-password` redirect to `/app`.
- Logout clears the stored access token and returns the user to the public surface.

The web access token is stored in `localStorage` because the current backend issues bearer JWTs and does not provide an HTTP-only cookie session mechanism.

## Android Architecture

Android remains React Native + JavaScript. No Kotlin, Compose, Hilt, Room, or Gradle app implementation is used.

Android auth is organized under:

- `apps/android/src/screens/auth`
- `apps/android/src/features/auth`
- `apps/android/src/services`
- `apps/android/src/stores`
- `apps/android/src/components/branding`

The Android token is stored with Expo SecureStore and restored on app launch. The client exposes public, login, signup, unsupported password reset, loading, and authenticated states.

## Branding

The authoritative Web logo implementation is `@canopy/ui` (`CanopyLogo`, `CanopySymbol`, `CanopyWordmark`, and `CanopyAppIcon`). Web app usage imports through `apps/web/src/components/branding/CanopyLogo.jsx`.

Android has a matching React Native brand component at `apps/android/src/components/branding/CanopyLogo.jsx`.

The favicon is `apps/web/public/canopy.svg`.

## Tests

Phase 2 adds:

- Root unit coverage for auth validation.
- Root unit coverage for API-client auth endpoint usage.
- Android smoke coverage for React Native auth validation.

Existing API, MCP, workspace, and security tests remain unchanged.
