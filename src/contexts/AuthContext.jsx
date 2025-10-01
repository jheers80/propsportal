'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, getSessionToken } from '@/lib/supabaseClient';
import { apiGet, apiDelete } from '@/lib/apiPost';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId) => {
      try {
        try {
          const data = /** @type {{ profile?: any }} */ (await apiGet('/api/auth/profile'));
          return data.profile;
        } catch (e) {
          console.error('Error fetching profile:', e);
          return null;
        }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  const signOut = async () => {
      try {
        await apiDelete('/api/auth/session');
        // Also sign out from Supabase client
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
      } catch (error) {
        console.error('Error signing out:', error);
      }
  };

  useEffect(() => {
    let mounted = true;

    const getInitialSession = async () => {
      try {
        try {
          const token = await getSessionToken();
          if (!token) return;
          // we can still get the user via supabase client
          const { data: { user } } = await supabase.auth.getUser();
          if (user && mounted) {
            setUser(user);
            const profileData = await fetchProfile(user.id);
            if (mounted) setProfile(profileData);
          }
        } catch (e) {
          console.error('Error getting session:', e);
          return;
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state change:', event, session?.user?.id);

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    profile,
    loading,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { AuthContext };