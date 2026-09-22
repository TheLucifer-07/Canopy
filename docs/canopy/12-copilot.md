# 12 — Canopy Copilot & SSE Streaming

Canopy Copilot provides grounded, cited question answering over authorized project history and Creative Memories.

---

## Architecture & Tool Planner

- **Planner Model:** Groq (`llama-3.3-70b-versatile`).
- **Closed Tools Set (`COPILOT_TOOLS`):** `get_version`, `get_path`, `get_subtree`, `get_children`, `get_lineage_overview`, `get_diff`, `search_versions`, `search_memory`, `list_ai_generations`.
- **Rounds Limit:** Capped at 4 planner rounds.
- **Context Budget:** Max 12,000 characters of assembled context.

---

## Citation Validation & Grounding

- Every generated citation is mechanically checked against retrieved context IDs (`validateCitations`).
- Unreferenced or hallucinated version/memory IDs are automatically stripped from the response text and citation list.
- Responses set `grounded: true` only when valid citations exist in retrieved context.

---

## Server-Sent Events (SSE) Streaming

Endpoint: `POST /v1/projects/:projectId/copilot/messages`

### SSE Event Pipeline:
1. `event: plan` — Tools planned by Copilot.
2. `event: token` — Delta text tokens streamed in real time.
3. `event: citations` — Verified citation objects.
4. `event: done` — Completion signal with `conversation_id`.
5. `event: error` — Error payload on failure.
