/* Integration test for complete_task_and_insert_next RPC

Requires real Supabase credentials set in environment:
- NEXT_PUBLIC_SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

This test will create/destroy test rows in the connected database. It will be skipped when env isn't present.
*/

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // Skip integration when credentials are not provided
  test.skip('integration test skipped (SUPABASE env vars not set)', () => {});
} else {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  describe('complete_task_and_insert_next RPC integration', () => {
    let taskId = null;
    let instanceId = null;
    let profileId = null;

    beforeAll(async () => {
      // Create a test profile (or reuse if exists)
      const profileRes = await supabase.from('profiles').insert({ email: 'itest@example.com', full_name: 'Integration Test' }).select().single();
      if (profileRes.error) throw profileRes.error;
      profileId = profileRes.data.id;

      // Create a test task
      const taskRes = await supabase.from('tasks').insert({ title: 'itest-task', task_list_id: null, is_recurring: true, repeat_from_completion: true }).select().single();
      if (taskRes.error) throw taskRes.error;
      taskId = taskRes.data.id;

      // Create initial instance
      const instRes = await supabase.from('task_instances').insert({ task_id: taskId, due_date: new Date().toISOString(), status: 'pending' }).select().single();
      if (instRes.error) throw instRes.error;
      instanceId = instRes.data.id;
    });

    afterAll(async () => {
      // Cleanup created rows
      await supabase.from('task_instances').delete().eq('task_id', taskId);
      await supabase.from('task_completions').delete().eq('task_id', taskId);
      await supabase.from('tasks').delete().eq('id', taskId);
      await supabase.from('profiles').delete().eq('id', profileId);
    });

    test('RPC completes instance and inserts next one atomically', async () => {
      const nextDue = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const payload = {
        completion: { task_id: taskId, task_instance_id: instanceId, completed_by: profileId },
        next_instance: { task_id: taskId, due_date: nextDue, status: 'pending' }
      };

      const { error: rpcErr } = await supabase.rpc('complete_task_and_insert_next', payload);
      expect(rpcErr).toBeNull();

      // Verify completion inserted
      const { data: comps, error: compErr } = await supabase.from('task_completions').select('*').eq('task_instance_id', instanceId);
      expect(compErr).toBeNull();
      expect(comps.length).toBeGreaterThanOrEqual(1);

      // Verify old instance marked completed
      const { data: oldInst } = await supabase.from('task_instances').select('*').eq('id', instanceId).single();
      expect(oldInst.status).toBe('completed');

      // Verify new instance exists
      const { data: newInsts, error: newErr } = await supabase.from('task_instances').select('*').eq('task_id', taskId).neq('id', instanceId);
      expect(newErr).toBeNull();
      expect(newInsts.length).toBeGreaterThanOrEqual(1);
    }, 20000);
  });
}
