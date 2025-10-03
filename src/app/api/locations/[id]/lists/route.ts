import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/createAdminSupabase';
import logger from '@/lib/logger';
import serverAuth from '@/lib/serverAuth';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context?.params;
    const id = params?.id;
    if (!id) return NextResponse.json({ error: 'Missing location id' }, { status: 400 });

    // require auth token and verify membership via serverAuth helper
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = authHeader.replace('Bearer ', '');

  const { user, error: userResolveErr } = await serverAuth.resolveUserFromToken(token);
    if (userResolveErr || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    // coerce id
    const parsedId = typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : id;

    const { roleName } = await serverAuth.resolveRoleNameForUserId(user.id);
    if (roleName !== 'superadmin') {
      const ok = await serverAuth.userHasLocationMembership(user.id, parsedId);
      if (!ok) return NextResponse.json({ error: 'Forbidden: user not assigned to that location' }, { status: 403 });
    }

    // Fetch task_lists scoped to the location (some schemas may not have location_id column)
    // Coerce numeric location ids to numbers to avoid type-mismatch queries
    try {
      const supabaseAdmin = createAdminSupabase();

      const { data, error } = await supabaseAdmin
        .from('task_lists')
        .select('*')
        .eq('location_id', parsedId)
        .order('name', { ascending: true });

      if (error) {
        // If column doesn't exist, fallback to returning all task lists (server-side).
        // Be robust to error.code as string or numeric and also check message text.
        const code = (error as any)?.code || String((error as any)?.status || '');
        const msg = String((error as any)?.message || (error as any)?.msg || '');
        if (String(code) === '42703' || /does not exist/i.test(msg) || /Could not find/i.test(msg)) {
          // The 'location_id' column is missing in this database schema. Returning an empty
          // list is safer than returning all lists (which would expose lists across locations).
          logger.warn('task_lists table does not have location_id column; returning empty lists for safety.');
          return NextResponse.json({ lists: [] });
        }
        throw error;
      }

      return NextResponse.json({ lists: data || [] });
    } catch (err) {
      logger.error('Error fetching task lists for location:', err);
      return NextResponse.json({ error: 'Failed to fetch lists' }, { status: 500 });
    }
  } catch (error) {
    logger.error('Error in GET /api/locations/[id]/lists', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
