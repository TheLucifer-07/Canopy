# AI Evaluations Suite

## Scope (Blueprint §36)

Tests deterministic and offline evaluations for AI capabilities:
1. Grounded Copilot citation honesty (verifying that citations refer to real versions/memories).
2. Semantic diff accuracy (comparing declared delta with observed model descriptions).
3. Memory extraction precision.

By default, tests run against cached/mocked responses; live model evals require explicit `--live-ai` flags and valid API credentials.
