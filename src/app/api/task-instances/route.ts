import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/createAdminSupabase';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminSupabase();
    const body = await request.json();
    const { task_id, due_date, status } = body || {};
    if (!task_id) return NextResponse.json({ error: 'task_id required' }, { status: 400 });

    const payload: any = { task_id };
    // Some schemas require due_date to be non-null; if missing, default to now
    payload.due_date = typeof due_date !== 'undefined' && due_date !== null ? due_date : new Date().toISOString();
    if (typeof status !== 'undefined') payload.status = status;

    const { data, error } = await supabaseAdmin
      .from('task_instances')
      .insert(payload)
      .select()
      .single();

    if (error) {
      logger.error('Error inserting task_instance', error);
      return NextResponse.json({ error: error.message || error }, { status: 500 });
    }

    return NextResponse.json({ instance: data });
  } catch (err) {
    logger.error('Error in POST /api/task-instances', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

}
