# Phase 6: Creative / Assets Specification & Architecture

## Overview
Phase 6 establishes **Assets** as a first-class, high-fidelity creative entity in Canopy. It provides the visual and operational bridge between raw creative media files and historical version lineage.

---

## 1. Domain Model: Asset vs. Version
Canopy strictly separates raw creative resources (Assets) from historical evolution steps (Versions):

```
Project
├── Assets
│   ├── Asset A (image/png, SHA-256: 4f8a...)
│   └── Asset B (image/webp, SHA-256: 9b2c...)
└── Versions
    ├── V1 → Asset A (Action: import)
    ├── V2 → Asset A (Action: adjust brightness +12)
    └── V3 → Asset B (Action: ai_infill)
```

- **Asset**: Immutable creative binary stored by content hash (`assets/` key), tracked in the `assets` table and granted to projects via `project_assets`.
- **Version**: A creative node in the project DAG capturing provenance (actor type, model/human, operations, deltas, and semantic summaries) pointing to an asset.

---

## 2. API Endpoints & Contracts

### Asset Operations
1. `POST /v1/projects/:projectId/assets`
   - **Auth**: Bearer token (`versions:write`)
   - **Payload**: `multipart/form-data` with `file` (PNG, JPEG, WebP, max 50MB)
   - **Behavior**: Verifies project ownership, validates magic bytes, computes SHA-256 hash, stores file in storage root, inserts into `assets`, and links to `project_assets`.
2. `GET /v1/projects/:projectId/assets`
   - **Auth**: Bearer token (`versions:read`)
   - **Behavior**: Retrieves all project assets ordered by `granted_at DESC`, enriched with `related_versions` and short-lived signed URLs for rendering.
3. `GET /v1/assets/:assetId`
   - **Auth**: Bearer token (`versions:read`)
   - **Behavior**: Retrieves asset details and associated project version references with owner-scoped authorization.
4. `GET /v1/assets/:assetId/url`
   - **Auth**: Bearer token (`versions:read`)
   - **Behavior**: Issues signed preview URL with temporary access token.
5. `GET /v1/assets/:assetId/content`
   - **Auth**: Bearer token (`versions:read` or query token)
   - **Behavior**: Streams raw binary file bytes with corresponding `Content-Type` header.

---

## 3. Web UI Surfaces

### Asset Browser (`AssetBrowser.jsx`)
- Integrated into the **Assets** tab of `ProjectHome.jsx`.
- Provides Grid and List visual layouts.
- Fast client-side filtering by name, content hash, and MIME type (PNG, JPEG, WebP).
- Cards display thumbnail, MIME badge, formatted file size, and interactive badges for related project versions.
- Contextual empty state with direct "Upload Asset" call-to-action.

### Asset Viewer (`AssetViewer.jsx`)
- Full-screen creative canvas preview with neutral dark backdrop.
- Detailed metadata inspector: Asset UUID, Content Hash (SHA-256), MIME type, byte size, width/height (if present), and creation timestamp.
- **Related Versions**: Lists each version referencing this asset with sequence number, action type, and timestamps. Clicking "Open" jumps directly to that version in the Version Workspace.
- **Download Asset**: Initiates genuine binary download preserving safe file extension.
- **Open in Workbench**: Enters the Creative Workbench with the current asset context.

### Asset Upload (`AssetUploadModal.jsx`)
- Drag-and-drop or file picker interface supporting PNG, JPEG, and WebP up to 50MB.
- Immediate local thumbnail preview before submission.
- Real-time mutation calling `api.uploadAsset(projectId, file)` with server confirmation.
- Automatic cache invalidation for `project-assets`, `assets`, and `lineage`.

---

## 4. Import, Export, and Editor Integration
- **Import**: Standard creative file upload (`POST /projects/:projectId/assets`) or root version import (`POST /projects/:projectId/versions/import`).
- **Export / Download**: Real file download from the signed asset stream URL (`GET /assets/:assetId/content`).
- **Editor Integration**: Opens existing `Workspace.jsx` passing `initialAssetId` and `initialVersionId`, ensuring seamless continuity.

---

## 5. Security & Ownership
- All asset access (`GET /projects/:projectId/assets`, `GET /assets/:assetId`, `GET /assets/:assetId/content`, `POST /projects/:projectId/assets`) enforces project ownership and prevents unauthorized asset enumeration across users.
- Machine tokens (`cnp_pat_*`) with `versions:read` and `versions:write` scopes are fully authorized.

---

## 6. Known Limitations
- Deletion of assets is restricted when versions in history actively reference the asset, preventing broken lineage.
- Video and vector creative assets (SVG, MP4) are planned for future fidelity tier upgrades; currently PNG, JPEG, and WebP are natively supported.
