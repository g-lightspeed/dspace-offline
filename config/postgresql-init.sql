-- Run as the PostgreSQL administrator against the fresh local dspace database.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
ALTER DATABASE dspace SET search_path TO "$user",public,extensions;
GRANT USAGE ON SCHEMA extensions TO dspace;
