# Phase 12 — 🔔 User System (Notifications, Activity Feed, Saved Items)

## 1. Overview

Phase 12 implements the user-centric product layer in Canopy, exposing:
- **Notifications**: Real, authoritative user alerts triggered by project, version, asset, memory, and developer actions.
- **Activity Feed**: Comprehensive chronological audit trail across projects, versions, and asset modifications.
- **Saved Items**: Personal bookmarks for rapid access to creative projects, versions, assets, and confirmed memories.

All data is authenticated and persisted directly via the Fastify API into Supabase PostgreSQL.

---

## 2. Architecture & Data Model

```
Web / Android
      ↓
Fastify API (/v1/me/...)
      ↓
Core Operations & PostgreSQL Repository
      ↓
Supabase PostgreSQL (Authoritative Storage)
```

### Schema Changes (`0007_user_system.sql`)

#### `notifications` Table
- `id` (uuid, primary key)
- `user_id` (uuid, references `users(id)` ON DELETE CASCADE)
- `type` (text: `project_activity`, `version_activity`, `asset_activity`, `memory_activity`, `ai_activity`, `developer_activity`)
- `title` (text)
- `message` (text, optional)
- `entity_type` (text, optional)
- `entity_id` (uuid, optional)
- `metadata` (jsonb)
- `read_at` (timestamptz, null if unread)
- `created_at` (timestamptz)

#### `saved_items` Table
- `id` (uuid, primary key)
- `user_id` (uuid, references `users(id)` ON DELETE CASCADE)
- `entity_type` (text: `project`, `version`, `asset`, `memory`, `diff`)
- `entity_id` (uuid)
- `metadata` (jsonb)
- `created_at` (timestamptz)
- `CONSTRAINT uq_user_saved_entity UNIQUE (user_id, entity_type, entity_id)`

---

## 3. API Endpoints

### Notifications
- `GET /v1/me/notifications` — List notifications for the authenticated user (supports `?limit=N` and `?unread=true`).
- `GET /v1/me/notifications/unread-count` — Retrieve exact unread notification count.
- `PATCH /v1/me/notifications/:notificationId/read` — Mark a notification as read.
- `POST /v1/me/notifications/mark-all-read` — Mark all unread notifications as read.

### Activity Feed
- `GET /v1/me/activity` — Chronological timeline of version creations, asset imports, and project updates (`?limit=N`).

### Saved Items
- `GET /v1/me/saved-items` — List saved bookmarks (`?limit=N&entity_type=...`).
- `POST /v1/me/saved-items` — Bookmark an authorized entity.
- `DELETE /v1/me/saved-items/:savedItemId` — Remove bookmark by saved item ID or entity ID.

---

## 4. User Ownership & Security Invariants

1. **Strict Server-Side Scoping**: All queries use `authContext.userId` derived from the verified JWT access token.
2. **Cross-Tenant Isolation**: User A cannot view, mark as read, or delete User B's notifications or saved items.
3. **Entity Authorization**: When saving an entity, the backend verifies that the entity belongs to or is accessible by the requesting user.
4. **Zero Client Trust**: Request body `userId` fields are discarded in favor of authenticated tokens.

---

## 5. Web & Android Product Surfaces

### Web (`apps/web`)
- **Top Bar Bell Icon**: Live unread badge count, dropdown popover with read/unread filtering, mark read, and mark all read actions.
- **Activity Feed**: Date-grouped audit stream (Today, Yesterday, Earlier) with direct navigation links.
- **Saved Items**: Filterable grid with entity type badges, metadata previews, and one-click remove actions.
- **Save Buttons**: Contextual bookmark toggle buttons embedded throughout the product.

### Android (`apps/android`)
- Native notifications, saved items, and live activity sections integrated in `WorkspaceScreen.jsx`.

---

## 6. Verification Results

- **`pnpm test`**: 100% pass across all unit and monorepo packages.
- **`pnpm build`**: Clean production bundles for Web and mobile packages.
- **`pnpm verify`**: Foundation invariants and zero TypeScript violations confirmed.
- **`git diff --check`**: Clean formatting and zero whitespace errors.
