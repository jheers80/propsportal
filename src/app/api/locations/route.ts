import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/createAdminSupabase';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createAdminSupabase();

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

    // Fetch all locations
    const { data: locations, error: locationsError } = await supabaseAdmin
      .from('locations')
      .select('*')
      .order('store_name');

    if (locationsError) {
      logger.error('Error fetching locations:', locationsError);
      return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
    }

    return NextResponse.json({ locations: locations || [] });
  } catch (error) {
    logger.error('Error in locations API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createAdminSupabase();

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

    // Check if current user has permission to create locations
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
    const { store_name, store_id, address, city, state, zip } = body;

    if (!store_name || !store_id) {
      return NextResponse.json({ error: 'Store name and store ID are required' }, { status: 400 });
    }

    // Create the location
    const { data: location, error: createError } = await supabaseAdmin
      .from('locations')
      .insert({
        store_name,
        store_id,
        address,
        city,
        state,
        zip
      })
      .select()
      .single();

    if (createError) {
      logger.error('Error creating location:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    // Log the location creation
    await supabaseAdmin
      .from('audit_trails')
      .insert({
        user_id: user.id,
        user_email: user.email,
        user_role: userRole?.name,
        action: 'location.create',
        resource_type: 'location',
        resource_id: location.id.toString(),
        details: {
          store_name,
          store_id
        }
      });

    return NextResponse.json({ location });
  } catch (error) {
    logger.error('Error in location creation API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
