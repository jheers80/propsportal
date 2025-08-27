-- Enable RLS for all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passphrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Function to get user's role

DROP FUNCTION IF EXISTS get_my_role() CASCADE;
CREATE  FUNCTION get_my_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles RLS
Drop POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (get_my_role() IN ('superadmin', 'manager'));
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE USING (get_my_role() IN ('superadmin', 'manager'));

-- Locations RLS
DROP POLICY IF EXISTS "Authenticated users can view all locations" ON public.locations;
CREATE POLICY "Authenticated users can view all locations" ON public.locations
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage locations" ON public.locations;
CREATE POLICY "Admins can manage locations" ON public.locations
  FOR ALL USING (get_my_role() IN ('superadmin'));

-- User Locations RLS
DROP POLICY IF EXISTS "Users can view their own location assignments" ON public.user_locations;
CREATE POLICY "Users can view their own location assignments" ON public.user_locations
  FOR SELECT USING (auth.uid() = user_id);

Drop POLICY IF EXISTS "Admins can manage user location assignments" ON public.user_locations;
CREATE POLICY "Admins can manage user location assignments" ON public.user_locations
  FOR ALL USING (get_my_role() IN ('superadmin'));

-- Passphrases RLS
Drop POLICY IF EXISTS "Users can view passphrases for their assigned locations" ON public.passphrases;
CREATE POLICY "Users can view passphrases for their assigned locations" ON public.passphrases
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.user_locations
      WHERE user_locations.location_id = passphrases.location_id
        AND user_locations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage passphrases" ON public.passphrases;
CREATE POLICY "Admins can manage passphrases" ON public.passphrases
  FOR ALL USING (get_my_role() IN ('superadmin'));

-- Permissions and Role Permissions RLS
DROP POLICY IF EXISTS "Authenticated users can view permissions" ON public.permissions;
CREATE POLICY "Authenticated users can view permissions" ON public.permissions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Superadmins can manage permissions" ON public.permissions;
CREATE POLICY "Superadmins can manage permissions" ON public.permissions
  FOR ALL USING (get_my_role() = 'superadmin');

DROP POLICY IF EXISTS "Authenticated users can view role permissions" ON public.role_permissions;
CREATE POLICY "Authenticated users can view role permissions" ON public.role_permissions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Superadmins can manage role permissions" ON public.role_permissions;
CREATE POLICY "Superadmins can manage role permissions" ON public.role_permissions
  FOR ALL USING (get_my_role() = 'superadmin');
