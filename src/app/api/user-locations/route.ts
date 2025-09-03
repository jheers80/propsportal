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

    // Get user ID from query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check if current user has permission to view user locations
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 });
    }

    // Check if user has admin role
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('name')
      .eq('id', profile.role)
      .single();

    if (roleError || userRole?.name !== 'superadmin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Fetch user locations
    const { data: userLocations, error: userLocationsError } = await supabaseAdmin
      .from('user_locations')
      .select(`
        id,
        user_id,
        location_id,
        locations (
          id,
          store_name,
          store_id,
          address,
          city,
          state,
          zip
        )
      `)
      .eq('user_id', userId);

    if (userLocationsError) {
      console.error('Error fetching user locations:', userLocationsError);
      return NextResponse.json({ error: 'Failed to fetch user locations' }, { status: 500 });
    }

    return NextResponse.json({ userLocations: userLocations || [] });
  } catch (error) {
    console.error('Error in user locations API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the current user from the session to check permissions
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if current user has permission to manage user locations
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 });
    }

    // Check if user has admin role
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('name')
      .eq('id', profile.role)
      .single();

    if (roleError || userRole?.name !== 'superadmin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, locationIds } = body;

    if (!userId || !Array.isArray(locationIds)) {
      return NextResponse.json({ error: 'User ID and location IDs are required' }, { status: 400 });
    }

    // Remove existing user locations
    const { error: deleteError } = await supabaseAdmin
      .from('user_locations')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error removing existing user locations:', deleteError);
      return NextResponse.json({ error: 'Failed to update user locations' }, { status: 500 });
    }

    // Add new user locations
    if (locationIds.length > 0) {
      const userLocationInserts = locationIds.map(locationId => ({
        user_id: userId,
        location_id: locationId
      }));

      const { error: insertError } = await supabaseAdmin
        .from('user_locations')
        .insert(userLocationInserts);

      if (insertError) {
        console.error('Error adding user locations:', insertError);
        return NextResponse.json({ error: 'Failed to update user locations' }, { status: 500 });
      }
    }

    // Log the user locations update
    await supabaseAdmin
      .from('audit_trails')
      .insert({
        user_id: user.id,
        user_email: user.email,
        user_role: userRole?.name,
        action: 'user_locations.update',
        resource_type: 'user',
        resource_id: userId,
        details: {
          location_ids: locationIds
        }
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in user locations update API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
