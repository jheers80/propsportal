-- Ensure pgcrypto extension is installed in the public schema
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- Grant USAGE on public schema to all roles that might be used by Supabase
GRANT USAGE ON SCHEMA public TO PUBLIC;

-- Grant EXECUTE on digest function to all roles
GRANT EXECUTE ON FUNCTION public.digest(bytea, text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.digest(text, text) TO PUBLIC;

-- Grant USAGE on pgcrypto extension to all roles
GRANT USAGE ON FOREIGN DATA WRAPPER pgcrypto TO PUBLIC;

-- If you know your Supabase service role, you can grant specifically:
-- GRANT USAGE ON SCHEMA public TO dashboard_user;
-- GRANT EXECUTE ON FUNCTION public.digest(bytea, text) TO dashboard_user;
-- GRANT EXECUTE ON FUNCTION public.digest(text, text) TO dashboard_user;

-- Optionally, re-create the function to ensure search_path is correct
DROP FUNCTION IF EXISTS public.quick_login_start_session(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.quick_login_start_session(p_passphrase TEXT, p_role TEXT DEFAULT 'staff')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_location_id BIGINT;
BEGIN
  SELECT location_id INTO v_location_id
  FROM public.passphrases
  WHERE passphrase = p_passphrase
  LIMIT 1;

  IF v_location_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Insert session valid for 1 hour
  INSERT INTO public.quick_access_sessions (location_id, passphrase_hash, expires_at, role)
  VALUES (
    v_location_id,
    encode(digest(convert_to(p_passphrase::text, 'UTF8'), 'sha256'::text), 'hex'),
    now() + interval '1 hour',
    p_role
  );

  RETURN TRUE;
END;
$$;
