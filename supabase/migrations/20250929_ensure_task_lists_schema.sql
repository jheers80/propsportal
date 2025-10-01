-- Migration: Ensure task_lists schema has required columns, indexes, RLS, and triggers
-- Created: 2025-09-29

-- Ensure uuid helper exists (gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Create base table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.task_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Add optional columns if missing
ALTER TABLE public.task_lists
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS location_id BIGINT REFERENCES public.locations(id) ON DELETE CASCADE;

-- 3) Indexes
CREATE INDEX IF NOT EXISTS idx_task_lists_role ON public.task_lists(role_id);
CREATE INDEX IF NOT EXISTS idx_task_lists_location ON public.task_lists(location_id);

-- 4) Enable Row Level Security
ALTER TABLE public.task_lists ENABLE ROW LEVEL SECURITY;

-- 5) updated_at trigger function (create or replace)
CREATE OR REPLACE FUNCTION public.update_task_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger only if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'task_lists_updated_at_trigger'
      AND tgrelid = 'public.task_lists'::regclass
  ) THEN
    CREATE TRIGGER task_lists_updated_at_trigger
      BEFORE UPDATE ON public.task_lists
      FOR EACH ROW EXECUTE FUNCTION public.update_task_lists_updated_at();
  END IF;
END$$;

-- 6) RLS policies (idempotent)
DO $$
BEGIN
  -- role-based policies (app.current_role path)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='task_lists' AND policyname='task_lists_select_policy'
  ) THEN
    CREATE POLICY "task_lists_select_policy" ON public.task_lists
      FOR SELECT USING (role_id = current_setting('app.current_role')::TEXT);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='task_lists' AND policyname='task_lists_insert_policy'
  ) THEN
    CREATE POLICY "task_lists_insert_policy" ON public.task_lists
      FOR INSERT WITH CHECK (role_id = current_setting('app.current_role')::TEXT);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='task_lists' AND policyname='task_lists_update_policy'
  ) THEN
    CREATE POLICY "task_lists_update_policy" ON public.task_lists
      FOR UPDATE USING (role_id = current_setting('app.current_role')::TEXT);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='task_lists' AND policyname='task_lists_delete_policy'
  ) THEN
    CREATE POLICY "task_lists_delete_policy" ON public.task_lists
      FOR DELETE USING (role_id = current_setting('app.current_role')::TEXT);
  END IF;
END$$;

-- 6b) location-based policies (users assigned to a location)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='task_lists' AND policyname='task_lists_select_by_location'
  ) THEN
    CREATE POLICY "task_lists_select_by_location" ON public.task_lists
      FOR SELECT
      USING (
        location_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.user_locations ul
          WHERE ul.user_id = auth.uid()
            AND ul.location_id = public.task_lists.location_id
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='task_lists' AND policyname='task_lists_insert_by_location'
  ) THEN
    CREATE POLICY "task_lists_insert_by_location" ON public.task_lists
      FOR INSERT WITH CHECK (
        (location_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.user_locations ul
          WHERE ul.user_id = auth.uid()
            AND ul.location_id = public.task_lists.location_id
        ))
        OR (role_id = current_setting('app.current_role')::TEXT)
      );
  END IF;
END$$;

-- 6c) superadmin policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='task_lists' AND policyname='task_lists_select_superadmin'
  ) THEN
    CREATE POLICY "task_lists_select_superadmin" ON public.task_lists
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          JOIN public.user_roles ur ON p.role = ur.id
          WHERE p.id = auth.uid()
            AND ur.name = 'superadmin'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='task_lists' AND policyname='task_lists_insert_superadmin'
  ) THEN
    CREATE POLICY "task_lists_insert_superadmin" ON public.task_lists
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          JOIN public.user_roles ur ON p.role = ur.id
          WHERE p.id = auth.uid()
            AND ur.name = 'superadmin'
        )
      );
  END IF;
END$$;

-- End migration
