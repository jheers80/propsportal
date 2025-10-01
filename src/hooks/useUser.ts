'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import apiPost, { apiGet } from '@/lib/apiPost';
import type { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  role: number | string;
  created_at: string;
  full_name: string;
}

interface Location {
  id: number;
  store_name: string;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const fetchUser = async () => {
      setLoading(true);
      setError(null);
      try {
        // Check for quick-access-session cookie
        let quickSession = null;
        if (typeof document !== 'undefined') {
          const match = document.cookie.match(/quick-access-session=([^;]+)/);
          if (match) {
            try {
              quickSession = JSON.parse(decodeURIComponent(match[1]));
            } catch (e) {
              quickSession = null;
            }
          }
        }

        if (quickSession && quickSession.valid && quickSession.expires > Date.now()) {
          // Treat as authenticated user with limited profile
          setUser({ id: 'quick-access', email: 'quick@access', aud: '', role: 'quickaccess' } as User);
          setProfile({ id: 'quick-access', role: 'quickaccess', created_at: '', full_name: 'Quick Access User' });
          setLocations([]);
          setLoading(false);
          return;
        }

        // Fallback to normal Supabase auth
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        setUser(user);

        if (user) {
          // Fetch user data from API
      const data = await apiGet<{ profile: Profile; locations?: Location[] }>('/api/users/me');

          setProfile(data.profile);
          setLocations(data.locations || []);
          // Expose profile to window for UI components that need role info for client-side operations
          try {
            if (typeof window !== 'undefined') {
              // attach to window with a typed property
              (window as unknown as { __USER_PROFILE__?: Profile }).__USER_PROFILE__ = data.profile;
            }
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    };

  const refreshLocations = async () => {
    if (!user) return;
    
    try {
  const data = await apiGet<{ profile: Profile; locations?: Location[] }>('/api/users/me');
      setLocations(data.locations || []);
    } catch (e) {
      console.error('Error refreshing locations:', e);
    }
  };

  useEffect(() => {
    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (event === 'SIGNED_IN' && session?.user) {
          fetchUser();
        }
        if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { user, profile, locations, loading, error, setUser, setProfile, refreshLocations };
}
