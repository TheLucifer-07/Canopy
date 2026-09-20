-- 0000_init_pgvector.sql
-- Forward-only migration to initialize pgvector and UUID extensions

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext;
