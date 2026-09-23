# Phase 4 Projects

Phase 4 adds the authenticated Projects surface for Web and Android while preserving the existing workspace and workbench behavior.

## Implemented

- Web `/app/projects` now lists real authenticated projects from the Canopy API with search, sort, creation, and an import availability note.
- Web `/app/projects/:projectId` is now the project home with project metadata, latest version summary, real lineage-derived activity, and project settings.
- The existing web editor/workbench remains available at `/app/projects/:projectId/workbench`.
- Project settings support rename, creative goal update, and soft archive through owner-scoped API endpoints.
- Android React Native now supports project creation with creative goal, opening project details, Home/Activity/Settings tabs, project update, and archive.
- Shared `@canopy/api-client` exposes `updateProject` and `archiveProject` so Web and Android use the same contract.

## API Contract

- `PATCH /v1/projects/:projectId`
  - Authenticated with `versions:write`.
  - Accepts at least one of `name` or `creative_goal`.
  - Returns the updated project.
- `DELETE /v1/projects/:projectId`
  - Authenticated with `versions:write`.
  - Soft archives the project by setting `archived_at`.
  - Returns `204`.

Project reads and writes remain scoped by `owner_id`; archived projects are excluded from active project lists and project retrieval.

## Scope Boundaries

- Phase 4 does not implement a standalone asset browser.
- Image import remains in the existing project workbench because the current API import flow requires an existing project and uploaded asset.
- Versions, Memory, Copilot, and semantic diff remain existing workbench capabilities, not new global Phase 4 surfaces.
- Android remains React Native and JavaScript only.
