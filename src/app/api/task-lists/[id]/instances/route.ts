import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/createAdminSupabase';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const p = await context.params;
    const id = p?.id;
    if (!id) return NextResponse.json({ error: 'List id required' }, { status: 400 });


    const supabaseAdmin = createAdminSupabase();

    // Require auth and ensure the caller may view this list
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    // Verify the list exists and get its location_id
    const { data: listRec, error: listErr } = await supabaseAdmin.from('task_lists').select('id, location_id, role_id').eq('id', id).single();
    if (listErr || !listRec) return NextResponse.json({ error: 'Task list not found' }, { status: 404 });

    // Resolve role and membership via helper to reduce duplication
    const serverAuth = (await import('@/lib/serverAuth')).default;
    const { roleName } = await serverAuth.resolveRoleNameForUserId(user.id);
    if (roleName !== 'superadmin') {
      const ok = await serverAuth.userHasLocationMembership(user.id, listRec.location_id);
      if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch tasks for the list
    const { data: tasks, error: tasksErr } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('task_list_id', id)
      .order('id', { ascending: true });

    if (tasksErr) {
      logger.error('Error fetching tasks for list', tasksErr);
      return NextResponse.json({ error: tasksErr.message || tasksErr }, { status: 500 });
    }

    const taskArray = Array.isArray(tasks) ? tasks as any[] : [];

    // Fetch related task_instances in a separate query and attach them to their tasks.
    // Doing this avoids relying on PostgREST relationship expansion which can be affected by
    // RLS or naming differences in the schema.
    let instances: any[] = [];
    try {
      const taskIds = taskArray.map((t) => t.id).filter(Boolean);
      if (taskIds.length > 0) {
        const { data: instData, error: instErr } = await supabaseAdmin
          .from('task_instances')
          // include related completions so client can uncomplete
          .select('*, task_completions(*)')
          .in('task_id', taskIds)
          .order('due_date', { ascending: true });
        if (instErr) {
          logger.warn('Warning: could not fetch task_instances for tasks', instErr);
          instances = [];
        } else {
          instances = Array.isArray(instData) ? instData : [];
        }
      }
    } catch (e) {
      logger.warn('Error fetching task_instances', e);
      instances = [];
    }

    // Attach instances to their parent task as `instances` array
    const shaped = taskArray.map((t: any) => ({
      ...t,
      instances: instances.filter((ins: any) => String(ins.task_id) === String(t.id))
    }));

    return NextResponse.json({ tasks: shaped });
  } catch (err) {
    logger.error('Error in GET /api/task-lists/[id]/instances', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
