# 16 — Turborepo, pnpm & Build System

Canopy uses `pnpm` workspaces for package management and `Turborepo` for build pipeline orchestration.

---

## Workspace Configuration (`pnpm-workspace.yaml`)

```yaml
packages:
  - 'apps/*'
  - 'services/*'
  - 'packages/*'
```

---

## Pipeline Configuration (`turbo.json`)

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "build/**"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

---

## Build Commands

- `pnpm install` — Installs dependencies across all apps and packages via workspace symlinks.
- `pnpm dev` — Parallel development server execution via Turbo (`pnpm dev:web` + `pnpm dev:api`).
- `pnpm build` — Production bundle build across workspace packages.
