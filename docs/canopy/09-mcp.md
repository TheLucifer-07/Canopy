# 09 — Model Context Protocol (MCP) Service

The Canopy MCP service (`services/mcp`) provides AI assistants (Cursor, Antigravity, Claude Desktop) with standardized read tools to inspect project state, lineage DAGs, semantic diffs, and creative memories.

---

## Technical Architecture

- **SDK:** Official `@modelcontextprotocol/sdk`
- **Transport:** Stdio (`StdioServerTransport`)
- **Backend Communication:** Consumes Canopy Fastify REST API (`/v1`) using `CanopyApiClient` with machine tokens (`cnp_pat_*`). Does NOT bypass API logic or directly touch PostgreSQL.

---

## Exposed Read Tools

1. `canopy_list_projects`: List projects visible to token.
2. `canopy_get_project`: Fetch project metadata and lineage summary.
3. `canopy_get_lineage`: Get authorized lineage graph with parent edges and tips.
4. `canopy_get_version`: Get single version detail, actions, and asset URL.
5. `canopy_compare_versions`: Invoke Semantic Creative Diff endpoint.
6. `canopy_search_history`: Vector/text search across project versions and memories.
7. `canopy_get_memory`: List active Creative Memories.

---

## Configuration & Protocol Specs

Documented in [`docs/mcp/PROTOCOL.md`](file:///Users/animireddyhemachandu/Desktop/Canopy/docs/mcp/PROTOCOL.md).
Tested via stdio transport client in [`services/mcp/tests/mcp.test.js`](file:///Users/animireddyhemachandu/Desktop/Canopy/services/mcp/tests/mcp.test.js).
