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

    // verify membership
    try {
      const { data: listRec, error: listErr } = await supabaseAdmin.from('task_lists').select('location_id').eq('id', id).single();
      if (listErr || !listRec) return NextResponse.json({ error: 'List not found' }, { status: 404 });
      if (roleName !== 'superadmin') {
        const ok = await serverAuth.userHasLocationMembership(user.id, listRec.location_id);
        if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (e) {
      logger.error('Error verifying list membership for checkout', e);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    // Check current checkout
    const { data: current, error: curErr } = await supabaseAdmin
      .from('task_list_checkouts')
      .select('*')
      .eq('task_list_id', id)
      .limit(1)
      .single();

    if (curErr && curErr.code !== 'PGRST116') {
      // ignore not found vs other errors - PGRST116 is sometimes returned when no rows
    }

    if (current && current.user_id && current.user_id !== user_id) {
      return NextResponse.json({ success: false, locked_by: current.user_id }, { status: 409 });
    }

    // Upsert checkout record
    const { data, error } = await supabaseAdmin
      .from('task_list_checkouts')
      .upsert({ task_list_id: id, user_id }, { onConflict: 'task_list_id' })
      .select()
      .single();

    if (error) {
      logger.error('Error checking out task list', error);
      return NextResponse.json({ error: error.message || error }, { status: 500 });
    }

    return NextResponse.json({ success: true, checked_out_by: data.user_id });
  } catch (err) {
    logger.error('Error in POST /api/task-lists/[id]/checkout', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// no default export for route handlers — keep named exports only
