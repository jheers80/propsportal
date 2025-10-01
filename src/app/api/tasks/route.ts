import { createAdminSupabase } from '@/lib/createAdminSupabase';
import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminSupabase();

    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await request.json();
    const { title, description, due_date, task_list_id, is_recurring, recurrence_type, recurrence_interval, recurrence_unit, specific_days_of_week, specific_days_of_month, repeat_from_completion } = body || {};

    if (!task_list_id) return NextResponse.json({ error: 'task_list_id is required' }, { status: 400 });
    if (!title || typeof title !== 'string' || !title.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 });

    // Fetch task_list to validate permissions
    const { data: tl, error: tlErr } = await supabaseAdmin
      .from('task_lists')
      .select('*')
      .eq('id', task_list_id)
      .single();

    if (tlErr || !tl) return NextResponse.json({ error: 'Task list not found' }, { status: 404 });

    // Resolve profile and role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) return NextResponse.json({ error: 'Profile not found' }, { status: 400 });

    let roleName: string | null = null;
    try {
      const { data: roleRec, error: roleErr } = await supabaseAdmin
        .from('user_roles')
        .select('name')
        .eq('id', profile.role)
        .single();
      if (!roleErr && roleRec) roleName = roleRec.name;
    } catch {
      // ignore
    }
    if (!roleName) {
      if (profile.role === 'superadmin' || profile.role === 1 || profile.role === '1') roleName = 'superadmin';
      else if (typeof profile.role === 'string') roleName = profile.role;
    }

    // Permission: ensure user can create tasks for this task_list
    // Allow if: superadmin OR profile.role matches task_list.role_id OR user assigned to task_list.location_id
    let allowed = false;
    if (roleName === 'superadmin') allowed = true;
    if (!allowed && tl.role_id && roleName && tl.role_id === roleName) allowed = true;
    if (!allowed && tl.location_id) {
      const resp = await supabaseAdmin
        .from('user_locations')
        .select('location_id')
        .eq('user_id', user.id)
        .eq('location_id', tl.location_id)
        .limit(1);
          if (resp.error) {
            logger.error('Error checking user_locations:', resp.error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
          }
      if (resp.data && resp.data.length > 0) allowed = true;
    }

    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Build task payload
    const taskPayload: any = {
      title: title.trim(),
      task_list_id,
      description: description && description.trim() ? description.trim() : null,
      is_recurring: !!is_recurring,
      recurrence_type: recurrence_type || null,
      recurrence_interval: recurrence_interval || null,
      recurrence_unit: recurrence_unit || null,
      specific_days_of_week: specific_days_of_week || null,
      specific_days_of_month: specific_days_of_month || null,
      repeat_from_completion: !!repeat_from_completion,
      due_date: due_date || null,
      created_by: user.id
    };

      const { data: created, error: createErr } = await supabaseAdmin
      .from('tasks')
      .insert(taskPayload)
      .select()
      .single();

      if (createErr) {
        logger.error('Error creating task via API:', createErr);
        return NextResponse.json({ error: createErr.message || createErr }, { status: 500 });
      }

    // If due_date present, create initial instance
    if (created && created.due_date) {
      const { error: instErr } = await supabaseAdmin
        .from('task_instances')
        .insert({ task_id: created.id, due_date: created.due_date, status: 'pending' });
  if (instErr) logger.error('Error creating initial instance:', instErr);
    }

    return NextResponse.json({ success: true, data: created });
  } catch (err) {
  logger.error('Error in POST /api/tasks', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
