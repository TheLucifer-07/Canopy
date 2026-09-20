# Canopy Android Client (Architectural Reservation)

## Architectural Position

In accordance with Section 5.2 and Section 23 of the **Canopy Implementation Blueprint**, Canopy Android is a first-class mobile client designed to consume the identical REST API (`/v1`) as Canopy Web.

## Target Stack & Capabilities

- **Language & UI**: Kotlin, Jetpack Compose, Material 3.
- **Scope (P2)**: A 3-screen read-only client:
  1. Project List / Workspace Overview
  2. Lineage DAG Viewer
  3. Version Inspector (with detailed Provenance, declared deltas, and Copilot citations)
- **Future Capabilities**: Camera capture to version commit, lightweight adjustments, offline mutation queue.

## Current Implementation Phase (Phase 1 Core)

Android remains a later/P2 implementation. Phase 1 keeps this directory as the client boundary while the shared `/v1` API and Core lifecycle are implemented in the Fastify service.
