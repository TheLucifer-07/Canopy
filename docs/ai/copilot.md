# Canopy Copilot

Phase 4 Copilot is a read-oriented, project-scoped question-answering surface.
It plans against a closed tool set, retrieves authorized lineage and active
Creative Memory, assembles bounded tagged context, asks Groq for a grounded
answer, and mechanically removes citations that were not present in context.

## Request flow

`POST /v1/projects/:projectId/copilot/messages` accepts:

```json
{"conversation_id":"optional-uuid","question":"What changed between V3 and V8?"}
```

The response is an SSE stream with `plan`, `token`, `citations`, `done`, and
`error` events. Conversations and assistant citations are stored under the
authorized project and user.

## Closed tools

The planner may use only `get_version`, `get_path`, `get_subtree`,
`get_children`, `get_lineage_overview`, `get_diff`, `search_versions`,
`search_memory`, and `list_ai_generations`. Planner rounds are capped at four.
Version references resolve through the authorized project lineage; unresolved
references are never guessed.

## Retrieval and security

PostgreSQL remains authoritative. Structured lineage questions use lineage
retrieval, while semantic content uses project-scoped `copilot_embeddings`
backed by pgvector. Embedding rows carry source type/id, model, schema
version, content hash, and project ownership. Active memories only are
eligible for Copilot retrieval. Keyword retrieval remains available when
embeddings are unavailable.

Retrieved records are rendered with explicit `VERSION:`, `MEMORY:`, or `DIFF:`
IDs and a 12,000-character context budget. Project content is untrusted data,
never instructions. Copilot has no Core mutation port and cannot create
versions, edit assets, change lineage, or write memory.

## Provider, budget, and limits

Groq performs Copilot reasoning and grounded answer generation. Gemini remains
the embedding and visual provider. AI requests reuse Phase 3 logging and the
per-project daily budget guard. Copilot is limited to 20 requests per minute
per authenticated user. Provider, database, malformed-plan, budget, and
disconnect failures emit controlled errors without fabricated answers.

## Conversations

- `GET /v1/projects/:projectId/copilot/conversations`
- `GET /v1/copilot/conversations/:conversationId`

Both routes enforce project ownership and conversation user ownership.
