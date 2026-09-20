# Canopy MCP Protocol Documentation

## Architectural Position (Blueprint §21)

The Canopy MCP server provides an interface into Canopy for AI agents.
It holds **no domain logic and no direct database access**.
All operations execute via the Canopy REST API (`/v1`) using scoped personal access tokens (`cnp_pat_...`).

## Pinned SDK & Protocol Version

- **SDK**: `@modelcontextprotocol/sdk` (Pinned: ^1.6.0)
- **Protocol Semantics**: Stateless core with scoped capabilities.
- **Client**: Connects via `@canopy/api-client` to Canopy API.

## Tools Overview (Planned for Phase 1/2)

### Read Tools (P1)
- `canopy_list_projects`
- `canopy_get_project`
- `canopy_get_lineage`
- `canopy_get_version`
- `canopy_compare_versions`
- `canopy_search_history`
- `canopy_get_memory`

### Write Tools (P2 - machines propose, humans commit)
- `canopy_create_memory` (creates `status='proposed'`)
- `canopy_continue_from` (creates working state, not version)
