import { createAdminSupabase } from '@/lib/createAdminSupabase';
import logger from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';

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

    // Fetch the user's profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      logger.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Determine if the user is a superadmin and resolve a canonical role name.
    // profile.role can be either an id referencing user_roles or a string like 'superadmin'.
    let isSuperAdmin = false;
    let resolvedRoleName: string | null = null;
    try {
      // If profile.role looks like an id, try to resolve the user_roles.name
      const { data: userRole, error: roleError } = await supabaseAdmin
        .from('user_roles')
        .select('name')
        .eq('id', profile.role)
        .single();

      if (!roleError && userRole) {
        resolvedRoleName = userRole.name;
        isSuperAdmin = userRole.name === 'superadmin';
      }
    } catch {
      // ignore and fall back to string checks below
    }

    // Also allow profile.role to be the literal string or numeric id for
    // superadmin (some seed data uses 'superadmin' directly or id 1).
    if (!resolvedRoleName) {
      if (profile.role === 'superadmin' || profile.role === 1 || profile.role === '1') {
        resolvedRoleName = 'superadmin';
        isSuperAdmin = true;
      } else if (typeof profile.role === 'string') {
        // Use the string as a fallback role name
        resolvedRoleName = profile.role;
      }
    }

    let transformedLocations: any[] = [];

    if (isSuperAdmin) {
      // Superadmin should see all locations (setup locations). Return all
      // records from the locations table.
      const { data: allLocations, error: allLocationsError } = await supabaseAdmin
        .from('locations')
        .select('id, store_name, store_id, city, state, zip');

    if (allLocationsError) {
  logger.error('Error fetching all locations for superadmin:', allLocationsError);
    }

      transformedLocations = (allLocations || []).map((loc: any) => ({
        id: loc.id,
        store_name: loc.store_name,
        store_id: loc.store_id,
        city: loc.city,
        state: loc.state,
        zip: loc.zip
      }));
    } else {
      // Fetch user's locations (normal path)
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
  logger.error('Error fetching locations for user:', user.id, locationsError);
        // Don't fail the request if locations can't be fetched
      }

      transformedLocations = locations?.map((item: any) => ({
        id: item.locations.id,
        store_name: item.locations.store_name,
        store_id: item.locations.store_id,
        city: item.locations.city,
        state: item.locations.state,
        zip: item.locations.zip
      })) || [];
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
  logger.error('Error fetching permissions:', permissionsError);
        // Don't fail the request if permissions can't be fetched
      } else {
        // Extract permission names
        permissionNames = (permissions as unknown as Array<{ permissions: { name: string } }>)?.map((p) => p.permissions.name).filter(Boolean) || [];
      }
    }

    // Attach resolvedRoleName for client convenience (role_name)
    const safeProfile = { ...profile, role_name: resolvedRoleName };

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        aud: user.aud,
        role: user.role
      },
      profile: safeProfile,
      locations: transformedLocations,
      permissions: permissionNames
    });
  } catch (error) {
    logger.error('Error in users/me API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Add a POST handler that logs caller details and returns 405 so we can
// detect unintended POSTs to this GET-only endpoint during development.
export async function POST(request: NextRequest) {
  try {
    const ua = request.headers.get('user-agent') ?? 'unknown';
    const referer = request.headers.get('referer') ?? request.headers.get('referrer') ?? 'none';
    const origin = request.headers.get('origin') ?? 'none';
    const contentLength = request.headers.get('content-length') ?? 'unknown';
    // concise logging to detect unexpected non-GET calls without dumping full headers/body
    logger.warn('[users/me] unexpected non-GET request', {
      method: 'POST',
      url: request.url,
      ua,
      referer,
      origin,
      contentLength,
    });

    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    logger.error('Error in users/me POST logger:', error);
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }
}
