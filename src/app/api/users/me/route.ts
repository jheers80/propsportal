import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
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

    // Get the current user from the session
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Fetch the user's profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Fetch user's locations
    const { data: locations, error: locationsError } = await supabaseAdmin
      .from('user_locations')
      .select(`
        locations!inner (
          id,
          store_name,
          store_id,
          city,
          state,
          zip
        )
      `)
      .eq('user_id', user.id);

    if (locationsError) {
      console.error('Error fetching locations:', locationsError);
      // Don't fail the request if locations can't be fetched
    }

    // Fetch user's permissions
    let permissionNames: string[] = [];
    if (profile.role) {
      const { data: permissions, error: permissionsError } = await supabaseAdmin
        .from('role_permissions')
        .select(`
          permissions!inner (
            name
          )
        `)
        .eq('role', profile.role);

      if (permissionsError) {
        console.error('Error fetching permissions:', permissionsError);
        // Don't fail the request if permissions can't be fetched
      } else {
        // Extract permission names
        permissionNames = (permissions as unknown as Array<{ permissions: { name: string } }>)?.map((p) => p.permissions.name).filter(Boolean) || [];
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        aud: user.aud,
        role: user.role
      },
      profile,
      locations: locations || [],
      permissions: permissionNames
    });
  } catch (error) {
    console.error('Error in users/me API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
