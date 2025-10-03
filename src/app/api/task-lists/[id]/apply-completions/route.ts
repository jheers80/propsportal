import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/createAdminSupabase';
import logger from '@/lib/logger';
import serverAuth from '@/lib/serverAuth';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const p = await context.params;
    const listId = p?.id;
    if (!listId) return NextResponse.json({ error: 'List id required' }, { status: 400 });

  const supabaseAdmin = createAdminSupabase();

  // Require auth token and resolve the user
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.replace('Bearer ', '');
  const { user, error: userResolveErr } = await serverAuth.resolveUserFromToken(token);
  if (userResolveErr || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const body = await request.json();
  const { changes, user_id, checkin } = body || {};
    if (!Array.isArray(changes)) return NextResponse.json({ error: 'changes array required' }, { status: 400 });
    if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 });

    // Ensure token user matches acting user unless superadmin, and confirm membership
    const { roleName } = await serverAuth.resolveRoleNameForUserId(user.id);
    if (String(user.id) !== String(user_id) && roleName !== 'superadmin') {
      return NextResponse.json({ error: 'Token user mismatch' }, { status: 403 });
    }

    // verify list exists and membership
    try {
      const { data: listRec, error: listErr } = await supabaseAdmin.from('task_lists').select('location_id').eq('id', listId).single();
      if (listErr || !listRec) return NextResponse.json({ error: 'List not found' }, { status: 404 });
      if (roleName !== 'superadmin') {
        const ok = await serverAuth.userHasLocationMembership(user.id, listRec.location_id);
        if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (e) {
      logger.error('Error verifying list membership for apply-completions', e);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    // Security: ensure the list is either checked out by this user or not checked out
    try {
      const { data: currentChk, error: chkErr } = await supabaseAdmin
        .from('task_list_checkouts')
        .select('user_id')
        .eq('task_list_id', listId)
        .limit(1)
        .single();
      if (!chkErr && currentChk && currentChk.user_id && String(currentChk.user_id) !== String(user_id)) {
        return NextResponse.json({ error: 'List is checked out by another user', locked_by: currentChk.user_id }, { status: 403 });
      }
    } catch (e) {
      // If checkout check fails, be conservative and block the operation
      logger.warn('Failed to verify checkout ownership', e);
      return NextResponse.json({ error: 'Unable to verify checkout ownership' }, { status: 500 });
    }

    const errors: any[] = [];

    for (const ch of changes) {
      try {
        const taskId = ch.task_id || ch.taskId;
        const wantCompleted = !!ch.completed;
        if (!taskId) continue;

        // find an existing instance for the task (prefer pending, else latest)
        const { data: insts } = await supabaseAdmin
          .from('task_instances')
          .select('*')
          .eq('task_id', taskId)
          .order('due_date', { ascending: true });

        const instances = Array.isArray(insts) ? insts : [];
        let targetInst = instances.find((i: any) => (i.status || '').toLowerCase() !== 'completed') || instances[0];

        if (wantCompleted) {
          // ensure an instance exists
          if (!targetInst) {
            const { data: newInst, error: newErr } = await supabaseAdmin
              .from('task_instances')
              .insert({ task_id: taskId, due_date: new Date().toISOString(), status: 'pending' })
              .select()
              .single();
            if (newErr) {
              errors.push({ taskId, error: newErr });
              continue;
            }
            targetInst = newInst as any;
          }

          // insert completion
          const { error: compErr } = await supabaseAdmin
            .from('task_completions')
            .insert({ task_id: taskId, task_instance_id: targetInst.id, completed_by: user_id || null });

          if (compErr) {
            errors.push({ taskId, error: compErr });
            continue;
          }

          // update instance status
          await supabaseAdmin.from('task_instances').update({ status: 'completed' }).eq('id', targetInst.id);
        } else {
          // uncomplete: find latest completion for this task
          const { data: comps } = await supabaseAdmin
            .from('task_completions')
            .select('*')
            .eq('task_id', taskId)
            .order('completed_at', { ascending: false })
            .limit(1);
          const latest = Array.isArray(comps) && comps.length > 0 ? comps[0] : null;
          if (latest) {
            // delete completion
            await supabaseAdmin.from('task_completions').delete().eq('id', latest.id);
            // mark instance pending
            if (latest.task_instance_id) {
              await supabaseAdmin.from('task_instances').update({ status: 'pending' }).eq('id', latest.task_instance_id);
            }
          }
        }
      } catch (e) {
        errors.push({ change: ch, error: e });
      }
    }

    // Optional checkin: remove checkout record
    if (checkin) {
      try {
        await supabaseAdmin.from('task_list_checkouts').delete().eq('task_list_id', listId);
      } catch (e) {
        logger.warn('Failed to check in after apply-completions', e);
      }
    }

    // Audit the apply-completions action
    try {
      await supabaseAdmin.from('task_list_checkout_audit').insert({
        task_list_id: listId,
        action: 'apply-completions',
        actor_id: user_id || null,
        details: { changes }
      });
    } catch (e) {
      logger.warn('Failed to write apply-completions audit', e);
    }

    return NextResponse.json({ success: errors.length === 0, errors });
  } catch (err) {
    logger.error('Error in POST /api/task-lists/[id]/apply-completions', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export default POST;
