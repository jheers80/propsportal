import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await request.json();
    const { name, description, location_id } = body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!location_id) {
      return NextResponse.json({ error: 'location_id is required' }, { status: 400 });
    }

    // Resolve user's role name from profiles/user_roles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 });
    }

    let roleName: string | null = null;
    try {
      const { data: roleRec, error: roleErr } = await supabaseAdmin
        .from('user_roles')
        .select('name')
        .eq('id', profile.role)
        .single();
      if (!roleErr && roleRec) roleName = roleRec.name;
    } catch (e) {
      // ignore
    }

    if (!roleName) {
      if (profile.role === 'superadmin' || profile.role === 1 || profile.role === '1') roleName = 'superadmin';
      else if (typeof profile.role === 'string') roleName = profile.role;
    }

    if (!roleName) return NextResponse.json({ error: 'Unable to resolve user role' }, { status: 400 });

    // If not superadmin, ensure the user is assigned to the requested location
    if (roleName !== 'superadmin') {
      const { data: userLocs, error: ulErr } = await supabaseAdmin
        .from('user_locations')
        .select('location_id')
        .eq('user_id', user.id)
        .eq('location_id', location_id)
        .limit(1);

      if (ulErr) {
        console.error('Error checking user_locations:', ulErr);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }

      if (!userLocs || userLocs.length === 0) {
        return NextResponse.json({ error: 'Forbidden: user not assigned to that location' }, { status: 403 });
      }
    }

    // Insert using admin client (service role key)
    const insertPayload: any = {
      name: name.trim(),
      role_id: roleName,
      location_id: location_id
    };
    if (description && typeof description === 'string' && description.trim()) insertPayload.description = description.trim();

    const { data, error } = await supabaseAdmin
      .from('task_lists')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('Error inserting task_list via API:', error);
      return NextResponse.json({ error: error.message || error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Error in POST /api/task-lists', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
