-- Migration: create RPC to complete a task and optionally insert next instance atomically
-- Creates function complete_task_and_insert_next(completion jsonb, next_instance jsonb)

BEGIN;

CREATE OR REPLACE FUNCTION public.complete_task_and_insert_next(completion jsonb, next_instance jsonb)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  comp_task_id uuid;
  comp_instance_id uuid;
  comp_completed_by uuid;
  current_task_id uuid;
  current_status text;
  next_task_id uuid;
  next_due timestamptz;
  next_status text;
BEGIN
  IF completion IS NULL THEN
    RAISE EXCEPTION 'completion parameter is required';
  END IF;

  comp_task_id := (completion->>'task_id')::uuid;
  comp_instance_id := (completion->>'task_instance_id')::uuid;
  comp_completed_by := (completion->>'completed_by')::uuid;

  -- Validate instance exists and is pending, and belongs to the provided task
  SELECT task_id, status INTO current_task_id, current_status FROM public.task_instances WHERE id = comp_instance_id;
  IF current_task_id IS NULL THEN
    RAISE EXCEPTION 'task_instance % not found', comp_instance_id;
  END IF;
  IF current_task_id <> comp_task_id THEN
    RAISE EXCEPTION 'task_instance % does not belong to task %', comp_instance_id, comp_task_id;
  END IF;
  IF current_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'task_instance % is not pending (status=%)', comp_instance_id, current_status;
  END IF;

  -- Optionally validate completed_by exists in profiles
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = comp_completed_by) THEN
    RAISE EXCEPTION 'profile % not found', comp_completed_by;
  END IF;

  -- Insert completion record (timestamped)
  INSERT INTO public.task_completions(task_id, task_instance_id, completed_by, completed_at)
  VALUES (comp_task_id, comp_instance_id, comp_completed_by, now());

  -- Mark instance completed; ensure we only update the pending row
  UPDATE public.task_instances SET status = 'completed' WHERE id = comp_instance_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'failed to mark task_instance % as completed', comp_instance_id;
  END IF;

  -- Optionally insert next instance
  IF next_instance IS NOT NULL THEN
    next_task_id := (next_instance->>'task_id')::uuid;
    next_due := (next_instance->>'due_date')::timestamptz;
    next_status := COALESCE(next_instance->>'status', 'pending');

    -- Ensure next instance references the same task
    IF next_task_id IS NULL OR next_task_id <> comp_task_id THEN
      RAISE EXCEPTION 'next_instance.task_id must match completion.task_id';
    END IF;

    INSERT INTO public.task_instances(task_id, due_date, status)
    VALUES (next_task_id, next_due, next_status);
  END IF;
END;
$$;

COMMIT;