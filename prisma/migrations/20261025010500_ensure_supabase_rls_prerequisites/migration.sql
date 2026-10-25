-- Supabase creates these auth objects itself. Plain local PostgreSQL databases do not.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated'
  ) THEN
    CREATE ROLE authenticated NOLOGIN;
    GRANT USAGE ON SCHEMA public TO authenticated;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
  END IF;
END
$$;

CREATE SCHEMA IF NOT EXISTS auth;

DO $$
BEGIN
  IF to_regprocedure('auth.jwt()') IS NULL THEN
    EXECUTE $function$
      CREATE FUNCTION auth.jwt() RETURNS jsonb
      LANGUAGE sql STABLE
      AS 'SELECT COALESCE(NULLIF(current_setting(''request.jwt.claims'', true), ''''), ''{}'')::jsonb'
    $function$;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA auth TO authenticated;
