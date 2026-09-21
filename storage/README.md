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
- **Runtime:** API-owned local/object storage behind the repository boundary. The default local implementation writes under `STORAGE_PATH` using the content-addressed key layout.
- **Access Control:** The API verifies the authenticated user's project grant before returning bytes or a content URL. An object-storage adapter can replace the local implementation without changing Core operations.
