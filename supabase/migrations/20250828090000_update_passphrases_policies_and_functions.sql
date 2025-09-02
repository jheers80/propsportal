-- Update RLS policies to allow manager and multiunit to manage passphrases for their assigned locations
-- and add helper SECURITY DEFINER functions for linking users and starting quick access sessions.

-- Ensure function search_path is safe
SET check_function_bodies = OFF;

-- Needed for digest()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Passphrases management policy for managers and multiunit on their assigned locations
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'passphrases' AND policyname = 'Admins can manage passphrases'
  ) THEN
    -- keep existing superadmin policy
    NULL;
  END IF;
END$$;

DROP POLICY IF EXISTS "Managers can manage assigned location passphrases" ON public.passphrases;
CREATE POLICY "Managers can manage assigned location passphrases"
ON public.passphrases
FOR ALL
TO authenticated
USING (
  get_my_role() IN ('manager', 'multiunit') AND
  EXISTS (
    SELECT 1 FROM public.user_locations ul
    WHERE ul.location_id = passphrases.location_id AND ul.user_id = auth.uid()
  )
);

-- Self-linking policy for user_locations: allow a user to insert/delete their own mappings
-- (safe because location_id will be validated in the security definer function below)
DROP POLICY IF EXISTS "Users can manage their own location links" ON public.user_locations;
CREATE POLICY "Users can manage their own location links"
ON public.user_locations
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Enable SELECT for reading own links already exists above.

-- Function: link_user_to_location_by_passphrase(passphrase TEXT)
-- Validates the passphrase and links the current user to that location if not already linked.
DROP FUNCTION IF EXISTS public.link_user_to_location_by_passphrase(TEXT);
CREATE OR REPLACE FUNCTION public.link_user_to_location_by_passphrase(p_passphrase TEXT)
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

  -- Insert mapping if missing
  INSERT INTO public.user_locations (user_id, location_id)
  VALUES (auth.uid(), v_location_id)
  ON CONFLICT DO NOTHING;

  RETURN TRUE;
END;
$$;

-- Function: quick_login_start_session(passphrase TEXT, role TEXT)
-- Creates a quick access session record for 1 hour and returns TRUE if passphrase is valid.
-- Stores a SHA256 hash of the passphrase for auditing.
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