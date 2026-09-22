# 14 — Configuration & Environment Variables Reference

Canopy config is managed via [`packages/config`](file:///Users/animireddyhemachandu/Desktop/Canopy/packages/config) and `.env`.

---

## Environment Variables Inventory

| Variable | Purpose | Consumed By | Required | Secret | Default / Example |
|---|---|---|---|---|---|
| `VITE_API_URL` | Fastify REST API URL for browser clients | `apps/web` | Yes | No | `http://localhost:3000/v1` |
| `DATABASE_URL` | PostgreSQL connection string | `services/api` | Yes | Yes | `postgresql://postgres:postgres@localhost:5432/canopy` |
| `AUTH_JWT_SECRET` | Secret key for signing JWT access tokens | `services/api` | Yes | Yes | Secret string |
| `STORAGE_PATH` | Storage directory for creative asset bytes | `services/api` | No | No | `./storage` |
| `GEMINI_API_KEY` | API key for Google Gemini (vision, generation, embeddings) | `services/api` | No | Yes | Secret API Key |
| `GROQ_API_KEY` | API key for Groq (path summaries, Copilot planning) | `services/api` | No | Yes | Secret API Key |
| `AI_DAILY_COST_LIMIT` | Per-project daily AI cost budget guard limit | `services/api` | No | No | `10.00` |
| `AI_DAILY_TOKEN_LIMIT` | Per-project daily AI token budget guard limit | `services/api` | No | No | `500000` |
| `CANOPY_API_URL` | API URL for MCP client | `services/mcp` | Yes | No | `http://localhost:3000/v1` |
| `CANOPY_MCP_TOKEN` | Machine API token (`cnp_pat_*`) for MCP client | `services/mcp` | Yes | Yes | Machine PAT Token |
