import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/createAdminSupabase';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminSupabase();

    // Only allow superadmins to call this endpoint
  const token = request.headers.get('authorization')?.replace('Bearer ', '') || undefined;
  const { data: authUserRes } = await supabaseAdmin.auth.getUser(token);
    const authUser = (authUserRes as any)?.user;
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // find user's role
    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', authUser.id).single();
    const roleId = (profile as any)?.role || null;
    if (!roleId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: roleRow } = await supabaseAdmin.from('user_roles').select('*').eq('id', roleId).limit(1).single();
    const roleName = (roleRow as any)?.name;
    if (roleName !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // pagination
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const per_page = Math.max(1, parseInt(url.searchParams.get('per_page') || '10'));
    const start = (page - 1) * per_page;
    const end = start + per_page - 1;

    // Fetch active checkouts joined with task list name and user profile in one query
    // Using PostgREST foreign-table select syntax to include related rows and return exact count
    const { data, error, count } = await supabaseAdmin
      .from('task_list_checkouts')
      .select('task_list_id, user_id, checked_out_at, task_list:task_lists(name), user:profiles(id, full_name, email)', { count: 'exact' })
      .range(start, end);

    if (error) {
      logger.error('Error fetching checkouts', error);
      return NextResponse.json({ error: error.message || error }, { status: 500 });
    }

    // Normalize shape: flatten nested task_list and user
    const enriched = (data || []).map((r: any) => ({
      task_list_id: r.task_list_id,
      task_list_name: r.task_list?.name || null,
      user_id: r.user_id,
      checked_out_at: r.checked_out_at,
      user: r.user || null,
    }));

    const total = typeof count === 'number' ? count : (enriched.length || 0);
    const total_pages = Math.max(1, Math.ceil(total / per_page));

    return NextResponse.json({ checkouts: enriched, meta: { total, page, per_page, total_pages } });
  } catch (err) {
    logger.error('Error in GET /api/admin/checkouts', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminSupabase();

  const token = request.headers.get('authorization')?.replace('Bearer ', '') || undefined;
  const { data: authUserRes } = await supabaseAdmin.auth.getUser(token);
    const authUser = (authUserRes as any)?.user;
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', authUser.id).single();
    const roleId = (profile as any)?.role || null;
    const { data: roleRow } = await supabaseAdmin.from('user_roles').select('*').eq('id', roleId).limit(1).single();
    const roleName = (roleRow as any)?.name;
    if (roleName !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { task_list_id } = body || {};
    if (!task_list_id) return NextResponse.json({ error: 'task_list_id required' }, { status: 400 });

    // delete the checkout (force release)
    const { error } = await supabaseAdmin.from('task_list_checkouts').delete().eq('task_list_id', task_list_id);
    if (error) {
      logger.error('Error releasing checkout', error);
      return NextResponse.json({ error: error.message || error }, { status: 500 });
    }

    // write audit row
    try {
      await supabaseAdmin.from('task_list_checkout_audit').insert({
        task_list_id,
        action: 'force-release',
        actor_id: authUser.id,
        details: null
      });
    } catch (e) {
      logger.warn('Failed to write force-release audit', e);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('Error in POST /api/admin/checkouts', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export default GET;
