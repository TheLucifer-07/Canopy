# Database Seeds

## Overview

Contains seed fixtures and demo project data for local development, automated testing, and fallback demonstrations.
Seeds populate deterministic creative projects, version DAGs, actions, provenance records, and creative memories through the same PostgreSQL-backed repository path used by the API.

## Demo Seed

Run migrations first, then seed:

```bash
PGPASSWORD=canopy_dev_pass PGHOST=127.0.0.1 PGPORT=5433 PGDATABASE=canopy PGUSER=canopy pnpm db:migrate
PGPASSWORD=canopy_dev_pass PGHOST=127.0.0.1 PGPORT=5433 PGDATABASE=canopy PGUSER=canopy pnpm db:seed
```

The seed creates or updates this local demo account:

```text
email: demo@canopy.local
password: canopy-demo-pass
```

It creates the `Neon Campaign` project with an import, human adjustment, model-generated branch, text branch, manual merge, and an active Creative Memory.
