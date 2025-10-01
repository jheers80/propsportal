-- =====================================================
-- Task Management System Database Schema
-- =====================================================
-- Migration for task management tables and RLS policies
-- Created: September 29, 2025
-- =====================================================

-- =====================================================
-- 1. CREATE TABLES
-- =====================================================

-- Ensure required extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Task Lists Table
CREATE TABLE IF NOT EXISTS task_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role_id TEXT NOT NULL, -- Links to your existing permission system
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_list_id UUID REFERENCES task_lists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,

  -- Recurrence settings
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_type TEXT CHECK (recurrence_type IN ('once', 'daily', 'weekly', 'monthly', 'interval')),
  recurrence_interval INTEGER, -- For interval type (e.g., every 3 days)
  recurrence_unit TEXT CHECK (recurrence_unit IN ('days', 'weeks', 'months')),
  specific_days_of_week INTEGER[], -- Array: [0=Sun, 1=Mon, ..., 6=Sat]
  specific_days_of_month INTEGER[], -- Array: [1-31]
  repeat_from_completion BOOLEAN DEFAULT FALSE, -- true = from completion, false = from schedule

  -- Scheduling
  due_date TIMESTAMPTZ,
  due_time TIME, -- Separate time for easier querying

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Task Instances (Active/Current)
CREATE TABLE IF NOT EXISTS task_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  due_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'replaced')),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Completion History
CREATE TABLE IF NOT EXISTS task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  task_instance_id UUID REFERENCES task_instances(id),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  completed_by UUID REFERENCES auth.users(id),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. CREATE INDEXES
-- =====================================================

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_lists_role ON task_lists(role_id);
CREATE INDEX IF NOT EXISTS idx_tasks_list ON tasks(task_list_id);
CREATE INDEX IF NOT EXISTS idx_task_instances_task ON task_instances(task_id);
CREATE INDEX IF NOT EXISTS idx_task_instances_due ON task_instances(due_date);
CREATE INDEX IF NOT EXISTS idx_task_instances_status ON task_instances(status);
CREATE INDEX IF NOT EXISTS idx_completions_task ON task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_completions_date ON task_completions(completed_at);

-- =====================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE task_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. CREATE RLS POLICIES
-- =====================================================

-- Task Lists Policies
CREATE POLICY "task_lists_select_policy" ON task_lists
  FOR SELECT USING (role_id = current_setting('app.current_role')::TEXT);

CREATE POLICY "task_lists_insert_policy" ON task_lists
  FOR INSERT WITH CHECK (role_id = current_setting('app.current_role')::TEXT);

CREATE POLICY "task_lists_update_policy" ON task_lists
  FOR UPDATE USING (role_id = current_setting('app.current_role')::TEXT);

CREATE POLICY "task_lists_delete_policy" ON task_lists
  FOR DELETE USING (role_id = current_setting('app.current_role')::TEXT);

-- Tasks Policies
CREATE POLICY "tasks_select_policy" ON tasks
  FOR SELECT USING (
    task_list_id IN (
      SELECT id FROM task_lists
      WHERE role_id = current_setting('app.current_role')::TEXT
    )
  );

CREATE POLICY "tasks_insert_policy" ON tasks
  FOR INSERT WITH CHECK (
    task_list_id IN (
      SELECT id FROM task_lists
      WHERE role_id = current_setting('app.current_role')::TEXT
    )
  );

CREATE POLICY "tasks_update_policy" ON tasks
  FOR UPDATE USING (
    task_list_id IN (
      SELECT id FROM task_lists
      WHERE role_id = current_setting('app.current_role')::TEXT
    )
  );

CREATE POLICY "tasks_delete_policy" ON tasks
  FOR DELETE USING (
    task_list_id IN (
      SELECT id FROM task_lists
      WHERE role_id = current_setting('app.current_role')::TEXT
    )
  );

-- Task Instances Policies
CREATE POLICY "task_instances_select_policy" ON task_instances
  FOR SELECT USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN task_lists tl ON t.task_list_id = tl.id
      WHERE tl.role_id = current_setting('app.current_role')::TEXT
    )
  );

CREATE POLICY "task_instances_insert_policy" ON task_instances
  FOR INSERT WITH CHECK (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN task_lists tl ON t.task_list_id = tl.id
      WHERE tl.role_id = current_setting('app.current_role')::TEXT
    )
  );

CREATE POLICY "task_instances_update_policy" ON task_instances
  FOR UPDATE USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN task_lists tl ON t.task_list_id = tl.id
      WHERE tl.role_id = current_setting('app.current_role')::TEXT
    )
  );

CREATE POLICY "task_instances_delete_policy" ON task_instances
  FOR DELETE USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN task_lists tl ON t.task_list_id = tl.id
      WHERE tl.role_id = current_setting('app.current_role')::TEXT
    )
  );

-- Task Completions Policies
CREATE POLICY "task_completions_select_policy" ON task_completions
  FOR SELECT USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN task_lists tl ON t.task_list_id = tl.id
      WHERE tl.role_id = current_setting('app.current_role')::TEXT
    )
  );

CREATE POLICY "task_completions_insert_policy" ON task_completions
  FOR INSERT WITH CHECK (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN task_lists tl ON t.task_list_id = tl.id
      WHERE tl.role_id = current_setting('app.current_role')::TEXT
    )
  );

-- =====================================================
-- 5. CREATE UTILITY FUNCTIONS
-- =====================================================

-- Function to clean up old completion records (older than 6 months)
CREATE OR REPLACE FUNCTION cleanup_old_completions()
RETURNS void AS $$
BEGIN
  DELETE FROM task_completions
  WHERE completed_at < NOW() - INTERVAL '6 months';
END;
$$ LANGUAGE plpgsql;

-- Function to set user role in session context
CREATE OR REPLACE FUNCTION set_user_role(role_id TEXT)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_role', role_id, false);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. CREATE TRIGGERS
-- =====================================================

-- Updated at trigger for task_lists
CREATE OR REPLACE FUNCTION update_task_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_lists_updated_at_trigger
  BEFORE UPDATE ON task_lists
  FOR EACH ROW EXECUTE FUNCTION update_task_lists_updated_at();

-- Updated at trigger for tasks
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at_trigger
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_tasks_updated_at();</content>
<parameter name="filePath">d:\programming\pr-ops-portal\supabase\migrations\20250929_create_task_management_tables.sql