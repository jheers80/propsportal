import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from './useUser';

export function usePermissions() {
  const { profile } = useUser();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role) {
      const fetchPermissions = async () => {
        setLoading(true);
        let roleId = profile.role;
        // If role is a string, map to ID (superadmin = 6)
        if (typeof roleId === 'string') {
          if (roleId.toLowerCase() === 'superadmin') {
            roleId = '6';
          } else {
            // Optionally, fetch role ID from user_roles table if needed
            // For now, fallback to '0' (no permissions)
            roleId = '0';
          }
        }
        const { data, error } = await supabase
          .from('role_permissions')
          .select('permissions:permission_id ( name )')
          .eq('role', roleId);

        if (error) {
          console.error('Error fetching permissions:', error);
          setPermissions([]);
        } else {
          console.log('Fetched permissions data:', data);
          // Supabase returns [{ permissions: { name: 'users.view' } }, ...]
          let names: string[] = [];
          if (Array.isArray(data)) {
            names = data
              .map((p: any) => {
                if (p.permissions && typeof p.permissions.name === 'string') {
                  return p.permissions.name;
                }
                return null;
              })
              .filter((name: string | null) => !!name) as string[];
          }
          console.log('Parsed permission names:', names);
          setPermissions(names);
        }
        setLoading(false);
      };

      fetchPermissions();
    } else if (profile) {
      // a profile exists but has no role
      setPermissions([]);
      setLoading(false);
    }
  }, [profile]);

  return { permissions, loading };
}
