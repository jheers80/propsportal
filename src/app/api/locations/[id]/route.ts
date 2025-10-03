import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/createAdminSupabase';
import logger from '@/lib/logger';
import serverAuth from '@/lib/serverAuth';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context?.params;
    const id = params?.id;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = authHeader.replace('Bearer ', '');

    const supabaseAdmin = createAdminSupabase();
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    // fetch the location record
    const { data, error } = await supabaseAdmin.from('locations').select('*').eq('id', id).single();
    if (error) {
      logger.error('Error fetching location', error);
      return NextResponse.json({ error: 'Failed to fetch location' }, { status: 500 });
    }

    // verify membership using serverAuth
    try {
      const { roleName } = await serverAuth.resolveRoleNameForUserId(user.id);
      if (roleName !== 'superadmin') {
        const ok = await serverAuth.userHasLocationMembership(user.id, id);
        if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (e) {
      logger.error('Error verifying membership for location', e);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ location: data });
  } catch (err) {
    logger.error('Error in GET /api/locations/[id]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
