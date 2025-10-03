-- Migration: RLS policies and audit table for task_list_checkouts
-- Created: 2025-10-03

-- 1) Enable RLS on task_list_checkouts and add policies
--    Policies assume your application sets the following session settings for each request:
--      - app.current_role (text) => role id used in task_lists.role_id
--      - app.current_user_id (uuid) => currently acting user id
--      - app.is_superadmin (text) => 'true' if the session is superadmin
--    Note: server-side service-role calls bypass RLS; these policies are for non-admin clients.

ALTER TABLE IF EXISTS public.task_list_checkouts ENABLE ROW LEVEL SECURITY;

-- Allow users who are in the same role (via the task_list) to SELECT checkout state
CREATE POLICY IF NOT EXISTS task_list_checkouts_select_by_role ON public.task_list_checkouts
  FOR SELECT USING (
    task_list_id IN (
      SELECT id FROM public.task_lists WHERE role_id = current_setting('app.current_role')::TEXT
    )
  );

-- Allow a user to INSERT a checkout for a task_list in their role, and only for themselves (or superadmin)
CREATE POLICY IF NOT EXISTS task_list_checkouts_insert_by_user ON public.task_list_checkouts
  FOR INSERT WITH CHECK (
    task_list_id IN (
      SELECT id FROM public.task_lists WHERE role_id = current_setting('app.current_role')::TEXT
    )
    AND (user_id = current_setting('app.current_user_id')::UUID OR current_setting('app.is_superadmin') = 'true')
  );

-- Allow DELETE (checkin) only by the owner or superadmin
CREATE POLICY IF NOT EXISTS task_list_checkouts_delete_owner ON public.task_list_checkouts
  FOR DELETE USING (
    user_id = current_setting('app.current_user_id')::UUID OR current_setting('app.is_superadmin') = 'true'
  );

-- 2) Audit table for checkouts/checkins and optional apply-completions actions
CREATE TABLE IF NOT EXISTS public.task_list_checkout_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_list_id UUID REFERENCES public.task_lists(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- e.g. 'checkout', 'checkin', 'apply-completions'
  actor_id UUID, -- user who performed the action
  details JSONB, -- row details or extra payload
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_list_checkout_audit_tasklist ON public.task_list_checkout_audit(task_list_id);
CREATE INDEX IF NOT EXISTS idx_task_list_checkout_audit_actor ON public.task_list_checkout_audit(actor_id);

-- 3) Trigger function to insert audit rows when checkouts are created/deleted
CREATE OR REPLACE FUNCTION public.log_task_list_checkout_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.task_list_checkout_audit (task_list_id, action, actor_id, details)
      VALUES (NEW.task_list_id, 'checkout', NEW.user_id, row_to_json(NEW)::jsonb);
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.task_list_checkout_audit (task_list_id, action, actor_id, details)
      VALUES (OLD.task_list_id, 'checkin', OLD.user_id, row_to_json(OLD)::jsonb);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_log_task_list_checkout_change ON public.task_list_checkouts;
CREATE TRIGGER trg_log_task_list_checkout_change
  AFTER INSERT OR DELETE ON public.task_list_checkouts
  FOR EACH ROW EXECUTE FUNCTION public.log_task_list_checkout_change();

-- 4) RLS for audit table: enable RLS and restrict SELECT to superadmins only
ALTER TABLE IF EXISTS public.task_list_checkout_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS task_list_checkout_audit_select_admin ON public.task_list_checkout_audit
  FOR SELECT USING (current_setting('app.is_superadmin') = 'true');

-- Allow INSERTs into audit table (service-role writes bypass RLS; if clients will write, adapt as needed)
CREATE POLICY IF NOT EXISTS task_list_checkout_audit_insert ON public.task_list_checkout_audit
  FOR INSERT WITH CHECK (true);

-- 5) Convenience: if you want to manually expire stale checkouts, you can run a query like:
-- DELETE FROM public.task_list_checkouts WHERE checked_out_at < NOW() - INTERVAL '8 hours';

-- End of migration
