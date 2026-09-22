# 22 - Phase 3 Workspace

Phase 3 turns the authenticated `/app` area into the Canopy Workspace: the user's operational home for creative projects, recent versions, and real creative activity.

## Purpose

The Workspace answers:

- What am I working on?
- What changed recently?
- What should I open next?
- Which projects and versions exist for this authenticated user?
- What real actions can I perform now?

It adapts mature authenticated-product patterns from GitHub, but maps them to Canopy concepts: Creative Projects, Creative Versions, Creative Lineage, Creative Memory, Semantic Diff, and Canopy Copilot.

## Web Architecture

The workspace is no longer embedded in a dashboard block inside `Workspace.jsx`.

Current structure:

- `apps/web/src/pages/workspace/WorkspacePage.jsx` composes the workspace route.
- `apps/web/src/features/workspace/components/WorkspaceShell.jsx` owns authenticated header, sidebar, mobile drawer, profile menu, and product navigation.
- `apps/web/src/features/workspace/components/WorkspaceHome.jsx` owns the workspace home sections.
- `apps/web/src/features/workspace/hooks/useWorkspaceOverview.js` loads real API data.
- `apps/web/src/features/workspace/services/workspaceData.js` derives project summaries, recent versions, and activity from real API responses.

The existing project editor/detail workflow remains in `apps/web/src/workspace/Workspace.jsx` and is still reachable at `/app/projects/:id`.

## Navigation

Authenticated navigation exposes:

- Workspace
- Projects
- Versions
- Memory
- Copilot
- Developers
- Documentation
- Settings
- Profile menu
- Logout

Only Workspace and Projects route to the current real workspace home. Versions, Memory, Copilot, Developers, Documentation, and Settings show honest product placeholders or point to existing context instead of pretending future routes are complete.

The old authenticated "Marketing Site" button was removed.

## Data Sources

The Workspace uses only real Canopy API data:

- `GET /v1/projects`
- `GET /v1/projects/:projectId/lineage`
- `POST /v1/projects`

Recent Projects are ordered by project update time and latest lineage activity.

Recent Versions are derived from real lineage versions across loaded projects.

Creative Activity is derived from real version history. There is no fake activity feed and no hard-coded Neon Campaign data. Neon Campaign appears naturally when the PostgreSQL seed creates it and the authenticated user owns it.

## States

The Web Workspace supports:

- Loading skeletons
- Empty project state with a real Create Project action
- Error state with retry
- Search/filtering across loaded projects
- Real create-project flow
- Recent projects
- Recent versions
- Activity
- Logout via the existing auth store

## Android Architecture

Android remains React Native + JavaScript + Expo.

Current structure:

- `apps/android/src/screens/workspace/WorkspaceScreen.jsx`
- `apps/android/src/features/workspace/workspaceData.js`
- `apps/android/src/screens/auth/AuthenticatedHomeScreen.jsx`

After session restoration, Android now opens a real mobile Workspace screen instead of a placeholder. It uses the shared `@canopy/api-client` through `apps/android/src/api.js`, stores auth through the Phase 2 SecureStore flow, and loads projects plus lineage-derived recent versions/activity.

Android supports:

- Auth-protected workspace
- Loading state
- Pull-to-refresh
- Empty state
- Error state with retry
- Recent projects
- Recent versions
- Activity
- Real create-project action
- Logout

## Security

The frontend does not filter ownership itself. It requests data through authenticated API endpoints. Backend authorization remains authoritative for projects, versions, assets, memories, and Copilot context.

## Design Decisions

The Workspace uses the established Canopy visual language:

- Near-black background
- Opaque dark surfaces
- Warm white text
- Muted secondary text
- Canopy green actions
- Thin borders
- Compact operational typography

Authenticated navigation is intentionally more tool-like than the public marketing navbar. No glass-heavy overlays or transparent menus are used in the workspace shell.

## Verification

Phase 3 added tests for:

- Web workspace data derivation
- Android workspace data derivation

The implementation was verified with:

- `pnpm build`
- `pnpm test`
- `pnpm verify`
- `git diff --check`

Expo export verifies Web, Android, and iOS JavaScript bundles. No physical Android device/emulator run is claimed.
