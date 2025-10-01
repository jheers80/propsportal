import { createAdminSupabase } from '@/lib/createAdminSupabase';
import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { generateNextInstance } from '@/services/recurrenceEngine';

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminSupabase();

    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await request.json();
    const { instance_id } = body || {};
    if (!instance_id) return NextResponse.json({ error: 'instance_id required' }, { status: 400 });

    // Fetch instance + task
    const { data: instance, error: instErr } = await supabaseAdmin
      .from('task_instances')
      .select('*, tasks(*)')
      .eq('id', instance_id)
      .single();

    if (instErr || !instance) return NextResponse.json({ error: 'Instance not found' }, { status: 404 });

    const task = instance.tasks;

    // Permission: check if user can complete this instance (similar logic to tasks API)
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

    let allowed = false;
    if (roleName === 'superadmin') allowed = true;
    if (!allowed && task && task.task_list_id) {
      const { data: tl, error: tlErr } = await supabaseAdmin
        .from('task_lists')
        .select('*')
        .eq('id', task.task_list_id)
        .single();
      if (!tl || tlErr) return NextResponse.json({ error: 'Task list not found' }, { status: 404 });
      if (tl.role_id && tl.role_id === roleName) allowed = true;
      if (!allowed && tl.location_id) {
        const { data: userLocs } = await supabaseAdmin
          .from('user_locations')
          .select('location_id')
          .eq('user_id', user.id)
          .eq('location_id', tl.location_id)
          .limit(1);
        if (userLocs && userLocs.length > 0) allowed = true;
      }
    }

    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Prefer to perform completion + next-instance insertion atomically via a DB function
    // Compute next instance in application code (so recurrence logic stays in JS)
    let nextInstanceData: any = null;
    if (task.is_recurring && task.repeat_from_completion) {
      try {
        nextInstanceData = generateNextInstance(task, new Date());
        // normalize to plain object if Date present
        if (nextInstanceData && nextInstanceData.due_date instanceof Date) {
          nextInstanceData = { ...nextInstanceData, due_date: nextInstanceData.due_date.toISOString() };
        }
      } catch (e) {
        logger.error('Recurrence engine failed to generate next instance:', e);
        nextInstanceData = null;
      }
    }

    // Try RPC that performs completion + optional next instance insertion in one transaction.
    try {
      if (typeof (supabaseAdmin as any).rpc === 'function') {
        const rpcPayload = {
          completion: { task_id: task.id, task_instance_id: instance_id, completed_by: user.id },
          next_instance: nextInstanceData
        };

        // supabase.rpc(functionName, params)
        const { error: rpcErr } = await (supabaseAdmin as any).rpc('complete_task_and_insert_next', rpcPayload);
        if (!rpcErr) {
          return NextResponse.json({ success: true });
        }
        // If RPC exists but returned an error, log and fall back
        logger.error('RPC complete_task_and_insert_next failed, falling back:', rpcErr);
      }
    } catch (rpcEx) {
      // If RPC call throws, fall back to non-atomic flow
      logger.error('RPC call failed or not available, falling back to non-atomic completion:', rpcEx);
    }

    // Fallback: non-atomic path (best-effort)
    // Insert completion
    const { error: compErr } = await supabaseAdmin
      .from('task_completions')
      .insert({ task_id: task.id, task_instance_id: instance_id, completed_by: user.id });

    if (compErr) {
      logger.error('Error inserting completion (fallback):', compErr);
      return NextResponse.json({ error: compErr.message || compErr }, { status: 500 });
    }

    // Update instance status
    await supabaseAdmin
      .from('task_instances')
      .update({ status: 'completed' })
      .eq('id', instance_id);

    // Fallback: insert next instance if computed
    if (nextInstanceData && nextInstanceData.due_date) {
      try {
        const insertPayload = {
          task_id: nextInstanceData.task_id,
          due_date: nextInstanceData.due_date,
          status: nextInstanceData.status || 'pending'
        };
        const { error: nextErr } = await supabaseAdmin
          .from('task_instances')
          .insert(insertPayload);
        if (nextErr) logger.error('Error creating next task instance after completion (fallback):', nextErr);
      } catch (e) {
        logger.error('Error inserting next instance in fallback path:', e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('Error in POST /api/task-instances/complete', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
