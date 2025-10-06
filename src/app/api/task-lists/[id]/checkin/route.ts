import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/createAdminSupabase';
import logger from '@/lib/logger';
import serverAuth from '@/lib/serverAuth';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const p = await context.params;
    const id = p?.id;
    if (!id) return NextResponse.json({ error: 'List id required' }, { status: 400 });

    const supabaseAdmin = createAdminSupabase();
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = authHeader.replace('Bearer ', '');
    const { user, error: userResolveErr } = await serverAuth.resolveUserFromToken(token);
    if (userResolveErr || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await request.json();
    const { user_id } = body || {};
    if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 });

    const { roleName } = await serverAuth.resolveRoleNameForUserId(user.id);
    if (String(user.id) !== String(user_id) && roleName !== 'superadmin') {
      return NextResponse.json({ error: 'Token user mismatch' }, { status: 403 });
    }

    // membership check for list's location
    try {
      const { data: listRec } = await supabaseAdmin.from('task_lists').select('location_id').eq('id', id).single();
      if (!listRec) return NextResponse.json({ error: 'List not found' }, { status: 404 });
      if (roleName !== 'superadmin') {
        const ok = await serverAuth.userHasLocationMembership(user.id, listRec.location_id);
        if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (e) {
      logger.error('Error verifying list membership for checkin', e);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    // Only allow the user who has it checked out (or superadmin) to check in
    const { data: current, error: curErr } = await supabaseAdmin
      .from('task_list_checkouts')
      .select('*')
      .eq('task_list_id', id)
      .limit(1)
      .single();

    if (curErr) {
      // nothing to do
    }

    if (!current) return NextResponse.json({ success: true });
    if (current.user_id !== user_id) return NextResponse.json({ error: 'Not owner of checkout' }, { status: 403 });

    const { error } = await supabaseAdmin
      .from('task_list_checkouts')
      .delete()
      .eq('task_list_id', id);

    if (error) {
      logger.error('Error checking in task list', error);
      return NextResponse.json({ error: error.message || error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('Error in POST /api/task-lists/[id]/checkin', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// no default export for route handlers — keep named exports only
