-- Fix missing link_user_to_location_by_passphrase function
-- This function allows users to link themselves to a location using a valid passphrase

CREATE OR REPLACE FUNCTION public.link_user_to_location_by_passphrase(p_passphrase TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_location_id BIGINT;
  v_user_id UUID;
  v_existing_link INTEGER;
BEGIN
  -- Get the current user ID
  SELECT auth.uid() INTO v_user_id;
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Find location ID for the given passphrase
  SELECT location_id 
  INTO v_location_id
  FROM public.passphrases
  WHERE passphrase = p_passphrase 
    AND is_active = true 
    AND (expires_at IS NULL OR expires_at > NOW());

  -- Check if passphrase is valid
  IF v_location_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if user is already linked to this location
  SELECT COUNT(*)
  INTO v_existing_link
  FROM public.user_locations
  WHERE user_id = v_user_id AND location_id = v_location_id;

  -- If not already linked, create the link
  IF v_existing_link = 0 THEN
    INSERT INTO public.user_locations (user_id, location_id, created_at)
    VALUES (v_user_id, v_location_id, NOW());
  END IF;

  RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.link_user_to_location_by_passphrase(TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.link_user_to_location_by_passphrase(TEXT) IS 'Links a user to a location using a valid passphrase';