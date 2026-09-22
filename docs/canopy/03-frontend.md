# 03 — Frontend Architecture & Component Inventory

The web application (`apps/web`) provides an interactive creative workspace interface for managing projects, creating edits, visualizing version lineage, analyzing semantic diffs, and interacting with Canopy Copilot.

---

## Technical Stack

- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS + Vanilla CSS Tokens
- **State Management:** Zustand (`useEditorStore`) for client editor working state
- **Data Fetching & Caching:** TanStack React Query
- **Graph Lineage:** React Flow + Dagre layout
- **Image Editing:** Fabric.js canvas renderer

---

## Component Architecture

```text
App
 ├── AuthScreen (Sign in / Sign up)
 └── WorkspaceFrame
      ├── ProjectHome (List & Create Projects)
      └── ProjectWorkspace
           ├── TopBar (Header, Sign out, Save Version action)
           ├── VersionExplorer (Vertical list of project versions)
           ├── CanvasStage (Fabric.js image editing canvas & upload dropzone)
           └── VersionDetail (Tabs for Provenance, Lineage, Diff Compare, Memory, Copilot Chat)
```

---

## Key User Interactions

1. **Import Asset:** User uploads image -> `api.uploadAsset()` -> `api.importVersion()` -> V1 root node appears in lineage.
2. **Human Edit:** User adjusts warmth/brightness/crop on canvas -> Zustand records operation -> User clicks "Save Version" -> `api.commitVersion()` -> V2 created.
3. **Continue From Version:** User selects an earlier version in lineage -> clicks "Continue from here" -> working state sets base version ID.
4. **Merge Directions:** User clicks "Merge Tips" -> `api.mergeVersions()` -> Multi-parent version created with LCA resolution.
5. **Compare Versions:** User selects two versions -> clicks "Compare" -> `api.createSemanticDiff()` -> 3 evidence sources reconciled in compare drawer.
6. **Copilot Query:** User types question -> `api.streamCopilot()` -> SSE stream yields grounded tokens and citation links.
