-- Migration: add table to track exclusive checkouts of task lists
-- Created: 2025-10-03

-- Creates a lightweight table used by server-side endpoints to record which user
-- currently has a task_list checked out for editing.

CREATE TABLE IF NOT EXISTS public.task_list_checkouts (
  task_list_id UUID PRIMARY KEY REFERENCES public.task_lists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  checked_out_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_list_checkouts_user ON public.task_list_checkouts(user_id);

-- Enable RLS if you want client-side policies (service-role admin calls bypass RLS):
-- Uncomment and adapt policies below to match your auth/role model before enabling.

-- ALTER TABLE public.task_list_checkouts ENABLE ROW LEVEL SECURITY;
--
-- -- Example permissive policy (replace with strict rules in production):
-- CREATE POLICY "task_list_checkouts_select_any" ON public.task_list_checkouts
--   FOR SELECT USING (true);
-- CREATE POLICY "task_list_checkouts_insert_any" ON public.task_list_checkouts
--   FOR INSERT WITH CHECK (true);
-- CREATE POLICY "task_list_checkouts_delete_owner_only" ON public.task_list_checkouts
--   FOR DELETE USING (user_id = current_setting('app.current_user_id')::UUID OR current_setting('app.is_superadmin') = 'true');

-- You may want to store a more human-friendly value (like username) in the app layer
-- rather than in this table; the server endpoints return user_id and the client can
-- resolve the display name from your auth system/user profile endpoint.
