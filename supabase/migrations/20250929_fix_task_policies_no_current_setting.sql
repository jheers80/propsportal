-- Replace policies that depend on current_setting('app.current_role') with
-- versions that read the user's role from profiles -> user_roles.
-- This avoids errors like: unrecognized configuration parameter "app.current_role" (42704)
-- Created: 2025-09-29

-- Helper expression to resolve the current user's role name
--   SELECT ur.name FROM profiles p JOIN user_roles ur ON p.role = ur.id WHERE p.id = auth.uid()

-- Ensure RLS enabled
ALTER TABLE task_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- 1) task_lists policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='task_lists' AND policyname='task_lists_select_policy'
  ) THEN
    DROP POLICY "task_lists_select_policy" ON task_lists;
  END IF;

  CREATE POLICY "task_lists_select_policy" ON task_lists
    FOR SELECT
    USING (
      role_id = (
        SELECT ur.name FROM profiles p
        JOIN user_roles ur ON p.role = ur.id
        WHERE p.id = auth.uid()
      )
    );

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='task_lists' AND policyname='task_lists_insert_policy'
  ) THEN
    DROP POLICY "task_lists_insert_policy" ON task_lists;
  END IF;

  CREATE POLICY "task_lists_insert_policy" ON task_lists
    FOR INSERT
    WITH CHECK (
      role_id = (
        SELECT ur.name FROM profiles p
        JOIN user_roles ur ON p.role = ur.id
        WHERE p.id = auth.uid()
      )
    );

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='task_lists' AND policyname='task_lists_update_policy'
  ) THEN
    DROP POLICY "task_lists_update_policy" ON task_lists;
  END IF;

  CREATE POLICY "task_lists_update_policy" ON task_lists
    FOR UPDATE
    USING (
      role_id = (
        SELECT ur.name FROM profiles p
        JOIN user_roles ur ON p.role = ur.id
        WHERE p.id = auth.uid()
      )
    );

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='task_lists' AND policyname='task_lists_delete_policy'
  ) THEN
    DROP POLICY "task_lists_delete_policy" ON task_lists;
  END IF;

  CREATE POLICY "task_lists_delete_policy" ON task_lists
    FOR DELETE
    USING (
      role_id = (
        SELECT ur.name FROM profiles p
        JOIN user_roles ur ON p.role = ur.id
        WHERE p.id = auth.uid()
      )
    );
END $$;

-- 2) tasks policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='tasks' AND policyname='tasks_select_policy'
  ) THEN
    DROP POLICY "tasks_select_policy" ON tasks;
  END IF;

  CREATE POLICY "tasks_select_policy" ON tasks
    FOR SELECT
    USING (
      task_list_id IN (
        SELECT id FROM task_lists
        WHERE role_id = (
          SELECT ur.name FROM profiles p
          JOIN user_roles ur ON p.role = ur.id
          WHERE p.id = auth.uid()
        )
      )
      OR EXISTS (
        SELECT 1 FROM profiles p
        JOIN user_roles ur ON p.role = ur.id
        WHERE p.id = auth.uid() AND ur.name = 'superadmin'
      )
    );

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='tasks' AND policyname='tasks_insert_policy'
  ) THEN
    DROP POLICY "tasks_insert_policy" ON tasks;
  END IF;

  CREATE POLICY "tasks_insert_policy" ON tasks
    FOR INSERT
    WITH CHECK (
      task_list_id IN (
        SELECT id FROM task_lists
        WHERE role_id = (
          SELECT ur.name FROM profiles p
          JOIN user_roles ur ON p.role = ur.id
          WHERE p.id = auth.uid()
        )
      )
      OR EXISTS (
        SELECT 1 FROM profiles p
        JOIN user_roles ur ON p.role = ur.id
        WHERE p.id = auth.uid() AND ur.name = 'superadmin'
      )
    );

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='tasks' AND policyname='tasks_update_policy'
  ) THEN
    DROP POLICY "tasks_update_policy" ON tasks;
  END IF;

  CREATE POLICY "tasks_update_policy" ON tasks
    FOR UPDATE
    USING (
      task_list_id IN (
        SELECT id FROM task_lists
        WHERE role_id = (
          SELECT ur.name FROM profiles p
          JOIN user_roles ur ON p.role = ur.id
          WHERE p.id = auth.uid()
        )
      )
      OR EXISTS (
        SELECT 1 FROM profiles p
        JOIN user_roles ur ON p.role = ur.id
        WHERE p.id = auth.uid() AND ur.name = 'superadmin'
      )
    );

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='tasks' AND policyname='tasks_delete_policy'
  ) THEN
    DROP POLICY "tasks_delete_policy" ON tasks;
  END IF;

  CREATE POLICY "tasks_delete_policy" ON tasks
    FOR DELETE
    USING (
      task_list_id IN (
        SELECT id FROM task_lists
        WHERE role_id = (
          SELECT ur.name FROM profiles p
          JOIN user_roles ur ON p.role = ur.id
          WHERE p.id = auth.uid()
        )
      )
      OR EXISTS (
        SELECT 1 FROM profiles p
        JOIN user_roles ur ON p.role = ur.id
        WHERE p.id = auth.uid() AND ur.name = 'superadmin'
      )
    );
