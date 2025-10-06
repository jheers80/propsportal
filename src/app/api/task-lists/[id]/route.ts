import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/createAdminSupabase';
import logger from '@/lib/logger';
import serverAuth from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const p = await context.params;
    const id = p?.id;
    if (!id) return NextResponse.json({ error: 'List id required' }, { status: 400 });

    const supabaseAdmin = createAdminSupabase();

    // require auth token and verify membership for this list
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from('task_lists')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      logger.error('Error fetching task list', error);
      return NextResponse.json({ error: (error as any).message || (error as any) }, { status: 500 });
    }

    // verify membership using serverAuth helper
    try {
      const { roleName } = await serverAuth.resolveRoleNameForUserId(user.id);
      if (roleName !== 'superadmin') {
        const locId = (data as any).location_id;
        const ok = await serverAuth.userHasLocationMembership(user.id, locId);
        if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch {
      logger.error('Error verifying membership for task list');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    // (error handled above) continue

    // attach checkout info if present
    try {
      const { data: chk, error: chkErr } = await supabaseAdmin
        .from('task_list_checkouts')
        .select('user_id')
        .eq('task_list_id', id)
        .limit(1)
        .single();
      if (!chkErr && chk && data) {
        (data as any).checked_out_by = chk.user_id;
      } else if (data) {
        (data as any).checked_out_by = null;
      }
    } catch {
      // ignore checkout attach errors
      if (data) (data as any).checked_out_by = null;
    }

    return NextResponse.json({ list: data });
  } catch (err) {
    logger.error('Error in GET /api/task-lists/[id]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
