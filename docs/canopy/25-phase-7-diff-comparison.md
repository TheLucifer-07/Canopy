# Phase 7: Diff / Comparison Specification & Architecture

## Overview
Phase 7 delivers a comprehensive, multi-stream **Version Diff & Comparison Experience** for Canopy. It enables creators, teams, and AI collaborators to understand what changed between two versions, why it changed, the precise evidence supporting that explanation, and the historical change path between them.

---

## 1. Multi-Stream Evidence Model
Canopy's Semantic Diff reconciles three independent, authoritative evidence streams:

```
                  ┌─────────────────────────────────────┐
                  │          Semantic Diff              │
                  │   "What changed & why did it?"      │
                  └──────────────────┬──────────────────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           ▼                         ▼                         ▼
┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
│  1. Declared Delta  │   │   2. Path Summary   │   │  3. Observed Delta  │
│ Tool operations &   │   │ Lineage evolution   │   │ Visual facets via   │
│ creator intent      │   │ steps via Groq      │   │ Gemini Vision       │
└─────────────────────┘   └─────────────────────┘   └─────────────────────┘
```

1. **Declared Delta**: Deterministic, structured parameters from the creator's actions (e.g. brightness, crop, inpainting prompts, filter values).
2. **Path Summary**: Synthesized creative journey along the DAG path between versions powered by Groq.
3. **Observed Delta**: Concrete visual observations across lighting, composition, style, and foreground/background elements powered by Gemini Vision.

---

## 2. Visual Diff Surface
- **Side-by-Side Mode**: Side-by-side comparative inspection of rendered high-fidelity assets with metadata and sequence tags (`V1 (Base)` vs `V2 (Target)`).
- **Split Slider Mode**: Interactive horizontal swipe overlay enabling micro-visual alignment and pixel-level comparison.

---

## 3. Evidence Explorer & Confidence
- **Evidence Panel (`EvidencePanel.jsx`)**:
  - Displays each evidence stream with clear source attribution badges (`[Declared Code]`, `[Groq Path Summary]`, `[Gemini Vision]`).
  - **Confidence Assessment**: Displays qualitative level and quantitative metric (e.g. `95%`), reflecting agreement between declared actions and observed image features.
  - **Discrepancy Highlighting**: Explicitly flags any conflicts where declared operations and observed visual characteristics diverge.

---

## 4. Change History DAG Path
- **Component (`ChangeHistory.jsx`)**:
  - Computes and displays the chronological lineage evolution trail connecting Version A → Version B.

---

## 5. API Endpoints & Contracts
- `POST /v1/diffs`
  - **Auth**: Bearer token (`versions:read`)
  - **Body**: `{ from_version_id, to_version_id, force_refresh }`
  - **Validations**:
    - Project ownership validation
    - Distinct version check (`from_version_id !== to_version_id`)
    - Same-project version check (`from.project_id === to.project_id`)
  - **Caching**: SHA-256 hash of `from_id`, `to_id`, facet schema version, and diff model IDs. Cached results avoid redundant AI calls.
  - **Graceful Degradation**: If AI providers (Gemini or Groq) are unreachable or budget is exceeded, falls back smoothly to `declared_only` or `declared_and_path` without crashing.

---

## 6. Entry Points
1. **Version History (`VersionHistory.jsx`)**: "Compare" button on every version card.
2. **Workbench (`Workspace.jsx`)**: Right sidebar "Compare Versions" launcher.
3. **Asset Viewer (`AssetViewer.jsx`)**: "Compare" action on related project versions.
4. **Lineage Graph (`LineageGraph.jsx`)**: Instant selection and comparison context synchronization.

---

## 7. Known Limitations
- Textual declared diff is available for all operations; observed visual analysis requires PNG, JPEG, or WebP creative formats.
- High-concurrency comparisons are rate-guarded by daily project token and budget configurations.
