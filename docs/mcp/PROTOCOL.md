# Canopy MCP Protocol

## SDK And Transport

- SDK package: `@modelcontextprotocol/sdk`
- Installed version verified from `node_modules`: `1.30.0`
- Protocol family: MCP draft implementation supported by SDK `1.30.0`
- Transport: stdio
- Server command: `pnpm --filter @canopy/mcp start`
- Metadata: `name=canopy-mcp`, `version=0.1.0`

MCP Inspector was not installed in this environment. Verification uses the
official SDK `Client` with `StdioClientTransport` in `services/mcp/tests/mcp.test.js`.

## Authentication

MCP authenticates to the Canopy API with a scoped machine token:

```bash
CANOPY_API_URL=http://localhost:3000/v1
CANOPY_MCP_TOKEN=cnp_pat_...
```

Tokens are created through `POST /v1/me/tokens`, shown once, stored hashed in
`api_tokens`, and revoked through `DELETE /v1/me/tokens/:tokenId`.

Default read token scopes:

- `projects:read`
- `versions:read`
- `memory:read`

Write scopes exist for future surfaces but are not used by Phase 5 MCP read
tools.

## Tools

- `canopy_list_projects`: requires `projects:read`
- `canopy_get_project`: requires `projects:read`
- `canopy_list_versions`: requires `versions:read`
- `canopy_get_version`: requires `versions:read`
- `canopy_get_lineage`: requires `versions:read`
- `canopy_get_asset`: requires `assets:read` / `versions:read`
- `canopy_compare_versions`: requires `versions:read`
- `canopy_search_history`: requires `versions:read`
- `canopy_get_memory`: requires `memory:read`

All tools call the Canopy REST API. MCP does not import Core, repositories,
PostgreSQL, storage, Gemini, or Groq.

## Rate Limits

The MCP service applies per-token in-process limits:

- Default tools: 60 requests/minute/token
- `canopy_compare_versions`: 10 requests/minute/token

`canopy_compare_versions` may invoke Semantic Diff and visual AI, so latency can
be several seconds.

## Error Model

Tools return structured JSON with `isError=true` on failure:

```json
{
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Invalid or expired access token."
  }
}
```

Stack traces, SQL, provider payloads, API keys, and raw tokens are never returned.

## Example Tool Call

```json
{
  "name": "canopy_get_lineage",
  "arguments": {
    "project_id": "00000000-0000-4000-8000-000000000010"
  }
}
```

## Verification

Run:

```bash
pnpm --filter @canopy/mcp test
```

The test starts an official MCP SDK client over stdio, discovers tools, and
confirms tool calls are forwarded to a Canopy-compatible HTTP API with the PAT
Bearer token.
