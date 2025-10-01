-- Ensure required Postgres extensions are available
-- Created: 2025-09-30

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()
