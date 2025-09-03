import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Create Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET(request: NextRequest) {
  try {
    // Get all users from profiles table
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, created_at, full_name');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Get emails from auth.users for each profile
    const usersWithEmails = await Promise.all(
      (profiles || []).map(async (profile) => {
        try {
          const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(profile.id);

          return {
            id: profile.id,
            role: profile.role,
            created_at: profile.created_at,
            full_name: profile.full_name || 'N/A',
            email: authError ? 'N/A' : authUser.user?.email || 'N/A'
          };
        } catch (error) {
          console.error(`Error fetching auth user ${profile.id}:`, error);
          return {
            id: profile.id,
            role: profile.role,
            created_at: profile.created_at,
            full_name: profile.full_name || 'N/A',
            email: 'N/A'
          };
        }
      })
    );

    return NextResponse.json({ users: usersWithEmails });
  } catch (error) {
    console.error('Error in users API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
