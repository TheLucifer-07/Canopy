# Canopy Object Storage

## Architecture (Blueprint §26)

Canopy separates metadata and lineage in PostgreSQL from raw binary creative assets.

- **Content-Addressed Storage:** Assets are stored by their SHA-256 hash.
- **Key Layout:**
  ```
  assets/{hash[0:2]}/{hash[2:4]}/{sha256}.{ext}
  thumbs/{hash[0:2]}/{hash[2:4]}/{sha256}_512.webp
  previews/{project_id}/{working_state_id}.webp
  ```
- **Access Control:** Assets are never public. Reads are served via signed URLs verified through `project_assets` grants.
- **Phase 1 Runtime:** Supabase Storage private bucket (`SUPABASE_STORAGE_BUCKET`, default `canopy-assets`).
- **Local Note:** The API storage repository targets Supabase Storage, not MinIO.
