-- Migration: expiry helper for task_list_checkouts
-- Created: 2025-10-03

-- This migration creates a function to expire stale checkouts and an optional job entry
-- You can call the function manually or schedule it with Supabase cron (pg_cron) / cloud scheduler.

CREATE OR REPLACE FUNCTION public.expire_stale_task_list_checkouts(p_hours INTEGER DEFAULT 8)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  DELETE FROM public.task_list_checkouts
  WHERE checked_out_at < NOW() - (p_hours || ' hours')::interval
  RETURNING 1 INTO deleted_count;

  -- Return number of rows deleted. Note: RETURNING INTO only gets the first row; use GET DIAGNOSTICS for count
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Example usage (run manually):
-- SELECT public.expire_stale_task_list_checkouts(8);

-- If you have pg_cron installed, you can add a scheduled job like:
-- SELECT cron.schedule('expire_checkouts_every_hour', '0 * * * *', $$SELECT public.expire_stale_task_list_checkouts(8);$$);

-- End of migration
