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
        const { data, error } = await supabase
          .from('role_permissions')
          .select('permissions:permission_id ( name )')
          .eq('role', profile.role);

        if (error) {
          console.error('Error fetching permissions:', error);
          setPermissions([]);
        } else {
          setPermissions(data.map((p: any) => p.permissions.name));
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
