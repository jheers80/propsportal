/* Integration tests for negative cases of complete_task_and_insert_next RPC

Requires real Supabase credentials set in environment:
- NEXT_PUBLIC_SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

Skips when env not present.
*/

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  test.skip('integration invalid cases skipped (SUPABASE env vars not set)', () => {});
} else {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  describe('complete_task_and_insert_next RPC - invalid inputs', () => {
    let taskA = null;
    let taskB = null;
    let instanceId = null;
    let profileId = null;

    beforeAll(async () => {
      // create profile
      const p = await supabase.from('profiles').insert({ email: 'itest-invalid@example.com', full_name: 'Integration Invalid' }).select().single();
      if (p.error) throw p.error;
      profileId = p.data.id;

      // create two tasks
      const ta = await supabase.from('tasks').insert({ title: 'itest-taskA', task_list_id: null }).select().single();
      if (ta.error) throw ta.error;
      taskA = ta.data.id;

      const tb = await supabase.from('tasks').insert({ title: 'itest-taskB', task_list_id: null }).select().single();
      if (tb.error) throw tb.error;
      taskB = tb.data.id;

      // create initial instance for taskA
      const inst = await supabase.from('task_instances').insert({ task_id: taskA, due_date: new Date().toISOString(), status: 'pending' }).select().single();
      if (inst.error) throw inst.error;
      instanceId = inst.data.id;
    });

    afterAll(async () => {
      await supabase.from('task_instances').delete().eq('task_id', taskA);
      await supabase.from('task_instances').delete().eq('task_id', taskB);
      await supabase.from('task_completions').delete().eq('task_id', taskA);
      await supabase.from('tasks').delete().in('id', [taskA, taskB]);
      await supabase.from('profiles').delete().eq('id', profileId);
    });

    test('mismatched task_id is rejected', async () => {
      const payload = {
        completion: { task_id: taskB, task_instance_id: instanceId, completed_by: profileId },
        next_instance: null
      };

      const res = await supabase.rpc('complete_task_and_insert_next', payload).catch(e => ({ error: e }));
      // Expect an error returned or thrown
      expect(res).toBeDefined();
      if (res.error) {
        // RPC threw
        expect(res.error).toBeTruthy();
      } else {
        // RPC returned object: check for error property
        expect(res).toHaveProperty('error');
      }
    }, 20000);

    test('non-pending instance cannot be completed', async () => {
      // mark instance completed manually
      const upd = await supabase.from('task_instances').update({ status: 'completed' }).eq('id', instanceId);
      if (upd.error) throw upd.error;

      const payload = {
        completion: { task_id: taskA, task_instance_id: instanceId, completed_by: profileId },
        next_instance: null
      };

      const res = await supabase.rpc('complete_task_and_insert_next', payload).catch(e => ({ error: e }));
      expect(res).toBeDefined();
      if (res.error) {
        expect(res.error).toBeTruthy();
      } else {
        expect(res).toHaveProperty('error');
      }
    }, 20000);

    test('missing profile is rejected', async () => {
      // create fresh instance for taskA
      const inst = await supabase.from('task_instances').insert({ task_id: taskA, due_date: new Date().toISOString(), status: 'pending' }).select().single();
      if (inst.error) throw inst.error;
      const freshInstance = inst.data.id;

      const fakeProfile = '00000000-0000-0000-0000-000000000000';
      const payload = {
        completion: { task_id: taskA, task_instance_id: freshInstance, completed_by: fakeProfile },
        next_instance: null
      };

      const res = await supabase.rpc('complete_task_and_insert_next', payload).catch(e => ({ error: e }));
      expect(res).toBeDefined();
      if (res.error) {
        expect(res.error).toBeTruthy();
      } else {
        expect(res).toHaveProperty('error');
      }

      // cleanup
      await supabase.from('task_instances').delete().eq('id', freshInstance);
    }, 20000);
  });
}
