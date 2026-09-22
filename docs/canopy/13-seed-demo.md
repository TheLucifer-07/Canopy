# 13 — Deterministic Demo Seed Data ("Neon Campaign")

The deterministic demo seed data script (`database/seeds/seed.js`) populates PostgreSQL through the same repository path used by the API.

```bash
PGPASSWORD=canopy_dev_pass PGHOST=127.0.0.1 PGPORT=5433 PGDATABASE=canopy PGUSER=canopy pnpm db:migrate
PGPASSWORD=canopy_dev_pass PGHOST=127.0.0.1 PGPORT=5433 PGDATABASE=canopy PGUSER=canopy pnpm db:seed
```

Demo login:

```text
email: demo@canopy.local
password: canopy-demo-pass
```

---

## Seed Lineage Graph Structure

```text
V1 (Root Import: photo.png)
 └── V2 (Human Adjust: brightness +18)
      ├── V3 (AI Edit: Gemini dark neon grid background) ──┐
      └── V4 (Human Commit: Text overlay "CANOPY NEON")      │
           └───────────────► V5 (Manual Merge Node) ◄────────┘
```

---

## Seed Memory & Copilot Data

- **Active Memory:** `"Client rejects blue-dominant backgrounds because they read as corporate."`
- **Copilot Citation Evaluation:** Exercises grounded answering for question *"Why did we change the background?"* with citation to V3 and the active memory.
