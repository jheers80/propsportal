-- Add location scoping to task_lists and policies for access
-- Created: 2025-09-29

-- 1) Column + Index (guard if task_lists exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'task_lists'
  ) THEN
    ALTER TABLE task_lists
      ADD COLUMN IF NOT EXISTS location_id BIGINT REFERENCES locations(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_task_lists_location ON task_lists(location_id);
  END IF;
END$$;

-- 2) Ensure RLS is enabled on task_lists (guard if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'task_lists'
  ) THEN
    ALTER TABLE task_lists ENABLE ROW LEVEL SECURITY;
  END IF;
END$$;

-- 3) Policy: allow users assigned to a location to read lists for that location
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'task_lists'
      AND policyname = 'task_lists_select_by_location'
  ) THEN
    CREATE POLICY "task_lists_select_by_location" ON task_lists
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM user_locations ul
          WHERE ul.user_id = auth.uid()
            AND ul.location_id = task_lists.location_id
        )
      );
  END IF;
END$$;

-- 4) Policy: allow superadmin to read all task lists (bypass)
-- This checks the user's role via profiles -> user_roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'task_lists'
      AND policyname = 'task_lists_select_superadmin'
  ) THEN
    CREATE POLICY "task_lists_select_superadmin" ON task_lists
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM profiles p
          JOIN user_roles ur ON p.role = ur.id
          WHERE p.id = auth.uid()
            AND ur.name = 'superadmin'
        )
      );
  END IF;
END$$;

-- NOTE:
-- - Existing role-based policies that reference current_setting('app.current_role') remain in place.
-- - These new SELECT policies complement them by allowing users assigned to a location (or superadmin)
--   to read task lists without requiring the app.current_role setting.
-- - Writes (INSERT/UPDATE/DELETE) remain governed by existing policies.