END $$;

-- 3) task_instances policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='task_instances' AND policyname='task_instances_select_policy'
  ) THEN
    DROP POLICY "task_instances_select_policy" ON task_instances;
  END IF;

  CREATE POLICY "task_instances_select_policy" ON task_instances
    FOR SELECT
    USING (
      task_id IN (
        SELECT t.id FROM tasks t
        JOIN task_lists tl ON t.task_list_id = tl.id
        WHERE tl.role_id = (
          SELECT ur.name FROM profiles p
          JOIN user_roles ur ON p.role = ur.id
          WHERE p.id = auth.uid()
        )
      )
      OR EXISTS (
        SELECT 1 FROM profiles p
        JOIN user_roles ur ON p.role = ur.id
        WHERE p.id = auth.uid() AND ur.name = 'superadmin'
      )
    );

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='task_instances' AND policyname='task_instances_insert_policy'
  ) THEN
    DROP POLICY "task_instances_insert_policy" ON task_instances;
  END IF;

  CREATE POLICY "task_instances_insert_policy" ON task_instances
    FOR INSERT
    WITH CHECK (
      task_id IN (
        SELECT t.id FROM tasks t
        JOIN task_lists tl ON t.task_list_id = tl.id
        WHERE tl.role_id = (
          SELECT ur.name FROM profiles p
          JOIN user_roles ur ON p.role = ur.id
          WHERE p.id = auth.uid()
        )
      )
      OR EXISTS (
        SELECT 1 FROM profiles p
        JOIN user_roles ur ON p.role = ur.id
        WHERE p.id = auth.uid() AND ur.name = 'superadmin'
      )
    );

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='task_instances' AND policyname='task_instances_update_policy'
  ) THEN
    DROP POLICY "task_instances_update_policy" ON task_instances;
  END IF;

  CREATE POLICY "task_instances_update_policy" ON task_instances
    FOR UPDATE
    USING (
      task_id IN (
        SELECT t.id FROM tasks t
        JOIN task_lists tl ON t.task_list_id = tl.id
        WHERE tl.role_id = (
          SELECT ur.name FROM profiles p
          JOIN user_roles ur ON p.role = ur.id
          WHERE p.id = auth.uid()
        )
      )
      OR EXISTS (
        SELECT 1 FROM profiles p
        JOIN user_roles ur ON p.role = ur.id
        WHERE p.id = auth.uid() AND ur.name = 'superadmin'
      )
    );

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='task_instances' AND policyname='task_instances_delete_policy'
  ) THEN
    DROP POLICY "task_instances_delete_policy" ON task_instances;
  END IF;

  CREATE POLICY "task_instances_delete_policy" ON task_instances
    FOR DELETE
    USING (
      task_id IN (
        SELECT t.id FROM tasks t
        JOIN task_lists tl ON t.task_list_id = tl.id
        WHERE tl.role_id = (
          SELECT ur.name FROM profiles p
          JOIN user_roles ur ON p.role = ur.id
          WHERE p.id = auth.uid()
        )
      )
      OR EXISTS (
        SELECT 1 FROM profiles p
        JOIN user_roles ur ON p.role = ur.id
        WHERE p.id = auth.uid() AND ur.name = 'superadmin'
      )
    );
END $$;

-- 4) task_completions policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='task_completions' AND policyname='task_completions_select_policy'
  ) THEN
    DROP POLICY "task_completions_select_policy" ON task_completions;
  END IF;

  CREATE POLICY "task_completions_select_policy" ON task_completions
    FOR SELECT
    USING (
      task_id IN (
        SELECT t.id FROM tasks t
        JOIN task_lists tl ON t.task_list_id = tl.id
        WHERE tl.role_id = (
          SELECT ur.name FROM profiles p
          JOIN user_roles ur ON p.role = ur.id
          WHERE p.id = auth.uid()
        )
      )
      OR EXISTS (
        SELECT 1 FROM profiles p
        JOIN user_roles ur ON p.role = ur.id
        WHERE p.id = auth.uid() AND ur.name = 'superadmin'
      )
    );

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='task_completions' AND policyname='task_completions_insert_policy'
  ) THEN
    DROP POLICY "task_completions_insert_policy" ON task_completions;
  END IF;

  CREATE POLICY "task_completions_insert_policy" ON task_completions
    FOR INSERT
    WITH CHECK (
      task_id IN (
        SELECT t.id FROM tasks t
        JOIN task_lists tl ON t.task_list_id = tl.id
        WHERE tl.role_id = (
          SELECT ur.name FROM profiles p
          JOIN user_roles ur ON p.role = ur.id
          WHERE p.id = auth.uid()
        )
      )
      OR EXISTS (
        SELECT 1 FROM profiles p
        JOIN user_roles ur ON p.role = ur.id
        WHERE p.id = auth.uid() AND ur.name = 'superadmin'
      )
    );
END $$;
