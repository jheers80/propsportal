import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

export function usePermissions() {
  const { profile } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile && typeof profile === 'object' && 'permissions' in profile) {
      // If permissions are already included in the profile from the API
      const profilePermissions = (profile as { permissions?: string[] }).permissions;
      if (Array.isArray(profilePermissions)) {
        setPermissions(profilePermissions);
        setLoading(false);
        return;
      }
    }

    if (profile && typeof profile === 'object' && 'role' in profile && (profile as { role?: string | number }).role) {
      const fetchPermissions = async () => {
        setLoading(true);

        // Get the access token for API calls
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setPermissions([]);
          setLoading(false);
          return;
        }

        // Try to get permissions from the users/me API if not already in profile
        try {
          const response = await fetch('/api/users/me', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.permissions && Array.isArray(data.permissions)) {
              setPermissions(data.permissions);
              setLoading(false);
              return;
            }
          }
        } catch (error) {
          console.error('Error fetching permissions from API:', error);
        }

        // Fallback to direct database query if API fails
        const { data, error } = await supabase
          .from('role_permissions')
          .select(`
            permission_id,
            permissions (
              name
            )
          `)
          .eq('role', (profile as { role?: string | number }).role);

        if (error) {
          console.error('Error fetching permissions:', error);
          setPermissions([]);
        } else {
          let names: string[] = [];
          if (Array.isArray(data)) {
            names = data
              .map((p: { permissions: { name: string }[] }) => {
                if (p.permissions && p.permissions.length > 0 && typeof p.permissions[0].name === 'string') {
                  return p.permissions[0].name;
                }
                return null;
              })
              .filter((name: string | null) => !!name) as string[];
          }
          setPermissions(names);
        }
        setLoading(false);
      };

      fetchPermissions();
    } else if (profile) {
      // a profile exists but has no role
      setPermissions([]);
      setLoading(false);
    } else {
      // no profile
      setPermissions([]);
      setLoading(false);
    }
  }, [profile]);

  return { permissions, loading };
}
