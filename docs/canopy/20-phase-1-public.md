# Phase 1 Public Product Surface

## Architecture

The public product surface is implemented as two thin application shells
around shared Canopy contracts and visual language.

### Web

- `apps/web/src/App.jsx` is the composition root.
- `apps/web/src/app/router/AppRoutes.jsx` owns route composition and preserves
  the existing auth and workspace entry points.
- `apps/web/src/components/marketing/MarketingShell.jsx` owns public header,
  responsive navigation, footer, and the public layout outlet.
- `apps/web/src/pages/public/PublicPages.jsx` owns route-level page content.
- `apps/web/src/components/marketing/ProductPreviews.jsx` owns reusable,
  product-native lineage, diff, Copilot, and developer-flow visualizations.
- `apps/web/src/components/icons/index.jsx` is the centralized Lucide icon
  registry used by the marketing surface.

The existing workspace remains under `apps/web/src/workspace`, authentication
under `apps/web/src/auth`, and API/editor state under `apps/web/src/shared`.
Public pages do not duplicate workspace data access.

## Phase 1 Routes

The public web routes are:

`/`, `/features`, `/how-it-works`, `/use-cases`, `/developers`, `/docs`,
`/documentation` (redirect), `/pricing`, `/contact`, and `/download/android`.

Authenticated product routes remain under `/app` and `/app/projects/:id`.

## Android

Android is React Native JavaScript via Expo. The composition root is
`apps/android/App.jsx`; it mounts `PublicNavigator` and route-specific
`PublicScreen` content. Kotlin, Compose, Hilt, Room, and Gradle application
code are not part of the current Android implementation.

`PublicNavigator` provides a compact top bar and accessible modal drawer.
Public content uses a vertical reading flow suited to narrow screens, with
the same product concepts as the web surface. `src/api.js` remains the mobile
entry point for the shared Canopy API client when authenticated product flows
are expanded.

## Design System

The public surface uses the Canopy dark workspace language: near-black
backgrounds, restrained surfaces and borders, warm white text, secondary gray
text, green action states, purple AI states, and blue human-authored states.
Web tokens live in `apps/web/tailwind.config.js`; mobile tokens live in
`apps/android/src/theme/index.js`. Interactive controls expose visible focus
states, descriptive labels, and reduced-motion behavior where animation is
used.

Product visuals show real Canopy concepts rather than generic illustrations:
version lineage, semantic diff, cited Copilot responses, and MCP/API flow.
Pricing and contact content are explicitly truthful about the current
prototype state and do not imply unavailable billing or server-side forms.
